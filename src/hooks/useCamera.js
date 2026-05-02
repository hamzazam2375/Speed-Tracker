import { useState, useRef } from 'react';
import { useCameraPermissions } from 'expo-camera';

export default function useCamera() {
  const [permission, requestPermission] = useCameraPermissions();
  const [capturing, setCapturing] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [frameCount, setFrameCount] = useState(0);
  const cameraRef = useRef(null);
  const timer = useRef(null);
  const callbackRef = useRef(null);
  const busyRef = useRef(false);

  async function askPermission() {
    if (permission?.granted) return true;
    const result = await requestPermission();
    return result.granted;
  }

  function startCapture(onFrameCaptured) {
    if (!cameraRef.current) return;
    callbackRef.current = onFrameCaptured || null;
    busyRef.current = false;
    setCapturing(true);
    setFrameCount(0);

    timer.current = setInterval(async () => {
      if (busyRef.current) return;
      busyRef.current = true;

      try {
        const photo = await cameraRef.current.takePictureAsync({
          quality: 0.3,
          base64: true,
          skipProcessing: true,
        });
        setFrameCount(prev => prev + 1);

        if (callbackRef.current) {
          setProcessing(true);
          try {
            await callbackRef.current(photo);
          } finally {
            setProcessing(false);
          }
        }
      } catch {
        setProcessing(false);
      } finally {
        busyRef.current = false;
      }
    }, 1500);
  }

  function stopCapture() {
    if (timer.current) {
      clearInterval(timer.current);
      timer.current = null;
    }
    callbackRef.current = null;
    busyRef.current = false;
    setCapturing(false);
    setProcessing(false);
  }

  return {
    cameraRef, permission, capturing, processing,
    frameCount, askPermission, startCapture, stopCapture,
  };
}
