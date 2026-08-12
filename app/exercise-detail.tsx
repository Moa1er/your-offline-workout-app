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
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#6366f1" />
      </View>
    );
  }

  if (!exercise) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>Exercise not found.</Text>
      </View>
    );
  }

  const maxWeightPr = prs.find((p) => p.recordType === 'MAX_WEIGHT');
  const maxE1rmPr = prs.find((p) => p.recordType === 'MAX_E1RM');

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.headerCard}>
        <Text style={styles.exName}>{exercise.name}</Text>
        <View style={styles.badgeRow}>
          <Text style={styles.primaryBadge}>{exercise.primaryMuscle}</Text>
          <Text style={styles.eqBadge}>{exercise.equipment}</Text>
        </View>

        {exercise.notes && <Text style={styles.notesText}>{exercise.notes}</Text>}

        <View style={styles.statsGrid}>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>Best Weight</Text>
            <Text style={styles.statVal}>
              {maxWeightPr ? formatWeight(maxWeightPr.value, settings.weightUnit) : '-'}
            </Text>
          </View>

          <View style={styles.statBox}>
            <Text style={styles.statLabel}>Est 1RM</Text>
            <Text style={styles.statVal}>
              {maxE1rmPr ? formatWeight(maxE1rmPr.value, settings.weightUnit) : '-'}
            </Text>
          </View>

          <View style={styles.statBox}>
            <Text style={styles.statLabel}>Total Sessions</Text>
            <Text style={styles.statVal}>{chartData.length}</Text>
          </View>
        </View>
      </View>

      {/* chart metric selector */}
      <View style={styles.metricRow}>
        {(['BEST_WEIGHT', 'E1RM', 'VOLUME'] as const).map((m) => (
          <TouchableOpacity
            key={m}
            style={[styles.metricBtn, metric === m && styles.metricBtnActive]}
            onPress={() => setMetric(m)}
          >
            <Text style={[styles.metricText, metric === m && styles.metricTextActive]}>
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
    backgroundColor: '#0f172a',
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0f172a',
    padding: 24,
  },
  errorText: {
    color: '#ef4444',
    fontSize: 16,
  },
  headerCard: {
    backgroundColor: '#1e293b',
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#334155',
  },
  exName: {
    color: '#f8fafc',
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
    color: '#38bdf8',
    backgroundColor: '#0c4a6e',
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 6,
    fontSize: 11,
    fontWeight: '700',
  },
  eqBadge: {
    color: '#cbd5e1',
    backgroundColor: '#334155',
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 6,
    fontSize: 11,
    fontWeight: '700',
  },
  notesText: {
    color: '#94a3b8',
    fontSize: 13,
    fontStyle: 'italic',
    marginBottom: 12,
  },
  statsGrid: {
    flexDirection: 'row',
    backgroundColor: '#0f172a',
    borderRadius: 10,
    padding: 12,
  },
  statBox: {
    flex: 1,
  },
  statLabel: {
    color: '#64748b',
    fontSize: 11,
    fontWeight: '600',
  },
  statVal: {
    color: '#f8fafc',
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
    backgroundColor: '#1e293b',
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
  },
  metricBtnActive: {
    backgroundColor: '#334155',
  },
  metricText: {
    color: '#64748b',
    fontSize: 11,
    fontWeight: '700',
  },
  metricTextActive: {
    color: '#38bdf8',
  },
});
