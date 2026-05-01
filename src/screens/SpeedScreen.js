import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import useSpeed from '../hooks/useSpeed';

export default function SpeedScreen() {
  const { speed, error, tracking, start, stop } = useSpeed();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Speed Tracker</Text>
      {error && <Text style={styles.error}>{error}</Text>}
      <Text style={styles.speed}>{Math.round(speed)}</Text>
      <Text style={styles.unit}>km/h</Text>
      <TouchableOpacity
        style={[styles.btn, tracking && styles.btnStop]}
        onPress={tracking ? stop : start}
      >
        <Text style={styles.btnText}>{tracking ? 'Stop' : 'Start'}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a1a',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 18,
    color: '#888',
    marginBottom: 20,
  },
  error: {
    color: '#ff1744',
    fontSize: 14,
    marginBottom: 12,
  },
  speed: {
    fontSize: 96,
    fontWeight: 'bold',
    color: '#00e5ff',
  },
  unit: {
    fontSize: 24,
    color: '#555',
    marginTop: 8,
  },
  btn: {
    marginTop: 40,
    backgroundColor: '#00e5ff',
    paddingHorizontal: 40,
    paddingVertical: 14,
    borderRadius: 30,
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
