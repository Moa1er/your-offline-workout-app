// exercise detail page with stats summary, 1rm, best weight, and historical performance

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useDatabase } from '../src/context/DatabaseContext';
import { useSettings } from '../src/context/SettingsContext';
import { useAppTheme } from '../src/context/ThemeContext';
import { Exercise, PersonalRecord } from '../src/types/workout';
import { getExerciseById } from '../src/database/queries/exerciseQueries';
import { getPersonalRecordsForExercise } from '../src/database/queries/prQueries';
import { getExerciseChartHistory, ChartDataPoint } from '../src/database/queries/statsQueries';
import { formatWeight } from '../src/utils/calculations';
import { ProgressChart } from '../src/components/charts/ProgressChart';

export default function ExerciseDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { db, isReady } = useDatabase();
  const { settings } = useSettings();
  const { colors } = useAppTheme();

  const [exercise, setExercise] = useState<Exercise | null>(null);
  const [prs, setPrs] = useState<PersonalRecord[]>([]);
  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);
  const [metric, setMetric] = useState<'BEST_WEIGHT' | 'E1RM' | 'VOLUME'>('BEST_WEIGHT');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!db || !isReady || !id) return;
    Promise.all([
      getExerciseById(db, id),
      getPersonalRecordsForExercise(db, id),
      getExerciseChartHistory(db, id, metric),
    ]).then(([exData, prData, chartPts]) => {
      setExercise(exData);
      setPrs(prData);
      setChartData(chartPts);
      setLoading(false);
    });
  }, [db, isReady, id, metric]);

  if (loading) {
    return (
      <View style={[styles.centerContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!exercise) {
    return (
      <View style={[styles.centerContainer, { backgroundColor: colors.background }]}>
        <Text style={[styles.errorText, { color: colors.danger }]}>Exercise not found.</Text>
      </View>
    );
  }

  const maxWeightPr = prs.find((p) => p.recordType === 'MAX_WEIGHT');
  const maxE1rmPr = prs.find((p) => p.recordType === 'MAX_E1RM');

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]} contentContainerStyle={styles.content}>
      <View style={[styles.headerCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.exName, { color: colors.text }]}>{exercise.name}</Text>
        <View style={styles.badgeRow}>
          <Text style={[styles.primaryBadge, { backgroundColor: colors.cardAlt, color: colors.secondary, borderColor: colors.border }]}>
            {exercise.primaryMuscle}
          </Text>
          <Text style={[styles.eqBadge, { backgroundColor: colors.cardAlt, color: colors.textMuted, borderColor: colors.border }]}>
            {exercise.equipment}
          </Text>
        </View>

        {exercise.notes ? <Text style={[styles.notesText, { color: colors.textMuted }]}>{exercise.notes}</Text> : null}

        <View style={[styles.statsGrid, { backgroundColor: colors.cardAlt }]}>
          <View style={styles.statBox}>
            <Text style={[styles.statLabel, { color: colors.textMuted }]}>Best Weight</Text>
            <Text style={[styles.statVal, { color: colors.primary }]}>
              {maxWeightPr ? formatWeight(maxWeightPr.value, settings.weightUnit) : '-'}
            </Text>
          </View>

          <View style={styles.statBox}>
            <Text style={[styles.statLabel, { color: colors.textMuted }]}>Est 1RM</Text>
            <Text style={[styles.statVal, { color: colors.secondary }]}>
              {maxE1rmPr ? formatWeight(maxE1rmPr.value, settings.weightUnit) : '-'}
            </Text>
          </View>

          <View style={styles.statBox}>
            <Text style={[styles.statLabel, { color: colors.textMuted }]}>Total Sessions</Text>
            <Text style={[styles.statVal, { color: colors.text }]}>{chartData.length}</Text>
          </View>
        </View>
      </View>

      {/* chart metric selector */}
      <View style={styles.metricRow}>
        {(['BEST_WEIGHT', 'E1RM', 'VOLUME'] as const).map((m) => (
          <TouchableOpacity
            key={m}
            style={[
              styles.metricBtn,
              { backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1 },
              metric === m && { backgroundColor: colors.secondary, borderColor: colors.secondary },
            ]}
            onPress={() => setMetric(m)}
          >
            <Text
              style={[
                styles.metricText,
                { color: colors.textMuted },
                metric === m && { color: '#ffffff', fontWeight: '800' },
              ]}
            >
              {m === 'BEST_WEIGHT' ? 'BEST WEIGHT' : m === 'E1RM' ? 'EST 1RM' : 'VOLUME'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* line chart */}
      <ProgressChart
        data={chartData}
        unit={settings.weightUnit}
        title={`${exercise.name} Progression`}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  errorText: {
    fontSize: 16,
  },
  headerCard: {
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
  },
  exName: {
    fontSize: 22,
    fontWeight: '800',
  },
  badgeRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 6,
    marginBottom: 10,
  },
  primaryBadge: {
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 6,
    fontSize: 11,
    fontWeight: '700',
    borderWidth: 1,
  },
  eqBadge: {
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 6,
    fontSize: 11,
    fontWeight: '700',
    borderWidth: 1,
  },
  notesText: {
    fontSize: 13,
    fontStyle: 'italic',
    marginBottom: 12,
  },
  statsGrid: {
    flexDirection: 'row',
    borderRadius: 10,
    padding: 12,
  },
  statBox: {
    flex: 1,
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '600',
  },
  statVal: {
    fontSize: 16,
    fontWeight: '800',
    marginTop: 2,
  },
  metricRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  metricBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
  },
  metricText: {
    fontSize: 11,
    fontWeight: '700',
  },
});
