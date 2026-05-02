import React, { useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { CameraView } from 'expo-camera';
import useCamera from '../hooks/useCamera';
import { sendFrame } from '../services/api';

export default function CameraScreen() {
  const {
    cameraRef, permission, capturing, processing,
    lastPhoto, frameCount,
    askPermission, startCapture, stopCapture,
  } = useCamera();

  // ask for permission when screen loads
  useEffect(() => {
    askPermission();
  }, []);

  // callback that sends each captured frame to the backend
  const handleFrame = useCallback(async (photo) => {
    if (!photo?.base64) return;

    console.log('🔄 Processing frame #', frameCount + 1);

    const result = await sendFrame(photo.base64);

    if (result && !result.error) {
      console.log('✅ Speed from backend:', result.speed, 'km/h');
    } else {
      console.log('⚠️ Backend returned error:', result?.error);
    }
  }, [frameCount]);

  // start capture with the API callback
  const handleStartCapture = useCallback(() => {
    startCapture(handleFrame);
  }, [handleFrame]);

  // permission not yet determined
  if (!permission) {
    return (
      <View style={styles.container}>
        <Text style={styles.msg}>Requesting camera access...</Text>
      </View>
    );
  }

  // permission denied
  if (!permission.granted) {
    return (
      <View style={styles.container}>
        <Text style={styles.msg}>Camera access denied</Text>
        <TouchableOpacity style={styles.btn} onPress={askPermission}>
          <Text style={styles.btnText}>Grant Permission</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* camera preview */}
      <CameraView
        ref={cameraRef}
        style={styles.camera}
        facing="back"
      />

      {/* info bar */}
      <View style={styles.info}>
        <Text style={styles.infoText}>Frames: {frameCount}</Text>
        {lastPhoto && (
          <Text style={styles.infoText}>
            Last: {Math.round(lastPhoto.base64.length / 1024)}KB
          </Text>
        )}
        {processing && (
          <View style={styles.processingRow}>
            <ActivityIndicator size="small" color="#00e5ff" />
            <Text style={styles.processingText}>Processing…</Text>
          </View>
        )}
      </View>

      {/* start/stop button */}
      <TouchableOpacity
        style={[styles.btn, capturing && styles.btnStop]}
        onPress={capturing ? stopCapture : handleStartCapture}
      >
        <Text style={styles.btnText}>
          {capturing ? 'Stop Capture' : 'Start Capture'}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a1a',
    justifyContent: 'center',
    alignItems: 'center',
  },
  camera: {
    width: '100%',
    flex: 1,
  },
  msg: {
    color: '#aaa',
    fontSize: 16,
    marginBottom: 20,
  },
  info: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    width: '100%',
    paddingVertical: 10,
    backgroundColor: '#111',
  },
  infoText: {
    color: '#888',
    fontSize: 14,
  },
  processingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  processingText: {
    color: '#00e5ff',
    fontSize: 13,
    fontWeight: '500',
  },
  btn: {
    backgroundColor: '#00e5ff',
    paddingHorizontal: 40,
    paddingVertical: 14,
    borderRadius: 30,
    marginVertical: 20,
  },
  btnStop: {
    backgroundColor: '#ff1744',
  },
  btnText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
});
