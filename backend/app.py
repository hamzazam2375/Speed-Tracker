from flask import Flask, request, jsonify
from flask_cors import CORS
import numpy as np
import cv2
from PIL import Image
from io import BytesIO
import base64
import time

# create flask app
app = Flask(__name__)
CORS(app)  # allow requests from the mobile app

# ── global state for frame differencing ──
prev_frame = None        # previous grayscale frame
prev_time = None         # timestamp of previous frame
SPEED_SCALE = 0.15       # scaling factor: motion intensity → km/h
MOTION_THRESHOLD = 25    # pixel difference threshold (ignore noise below this)
BLUR_KERNEL = (21, 21)   # gaussian blur kernel to reduce noise


def estimate_speed(current_frame):
    """
    Compare current frame with previous frame using absolute difference.
    Returns estimated speed in km/h based on motion intensity.
    """
    global prev_frame, prev_time

    # convert BGR → grayscale for comparison
    gray = cv2.cvtColor(current_frame, cv2.COLOR_BGR2GRAY)

    # apply gaussian blur to reduce camera noise
    gray = cv2.GaussianBlur(gray, BLUR_KERNEL, 0)

    # if this is the first frame, store it and return 0
    if prev_frame is None:
        prev_frame = gray
        prev_time = time.time()
        return 0.0, 0.0

    # calculate absolute difference between frames
    frame_diff = cv2.absdiff(prev_frame, gray)

    # apply threshold — ignore tiny pixel changes (noise)
    _, thresh = cv2.threshold(frame_diff, MOTION_THRESHOLD, 255, cv2.THRESH_BINARY)

    # count non-zero (changed) pixels
    changed_pixels = cv2.countNonZero(thresh)
    total_pixels = gray.shape[0] * gray.shape[1]

    # motion intensity = percentage of pixels that changed
    motion_intensity = (changed_pixels / total_pixels) * 100

    # time delta between frames
    current_time = time.time()
    dt = current_time - prev_time

    # scale motion intensity to approximate speed
    # higher motion → higher speed, adjusted by time gap
    if dt > 0:
        speed = motion_intensity * SPEED_SCALE * (1.0 / max(dt, 0.1))
    else:
        speed = 0.0

    # cap at reasonable max speed
    speed = min(speed, 200.0)

    # update previous frame and time
    prev_frame = gray
    prev_time = current_time

    return round(speed, 1), round(motion_intensity, 2)


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

        # run motion detection and speed estimation
        speed, motion = estimate_speed(frame_bgr)

        print(f"[SPEED] {speed} km/h | Motion: {motion}%")

        return jsonify({
            'speed': speed,
            'motion': motion,
            'unit': 'km/h'
        })

    except Exception as e:
        print(f"[ERROR] {e}")
        return jsonify({'error': str(e), 'speed': 0}), 500


@app.route('/reset', methods=['POST'])
def reset():
    """Reset the previous frame — useful when restarting tracking."""
    global prev_frame, prev_time
    prev_frame = None
    prev_time = None
    print("[RESET] Frame history reset")
    return jsonify({'status': 'reset'})


# run the server
if __name__ == '__main__':
    print('Server running on http://0.0.0.0:8000')
    app.run(host='0.0.0.0', port=8000, debug=True)
