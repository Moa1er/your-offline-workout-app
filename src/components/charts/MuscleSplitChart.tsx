// horizontal bar chart for weekly muscle group working sets breakdown

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { MuscleGroup } from '../../types/workout';

interface MuscleSplitChartProps {
  data: Record<MuscleGroup, number>;
}

export const MuscleSplitChart: React.FC<MuscleSplitChartProps> = React.memo(({ data }) => {
  // filter active muscles with > 0 sets
  const activeMuscles = (Object.keys(data) as MuscleGroup[])
    .map((m) => ({ muscle: m, sets: data[m] }))
    .filter((item) => item.sets > 0)
    .sort((a, b) => b.sets - a.sets);

  const maxSets = Math.max(...activeMuscles.map((m) => m.sets), 1);

  if (activeMuscles.length === 0) {
    return (
      <View style={styles.emptyCard}>
        <Text style={styles.emptyText}>No working sets logged for this period.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>MUSCLE VOLUME SPLIT</Text>
      {activeMuscles.map((item) => {
        const percentage = Math.round((item.sets / maxSets) * 100);
        return (
          <View key={item.muscle} style={styles.row}>
            <View style={styles.labelContainer}>
              <Text style={styles.muscleName}>{item.muscle.replaceAll('_', ' ')}</Text>
              <Text style={styles.setsText}>{item.sets} sets</Text>
            </View>
            <View style={styles.barBackground}>
              <View style={[styles.barFill, { width: `${percentage}%` }]} />
            </View>
          </View>
        );
      })}
    </View>
  );
});
MuscleSplitChart.displayName = 'MuscleSplitChart';

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  title: {
    color: '#94a3b8',
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 12,
  },
  emptyCard: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyText: {
    color: '#64748b',
    fontSize: 14,
  },
  row: {
    marginBottom: 10,
  },
  labelContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  muscleName: {
    color: '#f8fafc',
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  setsText: {
    color: '#38bdf8',
    fontSize: 13,
    fontWeight: '700',
  },
  barBackground: {
    height: 8,
    backgroundColor: '#0f172a',
    borderRadius: 4,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    backgroundColor: '#6366f1',
    borderRadius: 4,
  },
});
