// Speedometer.js
// Reusable speedometer gauge component
// TODO: Build a visual speedometer gauge (circular/arc display)

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function Speedometer({ speed = 0 }) {
  return (
    <View style={styles.container}>
      <Text style={styles.speed}>{Math.round(speed)}</Text>
      <Text style={styles.unit}>km/h</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 250,
    height: 250,
    borderRadius: 125,
    borderWidth: 4,
    borderColor: '#00e5ff',
    backgroundColor: 'rgba(0, 229, 255, 0.05)',
  },
  speed: {
    fontSize: 72,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  unit: {
    fontSize: 18,
    color: '#00e5ff',
    marginTop: 4,
  },
});
