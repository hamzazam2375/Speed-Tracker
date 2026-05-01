import { useState, useEffect } from 'react';
import useCamera from './useCamera';
import { sendFrame } from '../services/api';

export default function useSpeed() {
  const cam = useCamera();
  const [speed, setSpeed] = useState(0);
  const [source, setSource] = useState('none');
  const [backendUp, setBackendUp] = useState(false);

  async function handleFrame(photo) {
    if (!photo?.base64) return;
    let result = await sendFrame(photo.base64);
    if (result && !result.error) {
      setSpeed(result.speed);
      setBackendUp(true);
      setSource('cv');
    }
  }

  async function start() {
    let ok = await cam.askPermission();
    if (ok) cam.startCapture(handleFrame);
  }

  function stop() {
    cam.stopCapture();
    setSpeed(0);
    setSource('none');
  }

  return {
    speed,
    source,
    backendUp,
    cameraRef: cam.cameraRef,
    cameraPermission: cam.permission,
    capturing: cam.capturing,
    start,
    stop,
  };
}
