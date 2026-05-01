// change this to your backend IP when running on a real device
const BASE_URL = 'http://192.168.1.100:8000';

async function sendFrame(base64Image) {
  try {
    let res = await fetch(`${BASE_URL}/api/process-frame`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image: base64Image, timestamp: Date.now() }),
    });
    let data = await res.json();
    return data;
  } catch (e) {
    console.log('api error:', e.message);
    return { speed: 0, error: e.message };
  }
}

async function checkHealth() {
  try {
    let res = await fetch(`${BASE_URL}/api/health`);
    let data = await res.json();
    return data;
  } catch (e) {
    return { status: 'offline' };
  }
}

export { sendFrame, checkHealth, BASE_URL };
