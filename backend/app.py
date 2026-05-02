from flask import Flask, request, jsonify
from flask_cors import CORS
import numpy as np
import cv2
from PIL import Image
from io import BytesIO
import base64
import time
from collections import deque
import traceback

# create flask app
app = Flask(__name__)
CORS(app)  # allow requests from the mobile app

# ── safe default response ──
SAFE_RESPONSE = {'speed': 0, 'status': 'safe_default', 'unit': 'km/h'}

# ── global state for optical flow tracking ──
prev_gray = None           # previous grayscale + blurred frame
prev_points = None         # tracked feature points from previous frame
prev_time = None           # timestamp of previous frame
frame_number = 0           # total frames received (for warmup)

# ── config ──
MAX_SPEED = 80.0           # hard cap on speed (km/h)
SMOOTH_WINDOW = 10         # average over last N speed readings
SPEED_SCALE = 0.4          # scaling factor: pixel displacement -> km/h
MIN_FEATURES = 10          # minimum tracked features needed
SPIKE_THRESHOLD = 2.0      # reject readings > N times the current average
MIN_MOTION_PX = 4.0        # minimum median displacement to count as motion
BLUR_KERNEL = (21, 21)     # gaussian blur kernel
STATIONARY_COUNT_MAX = 2   # consecutive low-motion frames before forcing 0
DEAD_ZONE_KMH = 5.0        # speeds below this snap to 0
FRAME_WIDTH = 480          # downscale frames to this width
WARMUP_FRAMES = 3          # first N frames always return 0 (primes the buffer)

# ── smoothing buffer ──
speed_history = deque(maxlen=SMOOTH_WINDOW)

# ── stationary counter ──
stationary_count = 0

# ── Lucas-Kanade optical flow parameters ──
LK_PARAMS = dict(
    winSize=(21, 21),
    maxLevel=3,
    criteria=(cv2.TERM_CRITERIA_EPS | cv2.TERM_CRITERIA_COUNT, 30, 0.01),
)

# ── feature detection parameters (Shi-Tomasi corners) ──
FEATURE_PARAMS = dict(
    maxCorners=150,
    qualityLevel=0.2,
    minDistance=7,
    blockSize=7,
)


def detect_features(gray):
    """Detect good features (corners) to track using Shi-Tomasi method."""
    try:
        points = cv2.goodFeaturesToTrack(gray, **FEATURE_PARAMS)
        return points
    except Exception:
        return None


def preprocess(frame_bgr):
    """Downscale, convert to grayscale, and apply Gaussian blur."""
    try:
        h, w = frame_bgr.shape[:2]
        if w > FRAME_WIDTH:
            scale = FRAME_WIDTH / w
            frame_bgr = cv2.resize(frame_bgr, (FRAME_WIDTH, int(h * scale)),
                                   interpolation=cv2.INTER_AREA)
        gray = cv2.cvtColor(frame_bgr, cv2.COLOR_BGR2GRAY)
        blurred = cv2.GaussianBlur(gray, BLUR_KERNEL, 0)
        return blurred
    except Exception as e:
        print(f"[ERROR] Preprocess failed: {e}")
        return None


def smooth_speed(raw_speed):
    """
    Add raw speed to history and return smoothed average.
    Rejects sudden spikes.
    """
    # clamp negative values
    raw_speed = max(0.0, raw_speed)

    # spike rejection
    if len(speed_history) >= 3:
        current_avg = sum(speed_history) / len(speed_history)
        if current_avg > 0.5 and raw_speed > current_avg * SPIKE_THRESHOLD:
            print(f"[SPIKE] Rejected {raw_speed:.1f}, using avg {current_avg:.1f}")
            raw_speed = current_avg

    speed_history.append(raw_speed)

    # weighted average: recent values matter more
    weights = list(range(1, len(speed_history) + 1))
    weighted_sum = sum(s * w for s, w in zip(speed_history, weights))
    total_weight = sum(weights)
    return round(weighted_sum / total_weight, 1)


