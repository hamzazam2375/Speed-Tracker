// change this to your computer's IP when running on a real device
// use 'ipconfig' (Windows) or 'ifconfig' (Mac/Linux) to find your LAN IP
const BASE_URL = 'http://192.168.100.155:8000';

// request timeout (ms) — prevents hanging if server is down
const TIMEOUT_MS = 8000;

/**
 * Send a captured camera frame (base64) to the Flask backend.
 * Always returns a valid object with at least { speed: 0 }.
 */
async function sendFrame(base64Image) {
  // guard: no image data
  if (!base64Image || typeof base64Image !== 'string' || base64Image.length < 100) {
    return { speed: 0, status: 'invalid_input' };
  }

  try {
    // create abort controller for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

    let res = await fetch(`${BASE_URL}/upload-frame`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image: base64Image }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    // try to parse JSON regardless of status code
    let data;
    try {
      data = await res.json();
    } catch {
      // response wasn't valid JSON
      return { speed: 0, status: 'invalid_response' };
    }

    // ensure speed is always a valid number
    if (data && typeof data.speed === 'number' && isFinite(data.speed)) {
      return data;
    }

    // response missing speed — use safe default
    return { speed: 0, status: data?.status || 'no_speed', ...data };

  } catch (e) {
    // network error, timeout, or abort
    const isTimeout = e.name === 'AbortError';
    return {
      speed: 0,
      status: isTimeout ? 'timeout' : 'network_error',
      error: isTimeout ? 'Request timed out' : e.message,
    };
  }
}

export { sendFrame, BASE_URL };
