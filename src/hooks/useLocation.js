import { useState, useEffect, useRef } from 'react';
import * as Location from 'expo-location';

export default function useLocation() {
  const [speed, setSpeed] = useState(0);
  const [location, setLocation] = useState(null);
  const [error, setError] = useState(null);
  const [tracking, setTracking] = useState(false);
  const sub = useRef(null);

  async function requestPermission() {
    let { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      setError('Location permission denied');
      return false;
    }
    setError(null);
    return true;
  }

  async function start() {
    let ok = await requestPermission();
    if (!ok) return;
    setTracking(true);
    sub.current = await Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.High,
        timeInterval: 1000,
        distanceInterval: 5,
      },
      (loc) => {
        setLocation(loc);
        // GPS gives speed in m/s, convert to km/h
        let raw = loc.coords.speed;
        if (raw != null && raw >= 0) {
          setSpeed(raw * 3.6);
        } else {
          setSpeed(0);
        }
        console.log('Location update:', {
          lat: loc.coords.latitude,
          lng: loc.coords.longitude,
          speed: raw,
          kmh: raw != null ? (raw * 3.6).toFixed(1) : 0,
        });
      }
    );
  }

  function stop() {
    if (sub.current) {
      sub.current.remove();
      sub.current = null;
    }
    setTracking(false);
    setSpeed(0);
  }

  useEffect(() => {
    return () => {
      if (sub.current) sub.current.remove();
    };
  }, []);

  return { speed, location, error, tracking, start, stop };
}
