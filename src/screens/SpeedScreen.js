// SpeedScreen.js
// Main screen — displays real-time speed from GPS (and optionally accelerometer)
// TODO: Implement GPS speed tracking with expo-location
// TODO: Implement accelerometer enhancement with expo-sensors

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function SpeedScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Speed Tracker</Text>
      <Text style={styles.speed}>0</Text>
      <Text style={styles.unit}>km/h</Text>
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
});
