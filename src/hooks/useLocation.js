// useLocation.js
// Custom hook for GPS-based speed tracking using expo-location
// TODO: Implement location permission request
// TODO: Implement watchPositionAsync for real-time speed updates
// TODO: Convert m/s to km/h

import { useState } from 'react';

export default function useLocation() {
  const [speed, setSpeed] = useState(0);          // Current speed in km/h
  const [location, setLocation] = useState(null);  // Latest location object
  const [errorMsg, setErrorMsg] = useState(null);  // Error messages
  const [isTracking, setIsTracking] = useState(false);

  const startTracking = async () => {
    // TODO: Request permissions, start watchPositionAsync
  };

  const stopTracking = () => {
    // TODO: Remove location subscription
  };

  return {
    speed,
    location,
    errorMsg,
    isTracking,
    startTracking,
    stopTracking,
  };
}
