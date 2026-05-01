import { useState, useRef, useCallback } from 'react';
import { CameraView, useCameraPermissions } from 'expo-camera';

const CAPTURE_INTERVAL = 500; // ms between frame captures

export default function useCamera() {
  const [permission, requestPermission] = useCameraPermissions();
  const [capturing, setCapturing] = useState(false);
  const cameraRef = useRef(null);
  const timer = useRef(null);

  async function askPermission() {
    if (permission?.granted) return true;
    let result = await requestPermission();
    return result.granted;
  }

  function startCapture(onFrame) {
    if (!cameraRef.current) return;
    setCapturing(true);
    timer.current = setInterval(async () => {
      try {
        let photo = await cameraRef.current.takePictureAsync({
          quality: 0.3,
          base64: true,
          skipProcessing: true,
        });
        if (onFrame) onFrame(photo);
      } catch (e) {
        console.log('capture error:', e.message);
      }
    }, CAPTURE_INTERVAL);
  }

  function stopCapture() {
    if (timer.current) {
      clearInterval(timer.current);
      timer.current = null;
    }
    setCapturing(false);
  }

  return {
    cameraRef,
    permission,
    capturing,
    askPermission,
    startCapture,
    stopCapture,
  };
}
