import { useState, useRef } from 'react';
import { useCameraPermissions } from 'expo-camera';

export default function useCamera() {
  const [permission, requestPermission] = useCameraPermissions();
  const [capturing, setCapturing] = useState(false);
  const [lastPhoto, setLastPhoto] = useState(null);
  const [frameCount, setFrameCount] = useState(0);
  const cameraRef = useRef(null);
  const timer = useRef(null);

  // ask user for camera access
  async function askPermission() {
    if (permission?.granted) return true;
    let result = await requestPermission();
    return result.granted;
  }

  // start auto-capturing every 2 seconds
  function startCapture() {
    if (!cameraRef.current) return;
    setCapturing(true);
    setFrameCount(0);
    timer.current = setInterval(async () => {
      try {
        let photo = await cameraRef.current.takePictureAsync({
          quality: 0.3,
          base64: true,
          skipProcessing: true,
        });
        setLastPhoto(photo);
        setFrameCount(prev => prev + 1);
        console.log('captured frame, size:', photo.base64.length);
      } catch (e) {
        console.log('capture error:', e.message);
      }
    }, 2000);
  }

  // stop capturing
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
    lastPhoto,
    frameCount,
    askPermission,
    startCapture,
    stopCapture,
  };
}
