// horizontal bar chart for weekly muscle group working sets breakdown

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { MuscleGroup } from '../../types/workout';
import { useAppTheme } from '../../context/ThemeContext';

interface MuscleSplitChartProps {
  data: Record<MuscleGroup, number>;
}

export const MuscleSplitChart: React.FC<MuscleSplitChartProps> = React.memo(({ data }) => {
  const { colors } = useAppTheme();

  // filter active muscles with > 0 sets
  const activeMuscles = (Object.keys(data) as MuscleGroup[])
    .map((m) => ({ muscle: m, sets: data[m] }))
    .filter((item) => item.sets > 0)
    .sort((a, b) => b.sets - a.sets);

  const maxSets = Math.max(...activeMuscles.map((m) => m.sets), 1);

  if (activeMuscles.length === 0) {
    return (
      <View style={[styles.emptyCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.emptyText, { color: colors.textMuted }]}>No sets logged for this period.</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <Text style={[styles.title, { color: colors.textMuted }]}>MUSCLE VOLUME SPLIT</Text>
      {activeMuscles.map((item) => {
        const percentage = Math.round((item.sets / maxSets) * 100);
        return (
          <View key={item.muscle} style={styles.row}>
            <View style={styles.labelContainer}>
              <Text style={[styles.muscleName, { color: colors.text }]}>{item.muscle.replaceAll('_', ' ')}</Text>
              <Text style={[styles.setsText, { color: colors.secondary }]}>{item.sets} sets</Text>
            </View>
            <View style={[styles.barBackground, { backgroundColor: colors.cardAlt }]}>
              <View style={[styles.barFill, { width: `${percentage}%`, backgroundColor: colors.primary }]} />
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
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
  },
  title: {
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  emptyCard: {
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1,
  },
  emptyText: {
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
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  setsText: {
    fontSize: 13,
    fontWeight: '700',
  },
  barBackground: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 4,
  },
});
