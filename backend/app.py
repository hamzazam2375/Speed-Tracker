from flask import Flask, request, jsonify
from flask_cors import CORS
from processor import decode_frame, estimate_speed
import time

app = Flask(__name__)
CORS(app)

prev_frame = None
prev_time = None

@app.route('/api/health', methods=['GET'])
def health():
    return jsonify({'status': 'online', 'time': time.time()})

@app.route('/api/process-frame', methods=['POST'])
def process_frame():
    global prev_frame, prev_time
    data = request.get_json()
    if not data or 'image' not in data:
        return jsonify({'error': 'no image provided', 'speed': 0}), 400

    try:
        curr_frame = decode_frame(data['image'])
        curr_time = data.get('timestamp', time.time() * 1000) / 1000

        dt = 0
        if prev_time is not None:
            dt = curr_time - prev_time

        speed = estimate_speed(prev_frame, curr_frame, dt)
        prev_frame = curr_frame
        prev_time = curr_time

        return jsonify({
            'speed': round(speed, 2),
            'unit': 'km/h',
            'timestamp': curr_time,
            'processed': True
        })
    except Exception as e:
        return jsonify({'error': str(e), 'speed': 0}), 500

if __name__ == '__main__':
    print('Starting CV backend on port 8000...')
    app.run(host='0.0.0.0', port=8000, debug=True)
