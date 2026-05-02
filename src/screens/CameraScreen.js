import React, { useEffect, useCallback, useState } from 'react';
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

  // speed & status state
  const [speed, setSpeed] = useState(null);
  const [status, setStatus] = useState('idle');       // idle | processing | received | error
  const [errorMsg, setErrorMsg] = useState(null);

  // ask for permission when screen loads
  useEffect(() => {
    askPermission();
  }, []);

  // callback that sends each captured frame to the backend
  const handleFrame = useCallback(async (photo) => {
    if (!photo?.base64) return;

    setStatus('processing');
    setErrorMsg(null);

    try {
      const result = await sendFrame(photo.base64);

      // sendFrame always returns { speed, status, ... } — never null
      const receivedSpeed = typeof result.speed === 'number' ? result.speed : 0;

      // check for error/timeout/network issues
      if (result.error || result.status === 'timeout' || result.status === 'network_error') {
        setSpeed(receivedSpeed);
        setStatus('error');
        setErrorMsg(result.error || result.status);
      } else {
        setSpeed(receivedSpeed);
        setStatus('received');
      }
    } catch (e) {
      // safety net — should never reach here
      setSpeed(0);
      setStatus('error');
      setErrorMsg('Unexpected error');
    }
  }, []);

  // start capture with the API callback
  const handleStartCapture = useCallback(() => {
    setSpeed(null);
    setStatus('idle');
    setErrorMsg(null);
    startCapture(handleFrame);
  }, [handleFrame]);

  // stop and reset
  const handleStopCapture = useCallback(() => {
    stopCapture();
    setStatus('idle');
  }, []);

  // get status indicator config
  const getStatusConfig = () => {
    switch (status) {
      case 'processing':
        return { text: 'Processing...', color: '#00e5ff' };
      case 'received':
        return { text: 'Speed received', color: '#00e676' };
      case 'error':
        return { text: errorMsg || 'Error', color: '#ff1744' };
      default:
        return { text: 'Waiting', color: '#555' };
    }
  };

  const statusConfig = getStatusConfig();

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
      <View style={styles.cameraWrapper}>
        <CameraView
          ref={cameraRef}
          style={styles.camera}
          facing="back"
        />

        {/* speed overlay on camera */}
        <View style={styles.speedOverlay}>
          <Text style={styles.speedValue}>
            {speed !== null ? Math.round(speed) : '--'}
          </Text>
          <Text style={styles.speedUnit}>km/h</Text>
        </View>
      </View>

      {/* status bar */}
      <View style={styles.statusBar}>
        <View style={styles.statusRow}>
          {status === 'processing' && (
            <ActivityIndicator size="small" color="#00e5ff" style={{ marginRight: 8 }} />
          )}
          <View style={[styles.statusDot, { backgroundColor: statusConfig.color }]} />
          <Text style={[styles.statusText, { color: statusConfig.color }]}>
            {statusConfig.text}
          </Text>
        </View>
      </View>

      {/* info bar */}
      <View style={styles.info}>
        <View style={styles.infoItem}>
          <Text style={styles.infoLabel}>FRAMES</Text>
          <Text style={styles.infoValue}>{frameCount}</Text>
        </View>
        <View style={styles.infoDivider} />
        <View style={styles.infoItem}>
          <Text style={styles.infoLabel}>SIZE</Text>
          <Text style={styles.infoValue}>
            {lastPhoto ? `${Math.round(lastPhoto.base64.length / 1024)}KB` : '--'}
          </Text>
        </View>
        <View style={styles.infoDivider} />
        <View style={styles.infoItem}>
          <Text style={styles.infoLabel}>SPEED</Text>
          <Text style={[styles.infoValue, { color: '#00e5ff' }]}>
            {speed !== null ? `${speed} km/h` : '--'}
          </Text>
        </View>
      </View>

      {/* start/stop button */}
      <TouchableOpacity
        style={[styles.btn, capturing && styles.btnStop]}
        onPress={capturing ? handleStopCapture : handleStartCapture}
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
  cameraWrapper: {
    width: '100%',
    flex: 1,
    position: 'relative',
  },
  camera: {
    width: '100%',
    flex: 1,
  },
  // ── speed overlay ──
  speedOverlay: {
    position: 'absolute',
    bottom: 20,
    alignSelf: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: 20,
    paddingHorizontal: 30,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: 'rgba(0, 229, 255, 0.3)',
  },
  speedValue: {
    fontSize: 56,
    fontWeight: 'bold',
    color: '#ffffff',
    letterSpacing: -2,
  },
  speedUnit: {
    fontSize: 16,
    color: '#00e5ff',
    fontWeight: '600',
    marginTop: -4,
  },
  // ── status bar ──
  statusBar: {
    width: '100%',
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: '#0d0d1f',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.06)',
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
  // ── info bar ──
  info: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    width: '100%',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#111',
  },
  infoItem: {
    alignItems: 'center',
    flex: 1,
  },
  infoLabel: {
    color: '#555',
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
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  // ── general ──
  msg: {
    color: '#aaa',
    fontSize: 16,
    marginBottom: 20,
  },
  btn: {
    backgroundColor: '#00e5ff',
    paddingHorizontal: 40,
    paddingVertical: 14,
    borderRadius: 30,
    marginVertical: 16,
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
