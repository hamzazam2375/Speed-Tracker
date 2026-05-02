import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS } from '../constants/theme';

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
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    borderRadius: 20,
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderWidth: 1,
    borderColor: 'rgba(0, 229, 255, 0.3)',
  },
  speed: {
    fontSize: 56,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
    letterSpacing: -2,
  },
  unit: {
    fontSize: 16,
    color: COLORS.primary,
    fontWeight: '600',
    marginTop: -4,
  },
});
