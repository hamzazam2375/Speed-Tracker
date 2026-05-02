import React, { useEffect, useCallback, useState, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { CameraView } from 'expo-camera';
import useCamera from '../hooks/useCamera';
import Speedometer from '../components/Speedometer';
import { sendFrame, resetBackend } from '../services/api';
import { COLORS } from '../constants/theme';

export default function CameraScreen({ navigation }) {
  const {
    cameraRef, permission, capturing, processing,
    frameCount, askPermission, startCapture, stopCapture,
  } = useCamera();

  const [speed, setSpeed] = useState(0);
  const [status, setStatus] = useState('initializing');
  const speedReadings = useRef([]);
  const sessionStart = useRef(null);

  useEffect(() => {
    initSession();
    return () => stopCapture();
  }, []);

  async function initSession() {
    const granted = await askPermission();
    if (!granted) {
      setStatus('permission_denied');
      return;
    }
    await resetBackend();
    sessionStart.current = Date.now();
    speedReadings.current = [];
    startCapture(handleFrame);
    setStatus('tracking');
  }

  const handleFrame = useCallback(async (photo) => {
    if (!photo?.base64) return;
    setStatus('processing');

    try {
      const result = await sendFrame(photo.base64);
      const receivedSpeed = typeof result.speed === 'number' ? result.speed : 0;
      setSpeed(receivedSpeed);
      speedReadings.current.push(receivedSpeed);

      if (result.status === 'no_object') {
        setStatus('no_object');
      } else if (result.error || result.status === 'timeout') {
        setStatus('error');
      } else {
        setStatus('tracking');
      }
    } catch {
      setSpeed(0);
      setStatus('error');
    }
  }, []);

  function handleStop() {
    stopCapture();

    const readings = speedReadings.current;
    const totalFrames = readings.length;
    const duration = sessionStart.current
      ? Math.round((Date.now() - sessionStart.current) / 1000)
      : 0;

    let avgSpeed = 0;
    let maxSpeed = 0;
    if (totalFrames > 0) {
      avgSpeed = Math.round(readings.reduce((a, b) => a + b, 0) / totalFrames * 10) / 10;
      maxSpeed = Math.round(Math.max(...readings) * 10) / 10;
    }

    navigation.navigate('Home', {
      results: { avgSpeed, maxSpeed, totalFrames, duration },
    });
  }

  const statusConfig = {
    initializing: { text: 'Starting...', color: COLORS.textMuted },
    tracking: { text: 'Tracking', color: COLORS.success },
    processing: { text: 'Processing...', color: COLORS.primary },
    no_object: { text: 'No Object Detected', color: COLORS.warning },
    error: { text: 'Connection Error', color: COLORS.danger },
    permission_denied: { text: 'Camera Access Denied', color: COLORS.danger },
  };

  const currentStatus = statusConfig[status] || statusConfig.tracking;

  if (!permission) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

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
      <View style={styles.cameraWrapper}>
        <CameraView ref={cameraRef} style={styles.camera} facing="back" />

        <View style={styles.speedOverlay}>
          <Speedometer speed={speed} />
        </View>
      </View>

      <View style={styles.statusBar}>
        <View style={styles.statusRow}>
          {status === 'processing' && (
            <ActivityIndicator size="small" color={COLORS.primary} style={{ marginRight: 8 }} />
          )}
          <View style={[styles.statusDot, { backgroundColor: currentStatus.color }]} />
          <Text style={[styles.statusText, { color: currentStatus.color }]}>
            {currentStatus.text}
          </Text>
        </View>
      </View>

      <View style={styles.infoBar}>
        <View style={styles.infoItem}>
          <Text style={styles.infoLabel}>FRAMES</Text>
          <Text style={styles.infoValue}>{frameCount}</Text>
        </View>
        <View style={styles.infoDivider} />
        <View style={styles.infoItem}>
          <Text style={styles.infoLabel}>SPEED</Text>
          <Text style={[styles.infoValue, { color: COLORS.primary }]}>{speed} km/h</Text>
        </View>
      </View>

      <TouchableOpacity style={styles.stopBtn} activeOpacity={0.8} onPress={handleStop}>
        <Text style={styles.stopBtnText}>Stop Tracking</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cameraWrapper: {
    width: '100%',
    flex: 1,
    position: 'relative',
  },
  camera: {
    width: '100%',
    flex: 1,
  },
  speedOverlay: {
    position: 'absolute',
    bottom: 20,
    alignSelf: 'center',
  },
  statusBar: {
    width: '100%',
    paddingVertical: 8,
    backgroundColor: COLORS.surface,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  statusText: {
    fontSize: 14,
    fontWeight: '500',
  },
  infoBar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    width: '100%',
    paddingVertical: 12,
    backgroundColor: '#111',
  },
  infoItem: {
    alignItems: 'center',
    flex: 1,
  },
  infoLabel: {
    color: COLORS.textMuted,
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 1,
    marginBottom: 2,
  },
  infoValue: {
    color: '#ccc',
    fontSize: 15,
    fontWeight: '600',
  },
  infoDivider: {
    width: 1,
    height: 28,
    backgroundColor: COLORS.border,
  },
  msg: {
    color: COLORS.textSecondary,
    fontSize: 16,
    marginBottom: 20,
  },
  btn: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 40,
    paddingVertical: 14,
    borderRadius: 30,
  },
  btnText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  stopBtn: {
    backgroundColor: COLORS.danger,
    paddingHorizontal: 40,
    paddingVertical: 14,
    borderRadius: 30,
    marginVertical: 16,
  },
  stopBtnText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
});
