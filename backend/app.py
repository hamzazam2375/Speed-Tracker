from flask import Flask, request, jsonify
from flask_cors import CORS
import numpy as np
import cv2
from PIL import Image
from io import BytesIO
import base64
import time
from collections import deque

# create flask app
app = Flask(__name__)
CORS(app)  # allow requests from the mobile app

# ── global state for optical flow tracking ──
prev_gray = None           # previous grayscale + blurred frame
prev_points = None         # tracked feature points from previous frame
prev_time = None           # timestamp of previous frame

# ── config ──
MAX_SPEED = 120.0          # hard cap on speed (km/h) — reject anything above
SMOOTH_WINDOW = 8          # average over last N speed readings
SPEED_SCALE = 2.5          # scaling factor: pixel displacement → km/h
MIN_FEATURES = 10          # minimum tracked features needed (below = return 0)
SPIKE_THRESHOLD = 2.5      # reject readings > N times the current average
MIN_MOTION_PX = 1.5        # minimum median displacement in pixels to count as motion
BLUR_KERNEL = (15, 15)     # gaussian blur kernel — removes sensor noise
STATIONARY_COUNT_MAX = 3   # if stationary for N consecutive frames, force speed = 0

# ── smoothing buffer ──
speed_history = deque(maxlen=SMOOTH_WINDOW)

# ── stationary counter ──
stationary_count = 0

# ── Lucas-Kanade optical flow parameters ──
LK_PARAMS = dict(
    winSize=(21, 21),          # search window size
    maxLevel=3,                # pyramid levels (handles larger motions)
    criteria=(cv2.TERM_CRITERIA_EPS | cv2.TERM_CRITERIA_COUNT, 30, 0.01),
)

# ── feature detection parameters (Shi-Tomasi corners) ──
FEATURE_PARAMS = dict(
    maxCorners=150,            # max features to track
    qualityLevel=0.2,          # slightly lower threshold — find more corners
    minDistance=7,              # min distance between features
    blockSize=7,               # neighborhood size
)


def detect_features(gray):
    """Detect good features (corners) to track using Shi-Tomasi method."""
    points = cv2.goodFeaturesToTrack(gray, **FEATURE_PARAMS)
    return points


def preprocess(frame_bgr):
    """Convert to grayscale and apply Gaussian blur to reduce noise."""
    gray = cv2.cvtColor(frame_bgr, cv2.COLOR_BGR2GRAY)
    blurred = cv2.GaussianBlur(gray, BLUR_KERNEL, 0)
    return blurred


def smooth_speed(raw_speed):
    """
    Add raw speed to history and return smoothed average.
    Rejects sudden spikes that are N times larger than current average.
    """
    # spike rejection: if we have enough history, reject unrealistic jumps
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
    global prev_gray, prev_points, prev_time, stationary_count

    # ── preprocess: grayscale + gaussian blur ──
    gray = preprocess(current_frame)

    # ── first frame: detect features, store, return 0 ──
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
    next_points, status, error = cv2.calcOpticalFlowPyrLK(
        prev_gray, gray, prev_points, None, **LK_PARAMS
    )

    # flow calculation failed entirely
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

    # not enough features tracked — unreliable, return 0
    if tracked_count < MIN_FEATURES:
        prev_gray = gray
        prev_points = detect_features(gray)
        prev_time = time.time()
        stationary_count += 1
        print(f"[FLOW] Only {tracked_count} features tracked (need {MIN_FEATURES})")
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
        # motion too small — treat as stationary
        stationary_count += 1

        # if stationary for several frames, flush the speed buffer toward 0
        if stationary_count >= STATIONARY_COUNT_MAX:
            speed = smooth_speed(0.0)
            status_str = "stationary"
        else:
            speed = smooth_speed(0.0)
            status_str = "minimal_motion"

        prev_gray = gray
        prev_points = detect_features(gray)  # re-detect for next frame
        prev_time = current_time

        print(f"[FLOW] Median disp {median_displacement:.2f}px < threshold "
              f"{MIN_MOTION_PX}px | Stationary x{stationary_count}")
        return speed, status_str

    # ── real motion detected — reset stationary counter ──
    stationary_count = 0

    # ── convert pixel displacement to speed estimate ──
    raw_speed = (median_displacement / dt) * SPEED_SCALE

    # hard cap
    raw_speed = min(raw_speed, MAX_SPEED)

    # smooth
    speed = smooth_speed(raw_speed)

    # ── update state for next frame ──
    prev_gray = gray
    prev_points = good_new.reshape(-1, 1, 2)
    prev_time = current_time

    # re-detect features if count is getting low
    if len(prev_points) < MIN_FEATURES * 2:
        new_features = detect_features(gray)
        if new_features is not None:
            prev_points = new_features

    print(f"[FLOW] Tracked {tracked_count} pts | "
          f"Median disp: {median_displacement:.1f}px | "
          f"dt: {dt:.2f}s | Raw: {raw_speed:.1f} -> Smooth: {speed}")

    return speed, "tracking"


@app.route('/upload-frame', methods=['POST'])
def upload_frame():
    # get the json data from request
    data = request.get_json()

    # check if image was sent
    if not data or 'image' not in data:
        return jsonify({'error': 'no image in request'}), 400

    try:
        # decode base64 string to raw image bytes
        img_bytes = base64.b64decode(data['image'])

        # open image using PIL and convert to numpy array
        img = Image.open(BytesIO(img_bytes))
        frame = np.array(img)

        # PIL gives RGB, OpenCV expects BGR
        frame_bgr = cv2.cvtColor(frame, cv2.COLOR_RGB2BGR)

        # log the frame shape
        print(f"[FRAME] Got frame: {frame_bgr.shape}")

        # run optical flow speed estimation
        speed, status = estimate_speed(frame_bgr)

        print(f"[SPEED] {speed} km/h | Status: {status}")

        return jsonify({
            'speed': speed,
            'status': status,
            'unit': 'km/h'
        })

    except Exception as e:
        print(f"[ERROR] {e}")
        return jsonify({'error': str(e), 'speed': 0}), 500


@app.route('/reset', methods=['POST'])
def reset():
    """Reset tracking state — useful when restarting."""
    global prev_gray, prev_points, prev_time, stationary_count
    prev_gray = None
    prev_points = None
    prev_time = None
    stationary_count = 0
    speed_history.clear()
    print("[RESET] Tracking state reset")
    return jsonify({'status': 'reset'})


# run the server
if __name__ == '__main__':
    print('Server running on http://0.0.0.0:8000')
    app.run(host='0.0.0.0', port=8000, debug=True)
