// SpeedInfo.js
// Displays supplementary speed info (max speed, avg speed, distance, etc.)
// TODO: Implement stat tracking logic

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function SpeedInfo({ maxSpeed = 0, avgSpeed = 0, distance = 0 }) {
  return (
    <View style={styles.container}>
      <InfoCard label="Max Speed" value={`${Math.round(maxSpeed)} km/h`} />
      <InfoCard label="Avg Speed" value={`${Math.round(avgSpeed)} km/h`} />
      <InfoCard label="Distance" value={`${distance.toFixed(2)} km`} />
    </View>
  );
}

function InfoCard({ label, value }) {
  return (
    <View style={styles.card}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    paddingHorizontal: 16,
    marginTop: 40,
  },
  card: {
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    minWidth: 100,
  },
  label: {
    fontSize: 11,
    color: '#888',
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  value: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
});
