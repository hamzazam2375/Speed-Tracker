import { useState, useRef } from 'react';
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
  const busyRef = useRef(false);   // prevents overlapping captures

  // ask user for camera access
  async function askPermission() {
    if (permission?.granted) return true;
    let result = await requestPermission();
    return result.granted;
  }

  // start auto-capturing every 1 second
  // accepts an optional onFrameCaptured(photo) callback
  function startCapture(onFrameCaptured) {
    if (!cameraRef.current) return;

    // store callback in ref so the interval always has the latest
    callbackRef.current = onFrameCaptured || null;
    busyRef.current = false;

    setCapturing(true);
    setFrameCount(0);
    timer.current = setInterval(async () => {
      // skip if previous capture+callback is still running (prevents overlap)
      if (busyRef.current) return;
      busyRef.current = true;

      try {
        let photo = await cameraRef.current.takePictureAsync({
          quality: 0.3,
          base64: true,
          skipProcessing: true,
        });
        setLastPhoto(photo);
        setFrameCount(prev => prev + 1);

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
      } finally {
        busyRef.current = false;
      }
    }, 1500);  // 1.5 second interval (allows time for round-trip)
  }

  // stop capturing
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
