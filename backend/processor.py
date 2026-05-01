import base64
import numpy as np
import cv2
from PIL import Image
from io import BytesIO

def decode_frame(base64_str):
    img_bytes = base64.b64decode(base64_str)
    img = Image.open(BytesIO(img_bytes))
    frame = np.array(img)
    frame = cv2.cvtColor(frame, cv2.COLOR_RGB2BGR)
    return frame

def estimate_speed(prev_frame, curr_frame, dt):
    # placeholder - will be replaced with actual optical flow logic
    # returns dummy speed for now
    if prev_frame is None or curr_frame is None:
        return 0.0
    # TODO: implement optical flow (Lucas-Kanade or Farneback)
    # TODO: calculate pixel displacement -> real world speed
    return 0.0
