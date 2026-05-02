import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS } from '../constants/theme';

export default function HomeScreen({ navigation, route }) {
  const results = route.params?.results || null;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Speed Tracker</Text>
        <Text style={styles.subtitle}>CV-Based Motion Detection</Text>
      </View>

      {results && (
        <View style={styles.resultsCard}>
          <Text style={styles.resultsTitle}>Last Session</Text>
          <View style={styles.statsRow}>
            <StatItem label="AVG SPEED" value={`${results.avgSpeed} km/h`} />
            <View style={styles.statDivider} />
            <StatItem label="MAX SPEED" value={`${results.maxSpeed} km/h`} />
          </View>
          <View style={styles.statsRow}>
            <StatItem label="FRAMES" value={`${results.totalFrames}`} />
            <View style={styles.statDivider} />
            <StatItem label="DURATION" value={`${results.duration}s`} />
          </View>
        </View>
      )}

      <View style={styles.bottom}>
        <TouchableOpacity
          style={styles.startBtn}
          activeOpacity={0.8}
          onPress={() => navigation.navigate('Camera')}
        >
          <View style={styles.startBtnInner}>
            <Text style={styles.startIcon}>▶</Text>
          </View>
        </TouchableOpacity>
        <Text style={styles.startLabel}>Start Tracking</Text>
      </View>
    </SafeAreaView>
  );
}

function StatItem({ label, value }) {
  return (
    <View style={styles.statItem}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 40,
  },
  header: {
    alignItems: 'center',
    marginTop: 40,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
    letterSpacing: 1,
  },
  subtitle: {
    fontSize: 14,
    color: COLORS.textMuted,
    marginTop: 8,
  },
  resultsCard: {
    width: '85%',
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  resultsTitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: 16,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    marginVertical: 8,
  },
  statDivider: {
    width: 1,
    height: 36,
    backgroundColor: COLORS.border,
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statLabel: {
    fontSize: 10,
    color: COLORS.textMuted,
    fontWeight: '600',
    letterSpacing: 1,
    marginBottom: 4,
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  bottom: {
    alignItems: 'center',
    marginBottom: 20,
  },
  startBtn: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: COLORS.primaryDim,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: COLORS.primary,
  },
  startBtnInner: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  startIcon: {
    fontSize: 28,
    color: COLORS.background,
    marginLeft: 4,
  },
  startLabel: {
    marginTop: 16,
    fontSize: 16,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
});
