import { useState } from 'react';
import useCamera from './useCamera';
import { sendFrame } from '../services/api';

export default function useSpeed() {
  const cam = useCamera();
  const [speed, setSpeed] = useState(0);
  const [error, setError] = useState(null);
  const [source, setSource] = useState('none');
  const [backendUp, setBackendUp] = useState(false);

  // callback for each captured frame — sends to backend
  async function handleFrame(photo) {
    if (!photo?.base64) return;

    let result = await sendFrame(photo.base64);

    if (result && !result.error) {
      setSpeed(result.speed);
      setBackendUp(true);
      setSource('cv');
      setError(null);
      console.log('🏎️ Speed updated:', result.speed, 'km/h');
    } else {
      setError(result?.error || 'Unknown error');
      console.log('⚠️ Speed error:', result?.error);
    }
  }

  async function start() {
    setError(null);
    let ok = await cam.askPermission();
    if (ok) {
      cam.startCapture(handleFrame);
    } else {
      setError('Camera permission denied');
    }
  }

  function stop() {
    cam.stopCapture();
    setSpeed(0);
    setSource('none');
  }

  return {
    speed,
    error,
    source,
    backendUp,
    tracking: cam.capturing,
    processing: cam.processing,
    cameraRef: cam.cameraRef,
    cameraPermission: cam.permission,
    capturing: cam.capturing,
    start,
    stop,
  };
}
