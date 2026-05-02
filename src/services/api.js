// change this to your computer's IP when running on a real device
// use 'ipconfig' (Windows) or 'ifconfig' (Mac/Linux) to find your LAN IP
const BASE_URL = 'http://192.168.100.155:8000';

/**
 * Send a captured camera frame (base64) to the Flask backend
 * and return the JSON response (e.g. { speed: 0 }).
 */
async function sendFrame(base64Image) {
  try {
    console.log('📤 Sending frame to backend...', BASE_URL);

    let res = await fetch(`${BASE_URL}/upload-frame`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image: base64Image }),
    });

    if (!res.ok) {
      throw new Error(`Server responded with ${res.status}`);
    }

    let data = await res.json();
    console.log('📥 Backend response:', JSON.stringify(data));
    return data;
  } catch (e) {
    console.log('❌ API error:', e.message);
    return { speed: 0, error: e.message };
  }
}

export { sendFrame, BASE_URL };
