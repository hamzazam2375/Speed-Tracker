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

app = Flask(__name__)
CORS(app)

SAFE_RESPONSE = {'speed': 0, 'status': 'safe_default', 'unit': 'km/h'}

prev_gray = None
prev_points = None
prev_time = None
frame_number = 0
stationary_count = 0

MAX_SPEED = 80.0
SMOOTH_WINDOW = 10
SPEED_SCALE = 0.4
MIN_FEATURES = 10
SPIKE_THRESHOLD = 2.0
MIN_MOTION_PX = 4.0
BLUR_KERNEL = (21, 21)
STATIONARY_COUNT_MAX = 2
DEAD_ZONE_KMH = 5.0
FRAME_WIDTH = 480
WARMUP_FRAMES = 3

speed_history = deque(maxlen=SMOOTH_WINDOW)

LK_PARAMS = dict(
    winSize=(21, 21),
    maxLevel=3,
    criteria=(cv2.TERM_CRITERIA_EPS | cv2.TERM_CRITERIA_COUNT, 30, 0.01),
)

FEATURE_PARAMS = dict(
    maxCorners=150,
    qualityLevel=0.2,
    minDistance=7,
    blockSize=7,
)


def detect_features(gray):
    try:
        return cv2.goodFeaturesToTrack(gray, **FEATURE_PARAMS)
    except Exception:
        return None


def preprocess(frame_bgr):
    try:
        h, w = frame_bgr.shape[:2]
        if w > FRAME_WIDTH:
            scale = FRAME_WIDTH / w
            frame_bgr = cv2.resize(frame_bgr, (FRAME_WIDTH, int(h * scale)),
                                   interpolation=cv2.INTER_AREA)
        gray = cv2.cvtColor(frame_bgr, cv2.COLOR_BGR2GRAY)
        return cv2.GaussianBlur(gray, BLUR_KERNEL, 0)
    except Exception:
        return None


def smooth_speed(raw_speed):
    raw_speed = max(0.0, raw_speed)

    if len(speed_history) >= 3:
        current_avg = sum(speed_history) / len(speed_history)
        if current_avg > 0.5 and raw_speed > current_avg * SPIKE_THRESHOLD:
            raw_speed = current_avg

    speed_history.append(raw_speed)

    weights = list(range(1, len(speed_history) + 1))
    weighted_sum = sum(s * w for s, w in zip(speed_history, weights))
    return round(weighted_sum / sum(weights), 1)


def estimate_speed(current_frame):
    global prev_gray, prev_points, prev_time, stationary_count, frame_number

    frame_number += 1
    gray = preprocess(current_frame)
    if gray is None:
        return 0.0, "preprocess_failed"

    if frame_number <= WARMUP_FRAMES:
        prev_gray = gray
        prev_points = detect_features(gray)
        prev_time = time.time()
        speed_history.append(0.0)
        return 0.0, "warming_up"

    if prev_gray is None:
        prev_gray = gray
        prev_points = detect_features(gray)
        prev_time = time.time()
        return 0.0, "initializing"

    if prev_points is None or len(prev_points) < MIN_FEATURES:
        prev_points = detect_features(prev_gray)
        if prev_points is None or len(prev_points) < MIN_FEATURES:
            prev_gray = gray
            prev_time = time.time()
            stationary_count += 1
            return smooth_speed(0.0), "no_object"

    try:
        next_points, status, _ = cv2.calcOpticalFlowPyrLK(
            prev_gray, gray, prev_points, None, **LK_PARAMS
        )
    except Exception:
        prev_gray = gray
        prev_points = detect_features(gray)
        prev_time = time.time()
        return smooth_speed(0.0), "flow_error"

    if next_points is None or status is None:
        prev_gray = gray
        prev_points = detect_features(gray)
        prev_time = time.time()
        stationary_count += 1
        return smooth_speed(0.0), "tracking_lost"

    good_old = prev_points[status.flatten() == 1]
    good_new = next_points[status.flatten() == 1]

    if len(good_new) < MIN_FEATURES:
        prev_gray = gray
        prev_points = detect_features(gray)
        prev_time = time.time()
        stationary_count += 1
        return smooth_speed(0.0), "no_object"

    displacements = np.sqrt(np.sum((good_new - good_old) ** 2, axis=1))
    median_displacement = float(np.median(displacements))

    current_time = time.time()
    dt = max(current_time - prev_time, 0.1)

    if median_displacement < MIN_MOTION_PX:
        stationary_count += 1
        prev_gray = gray
        prev_points = detect_features(gray)
        prev_time = current_time
        status_str = "stationary" if stationary_count >= STATIONARY_COUNT_MAX else "minimal_motion"
        return smooth_speed(0.0), status_str

    stationary_count = 0
    raw_speed = min((median_displacement / dt) * SPEED_SCALE, MAX_SPEED)
    speed = smooth_speed(raw_speed)

    if speed < DEAD_ZONE_KMH:
        speed = 0.0

    prev_gray = gray
    prev_points = good_new.reshape(-1, 1, 2)
    prev_time = current_time

    if len(prev_points) < MIN_FEATURES * 2:
        new_features = detect_features(gray)
        if new_features is not None:
            prev_points = new_features

    return speed, "tracking"


@app.route('/upload-frame', methods=['POST'])
def upload_frame():
    try:
        data = request.get_json(silent=True)
    except Exception:
        data = None

    if not data or not isinstance(data, dict) or 'image' not in data:
        return jsonify(SAFE_RESPONSE), 200

    try:
        image_data = data['image']
        if not isinstance(image_data, str) or len(image_data) < 100:
            return jsonify(SAFE_RESPONSE), 200

        img_bytes = base64.b64decode(image_data)
        img = Image.open(BytesIO(img_bytes))
        img.verify()
        img = Image.open(BytesIO(img_bytes))
        frame = np.array(img)

        if frame.ndim < 2 or frame.shape[0] < 10 or frame.shape[1] < 10:
            return jsonify(SAFE_RESPONSE), 200

        if frame.ndim == 3 and frame.shape[2] >= 3:
            frame_bgr = cv2.cvtColor(frame, cv2.COLOR_RGB2BGR)
        elif frame.ndim == 2:
            frame_bgr = cv2.cvtColor(frame, cv2.COLOR_GRAY2BGR)
        else:
            return jsonify(SAFE_RESPONSE), 200

        speed, status = estimate_speed(frame_bgr)
        speed = max(0.0, min(float(speed), MAX_SPEED))

        return jsonify({'speed': speed, 'status': status, 'unit': 'km/h'})

    except (base64.binascii.Error, ValueError):
        return jsonify(SAFE_RESPONSE), 200
    except Exception:
        traceback.print_exc()
        return jsonify(SAFE_RESPONSE), 200


@app.route('/reset', methods=['POST'])
def reset():
    global prev_gray, prev_points, prev_time, stationary_count, frame_number
    prev_gray = None
    prev_points = None
    prev_time = None
    stationary_count = 0
    frame_number = 0
    speed_history.clear()
    return jsonify({'status': 'reset'})


@app.route('/health', methods=['GET'])
def health():
    return jsonify({'status': 'ok', 'frames_processed': frame_number})


if __name__ == '__main__':
    print('Server running on http://0.0.0.0:8000')
    app.run(host='0.0.0.0', port=8000, debug=True)
