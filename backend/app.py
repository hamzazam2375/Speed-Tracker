from flask import Flask, request, jsonify
from flask_cors import CORS
import numpy as np
from PIL import Image
from io import BytesIO
import base64

# create flask app
app = Flask(__name__)
CORS(app)  # allow requests from the mobile app

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

        # open image using PIL
        img = Image.open(BytesIO(img_bytes))

        # convert to numpy array (this is what opencv uses)
        frame = np.array(img)

        # log the frame shape so we know it worked
        print(f"Got frame: {frame.shape}")

        # return dummy speed for now
        # real opencv processing will go here later
        return jsonify({'speed': 0})

    except Exception as e:
        print(f"Error: {e}")
        return jsonify({'error': str(e), 'speed': 0}), 500

# run the server
if __name__ == '__main__':
    print('Server running on http://0.0.0.0:8000')
    app.run(host='0.0.0.0', port=8000, debug=True)