def estimate_speed(current_frame):
    """
    Use Lucas-Kanade Optical Flow to track feature points between frames.
    Returns (smoothed_speed, status_string).
    """
    global prev_gray, prev_points, prev_time, stationary_count, frame_number

    frame_number += 1

    # ── preprocess: downscale + grayscale + blur ──
    gray = preprocess(current_frame)
    if gray is None:
        return 0.0, "preprocess_failed"

    # ── warmup: first N frames always return 0 to prime the system ──
    if frame_number <= WARMUP_FRAMES:
        prev_gray = gray
        prev_points = detect_features(gray)
        prev_time = time.time()
        speed_history.append(0.0)  # fill buffer with zeros
        print(f"[WARMUP] Frame {frame_number}/{WARMUP_FRAMES}")
        return 0.0, "warming_up"

    # ── first real frame after warmup ──
    if prev_gray is None:
        prev_gray = gray
        prev_points = detect_features(gray)
        prev_time = time.time()
        if prev_points is None or len(prev_points) < MIN_FEATURES:
            return 0.0, "no_features"
        return 0.0, "initializing"

    # ── re-detect features if we lost too many ──
    if prev_points is None or len(prev_points) < MIN_FEATURES:
        prev_points = detect_features(prev_gray)
        if prev_points is None or len(prev_points) < MIN_FEATURES:
            prev_gray = gray
            prev_time = time.time()
            stationary_count += 1
            return smooth_speed(0.0), "no_object"

    # ── calculate optical flow (Lucas-Kanade) ──
    try:
        next_points, status, error = cv2.calcOpticalFlowPyrLK(
            prev_gray, gray, prev_points, None, **LK_PARAMS
        )
    except Exception as e:
        print(f"[ERROR] Optical flow failed: {e}")
        prev_gray = gray
        prev_points = detect_features(gray)
        prev_time = time.time()
        return smooth_speed(0.0), "flow_error"

    # flow calculation failed
    if next_points is None or status is None:
        prev_gray = gray
        prev_points = detect_features(gray)
        prev_time = time.time()
        stationary_count += 1
        return smooth_speed(0.0), "tracking_lost"

    # keep only successfully tracked points
    good_old = prev_points[status.flatten() == 1]
    good_new = next_points[status.flatten() == 1]
    tracked_count = len(good_new)

    # not enough features — unreliable
    if tracked_count < MIN_FEATURES:
        prev_gray = gray
        prev_points = detect_features(gray)
        prev_time = time.time()
        stationary_count += 1
        return smooth_speed(0.0), "no_object"

    # ── calculate displacement ──
    displacements = np.sqrt(np.sum((good_new - good_old) ** 2, axis=1))
    median_displacement = float(np.median(displacements))

    # ── time delta ──
    current_time = time.time()
    dt = current_time - prev_time
    dt = max(dt, 0.1)

    # ── minimum motion threshold — ignore noise / camera shake ──
    if median_displacement < MIN_MOTION_PX:
        stationary_count += 1

        if stationary_count >= STATIONARY_COUNT_MAX:
            speed = smooth_speed(0.0)
            status_str = "stationary"
        else:
            speed = smooth_speed(0.0)
            status_str = "minimal_motion"

        prev_gray = gray
        prev_points = detect_features(gray)
        prev_time = current_time
        return speed, status_str

    # ── real motion detected ──
    stationary_count = 0

    raw_speed = (median_displacement / dt) * SPEED_SCALE
    raw_speed = min(raw_speed, MAX_SPEED)

    speed = smooth_speed(raw_speed)

    # dead zone
    if speed < DEAD_ZONE_KMH:
        speed = 0.0

    # ── update state ──
    prev_gray = gray
    prev_points = good_new.reshape(-1, 1, 2)
    prev_time = current_time

    # re-detect features if running low
    if len(prev_points) < MIN_FEATURES * 2:
        new_features = detect_features(gray)
        if new_features is not None:
            prev_points = new_features

    print(f"[FLOW] {tracked_count} pts | "
          f"Disp: {median_displacement:.1f}px | "
          f"dt: {dt:.2f}s | Raw: {raw_speed:.1f} -> {speed}")

    return speed, "tracking"


# ── routes ──

@app.route('/upload-frame', methods=['POST'])
def upload_frame():
    """Process a camera frame and return estimated speed."""

    # ── validate request ──
    try:
        data = request.get_json(silent=True)
    except Exception:
        data = None

    if not data or not isinstance(data, dict):
        print("[WARN] Invalid or empty JSON body")
        return jsonify(SAFE_RESPONSE), 200   # 200 so frontend doesn't crash

    if 'image' not in data or not data['image']:
        print("[WARN] No image field in request")
        return jsonify(SAFE_RESPONSE), 200

    try:
        # ── decode base64 ──
        image_data = data['image']
        if not isinstance(image_data, str) or len(image_data) < 100:
            print("[WARN] Image data too short or wrong type")
            return jsonify(SAFE_RESPONSE), 200

        img_bytes = base64.b64decode(image_data)

        # ── open with PIL ──
        img = Image.open(BytesIO(img_bytes))

        # validate it's a real image
        img.verify()
        # re-open after verify (verify closes the image)
        img = Image.open(BytesIO(img_bytes))

        frame = np.array(img)

        # validate frame shape
        if frame.ndim < 2 or frame.shape[0] < 10 or frame.shape[1] < 10:
            print(f"[WARN] Invalid frame shape: {frame.shape}")
            return jsonify(SAFE_RESPONSE), 200

        # PIL gives RGB, OpenCV expects BGR
        if frame.ndim == 3 and frame.shape[2] >= 3:
            frame_bgr = cv2.cvtColor(frame, cv2.COLOR_RGB2BGR)
        elif frame.ndim == 2:
            # already grayscale — convert to BGR for consistency
            frame_bgr = cv2.cvtColor(frame, cv2.COLOR_GRAY2BGR)
        else:
            print(f"[WARN] Unexpected frame format: {frame.shape}")
            return jsonify(SAFE_RESPONSE), 200

        # ── run speed estimation ──
        speed, status = estimate_speed(frame_bgr)

        # final safety clamp
        speed = max(0.0, min(float(speed), MAX_SPEED))

        print(f"[SPEED] {speed} km/h | {status}")

        return jsonify({
            'speed': speed,
            'status': status,
            'unit': 'km/h'
        })

    except (base64.binascii.Error, ValueError) as e:
        print(f"[WARN] Bad base64 data: {e}")
        return jsonify(SAFE_RESPONSE), 200

    except Exception as e:
        print(f"[ERROR] {e}")
        traceback.print_exc()
        # always return safe default — never crash the frontend
        return jsonify(SAFE_RESPONSE), 200


@app.route('/reset', methods=['POST'])
def reset():
    """Reset tracking state — useful when restarting."""
    global prev_gray, prev_points, prev_time, stationary_count, frame_number
    prev_gray = None
    prev_points = None
    prev_time = None
    stationary_count = 0
    frame_number = 0
    speed_history.clear()
    print("[RESET] Tracking state reset")
    return jsonify({'status': 'reset'})


@app.route('/health', methods=['GET'])
def health():
    """Health check endpoint."""
    return jsonify({'status': 'ok', 'frames_processed': frame_number})


# run the server
if __name__ == '__main__':
    print('Server running on http://0.0.0.0:8000')
    app.run(host='0.0.0.0', port=8000, debug=True)
