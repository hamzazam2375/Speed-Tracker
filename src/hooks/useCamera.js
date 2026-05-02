import { useState, useRef, useCallback } from 'react';
import { useCameraPermissions } from 'expo-camera';

export default function useCamera() {
  const [permission, requestPermission] = useCameraPermissions();
  const [capturing, setCapturing] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [lastPhoto, setLastPhoto] = useState(null);
  const [frameCount, setFrameCount] = useState(0);
  const cameraRef = useRef(null);
  const timer = useRef(null);
  const callbackRef = useRef(null);

  // ask user for camera access
  async function askPermission() {
    if (permission?.granted) return true;
    let result = await requestPermission();
    return result.granted;
  }

  // start auto-capturing every 2 seconds
  // accepts an optional onFrameCaptured(photo) callback
  function startCapture(onFrameCaptured) {
    if (!cameraRef.current) return;

    // store callback in ref so the interval always has the latest
    callbackRef.current = onFrameCaptured || null;

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
        console.log('📸 captured frame, size:', Math.round(photo.base64.length / 1024), 'KB');

        // if a callback was provided, call it with the photo
        if (callbackRef.current) {
          setProcessing(true);
          try {
            await callbackRef.current(photo);
          } finally {
            setProcessing(false);
          }
        }
      } catch (e) {
        console.log('capture error:', e.message);
        setProcessing(false);
      }
    }, 2000);
  }

  // stop capturing
  function stopCapture() {
    if (timer.current) {
      clearInterval(timer.current);
      timer.current = null;
    }
    callbackRef.current = null;
    setCapturing(false);
    setProcessing(false);
  }

  return {
    cameraRef,
    permission,
    capturing,
    processing,
    lastPhoto,
    frameCount,
    askPermission,
    startCapture,
    stopCapture,
  };
}
