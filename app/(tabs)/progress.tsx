// progress dashboard with statistics, muscle split, and exercise charts

import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useDatabase } from '../../src/context/DatabaseContext';
import { useSettings } from '../../src/context/SettingsContext';
import { useAppTheme } from '../../src/context/ThemeContext';
import {
  getProgressOverviewStats,
  getMuscleVolumeBreakdown,
  getOverallWorkoutVolumeHistory,
  getPerformedExercises,
  getExerciseChartHistory,
  ProgressOverviewStats,
  ChartDataPoint,
} from '../../src/database/queries/statsQueries';
import { getAllPersonalRecords } from '../../src/database/queries/prQueries';
import { Exercise, MuscleGroup, PersonalRecord } from '../../src/types/workout';
import { formatWeight } from '../../src/utils/calculations';
import { MuscleSplitChart } from '../../src/components/charts/MuscleSplitChart';
import { ProgressChart } from '../../src/components/charts/ProgressChart';

type TimePeriod = '1m' | '3m' | '6m' | '1y' | '2y' | 'ALL';

export default function ProgressScreen() {
  const { db, isReady, dataVersion } = useDatabase();
  const { settings } = useSettings();
  const { colors } = useAppTheme();

  const [period, setPeriod] = useState<TimePeriod>('3m');
  const [stats, setStats] = useState<ProgressOverviewStats | null>(null);
  const [muscleData, setMuscleData] = useState<Record<MuscleGroup, number> | null>(null);
  const [overallVolumeData, setOverallVolumeData] = useState<ChartDataPoint[]>([]);
  const [prs, setPrs] = useState<PersonalRecord[]>([]);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [selectedExerciseId, setSelectedExerciseId] = useState<string>('');
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [chartMetric, setChartMetric] = useState<'BEST_WEIGHT' | 'E1RM' | 'VOLUME'>('BEST_WEIGHT');
  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);
  const [loading, setLoading] = useState(true);

  const calculateStartDate = (p: TimePeriod): string | undefined => {
    if (p === 'ALL') return undefined;
    const now = new Date();
    if (p === '1m') now.setMonth(now.getMonth() - 1);
    if (p === '3m') now.setMonth(now.getMonth() - 3);
    if (p === '6m') now.setMonth(now.getMonth() - 6);
    if (p === '1y') now.setFullYear(now.getFullYear() - 1);
    if (p === '2y') now.setFullYear(now.getFullYear() - 2);
    return now.toISOString();
  };

  const loadProgressData = useCallback(async () => {
    if (!isReady || !db) return;
    try {
      const startDate = calculateStartDate(period);
      const overview = await getProgressOverviewStats(db, startDate);
      const muscleBreakdown = await getMuscleVolumeBreakdown(db, startDate);
      const overallVolPoints = await getOverallWorkoutVolumeHistory(db, startDate);
      const allPrs = await getAllPersonalRecords(db);
      const performedEx = await getPerformedExercises(db);

      setStats(overview);
      setMuscleData(muscleBreakdown);
      setOverallVolumeData(overallVolPoints);
      setPrs(allPrs);
      setExercises(performedEx);
      setSelectedExerciseId((prev) =>
        performedEx.some((e) => e.id === prev) ? prev : performedEx[0]?.id || ''
      );
      if (performedEx.length === 0) {
        setChartData([]);
      }
    } catch (err) {
      console.error('error loading progress dashboard data:', err);
    } finally {
      setLoading(false);
    }
  }, [isReady, db, period]);

  useFocusEffect(
    useCallback(() => {
      loadProgressData();
    }, [loadProgressData, dataVersion])
  );

  // reload chart data when selected exercise or metric changes
  useEffect(() => {
    if (db && selectedExerciseId) {
      getExerciseChartHistory(db, selectedExerciseId, chartMetric)
        .then((pts) => setChartData(pts))
        .catch((err) => console.error('error loading chart data:', err));
    }
  }, [db, selectedExerciseId, chartMetric]);

  if (loading) {
    return (
      <View style={[styles.centerContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const selectedExercise = exercises.find((e) => e.id === selectedExerciseId);

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]} contentContainerStyle={styles.content}>
      {/* time period filter buttons */}
      <View style={[styles.periodRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
        {(['1m', '3m', '6m', '1y', '2y', 'ALL'] as TimePeriod[]).map((p) => (
          <TouchableOpacity
            key={p}
            style={[styles.periodBtn, period === p && { backgroundColor: colors.primary }]}
            onPress={() => setPeriod(p)}
          >
            <Text
              style={[
                styles.periodText,
                { color: colors.textMuted },
                period === p && { color: colors.primaryText, fontWeight: '800' },
              ]}
            >
              {p.toUpperCase()}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* overview stats summary */}
      {stats && (
        <View style={[styles.overviewCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.cardHeaderTitle, { color: colors.textMuted }]}>TRAINING OVERVIEW</Text>

          <View style={styles.statsGrid}>
            <View style={[styles.gridBox, { backgroundColor: colors.cardAlt }]}>
              <Text style={[styles.gridLabel, { color: colors.textMuted }]}>Workouts</Text>
              <Text style={[styles.gridVal, { color: colors.text }]}>{stats.workoutCount}</Text>
            </View>

            <View style={[styles.gridBox, { backgroundColor: colors.cardAlt }]}>
              <Text style={[styles.gridLabel, { color: colors.textMuted }]}>Sets</Text>
              <Text style={[styles.gridVal, { color: colors.text }]}>{stats.workingSetsCount}</Text>
            </View>

            <View style={[styles.gridBox, { backgroundColor: colors.cardAlt }]}>
              <Text style={[styles.gridLabel, { color: colors.textMuted }]}>Total Volume</Text>
              <Text style={[styles.gridVal, { color: colors.primary }]}>
                {formatWeight(stats.totalVolumeKg, settings.weightUnit)}
              </Text>
            </View>

            <View style={[styles.gridBox, { backgroundColor: colors.cardAlt }]}>
              <Text style={[styles.gridLabel, { color: colors.textMuted }]}>PR Exercises</Text>
              <Text style={[styles.gridVal, { color: colors.secondary }]}>🏆 {stats.prCount}</Text>
            </View>
          </View>
        </View>
      )}

      {/* overall workout volume line graph */}
      <View style={styles.sectionHeaderRow}>
        <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>TOTAL WORKOUT VOLUME OVER TIME</Text>
      </View>
      <ProgressChart
        data={overallVolumeData}
        unit={settings.weightUnit}
        title="Workout Volume"
      />

      {/* muscle volume split */}
      {muscleData && <MuscleSplitChart data={muscleData} />}

      {/* exercise progression chart */}
      <View style={styles.sectionHeaderRow}>
        <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>EXERCISE PROGRESSION</Text>
      </View>

      {/* exercise dropdown picker */}
      {exercises.length === 0 ? (
        <View style={[styles.emptyPrCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.emptyPrText, { color: colors.textMuted }]}>No workouts recorded yet.</Text>
        </View>
      ) : (
        <>
          <TouchableOpacity
            style={[styles.dropdownTrigger, { backgroundColor: colors.card, borderColor: colors.border }]}
            onPress={() => setDropdownOpen(true)}
            activeOpacity={0.7}
          >
            <View style={styles.dropdownInfo}>
              <Text style={[styles.dropdownSubLabel, { color: colors.primary }]}>SELECTED EXERCISE</Text>
              <Text style={[styles.dropdownTitle, { color: colors.text }]}>
                {selectedExercise ? selectedExercise.name : 'Select performed exercise...'}
              </Text>
            </View>
            <View style={[styles.dropdownChevronCircle, { backgroundColor: colors.cardAlt }]}>
              <Text style={[styles.dropdownChevron, { color: colors.secondary }]}>▼</Text>
            </View>
          </TouchableOpacity>

          {/* exercise selector modal */}
          <Modal
            visible={dropdownOpen}
            transparent
            animationType="fade"
            onRequestClose={() => setDropdownOpen(false)}
          >
            <TouchableOpacity
              style={[styles.modalBackdrop, { backgroundColor: 'rgba(0,0,0,0.7)' }]}
              activeOpacity={1}
              onPress={() => setDropdownOpen(false)}
            >
              <View style={[styles.modalCard, { backgroundColor: colors.card, borderColor: colors.border }]} onStartShouldSetResponder={() => true}>
                <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
                  <Text style={[styles.modalTitle, { color: colors.text }]}>Select Performed Exercise</Text>
                  <TouchableOpacity onPress={() => setDropdownOpen(false)} style={styles.modalCloseBtn}>
                    <Text style={[styles.modalCloseText, { color: colors.textMuted }]}>✕</Text>
                  </TouchableOpacity>
                </View>
                <ScrollView style={styles.modalList} nestedScrollEnabled>
                  {exercises.map((ex) => {
                    const isSelected = selectedExerciseId === ex.id;
                    return (
                      <TouchableOpacity
                        key={ex.id}
                        style={[
                          styles.modalItem,
                          { backgroundColor: colors.cardAlt },
                          isSelected && { backgroundColor: colors.primary },
                        ]}
                        onPress={() => {
                          setSelectedExerciseId(ex.id);
                          setDropdownOpen(false);
                        }}
                      >
                        <View style={styles.modalItemLeft}>
                          <Text
                            style={[
                              styles.modalItemName,
                              { color: colors.text },
                              isSelected && { color: colors.primaryText, fontWeight: '800' },
                            ]}
                          >
                            {ex.name}
                          </Text>
                          {ex.primaryMuscle && (
                            <Text
                              style={[
                                styles.modalItemMuscle,
                                { color: colors.textMuted },
                                isSelected && { color: colors.primaryText },
                              ]}
                            >
                              {ex.primaryMuscle}
                            </Text>
                          )}
                        </View>
                        {isSelected && <Text style={[styles.modalCheckmark, { color: colors.primaryText }]}>✓</Text>}
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>
            </TouchableOpacity>
          </Modal>

          {/* metric selector buttons */}
          <View style={styles.metricRow}>
            {(['BEST_WEIGHT', 'E1RM', 'VOLUME'] as const).map((m) => (
              <TouchableOpacity
                key={m}
                style={[
                  styles.metricBtn,
                  { backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1 },
                  chartMetric === m && { backgroundColor: colors.secondary, borderColor: colors.secondary },
                ]}
                onPress={() => setChartMetric(m)}
              >
                <Text
                  style={[
                    styles.metricText,
                    { color: colors.textMuted },
                    chartMetric === m && { color: '#ffffff', fontWeight: '800' },
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
            title={selectedExercise ? selectedExercise.name : 'Progression'}
          />
        </>
      )}

      {/* personal records timeline */}
      <View style={styles.sectionHeaderRow}>
        <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>PERSONAL RECORDS (PRs)</Text>
      </View>

      {prs.length === 0 ? (
        <View style={[styles.emptyPrCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.emptyPrText, { color: colors.textMuted }]}>No PRs recorded yet. Complete workouts to earn PRs!</Text>
        </View>
      ) : (
        prs.slice(0, 15).map((pr) => (
          <View key={pr.id} style={[styles.prCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={styles.prTrophy}>🏆</Text>
            <View style={styles.prDetails}>
              <Text style={[styles.prExName, { color: colors.text }]}>{pr.exerciseName}</Text>
              <Text style={[styles.prType, { color: colors.primary }]}>
                {pr.recordType === 'MAX_WEIGHT'
                  ? `Heaviest Weight: ${formatWeight(pr.value, settings.weightUnit)}`
                  : pr.recordType === 'MAX_E1RM'
                  ? `Best e1RM: ${formatWeight(pr.value, settings.weightUnit)}`
                  : `Max Reps: ${pr.reps} reps @ ${formatWeight(pr.weightKg || 0, settings.weightUnit)}`}
              </Text>
            </View>
            <Text style={[styles.prDate, { color: colors.textSubtle }]}>
              {new Date(pr.achievedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            </Text>
          </View>
        ))
      )}
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
  },
  periodRow: {
    flexDirection: 'row',
    borderRadius: 10,
    padding: 4,
    marginBottom: 16,
    borderWidth: 1,
  },
  periodBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 8,
  },
  periodText: {
    fontSize: 12,
    fontWeight: '800',
  },
  overviewCard: {
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
  },
  cardHeaderTitle: {
    fontSize: 12,
    fontWeight: '800',
    marginBottom: 12,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  gridBox: {
    flex: 1,
    minWidth: '45%',
    borderRadius: 10,
    padding: 12,
  },
  gridLabel: {
    fontSize: 11,
    fontWeight: '600',
  },
  gridVal: {
    fontSize: 18,
    fontWeight: '800',
    marginTop: 4,
  },
  sectionHeaderRow: {
    marginBottom: 10,
    marginTop: 6,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  dropdownTrigger: {
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
  },
  dropdownInfo: {
    flex: 1,
  },
  dropdownSubLabel: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  dropdownTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginTop: 2,
  },
  dropdownChevronCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 10,
  },
  dropdownChevron: {
    fontSize: 11,
  },
  modalBackdrop: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    width: '100%',
    maxHeight: '70%',
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  modalCloseBtn: {
    padding: 4,
  },
  modalCloseText: {
    fontSize: 18,
    fontWeight: '700',
  },
  modalList: {
    padding: 8,
  },
  modalItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 10,
    marginBottom: 4,
  },
  modalItemLeft: {
    flex: 1,
  },
  modalItemName: {
    fontSize: 14,
    fontWeight: '600',
  },
  modalItemMuscle: {
    fontSize: 11,
    fontWeight: '500',
    marginTop: 2,
  },
  modalCheckmark: {
    fontSize: 16,
    fontWeight: '900',
  },
  metricRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  metricBtn: {
    flex: 1,
    paddingVertical: 6,
    borderRadius: 8,
    alignItems: 'center',
  },
  metricText: {
    fontSize: 11,
    fontWeight: '700',
  },
  emptyPrCard: {
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1,
  },
  emptyPrText: {
    fontSize: 14,
  },
  prCard: {
    borderRadius: 12,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    borderWidth: 1,
  },
  prTrophy: {
    fontSize: 22,
    marginRight: 12,
  },
  prDetails: {
    flex: 1,
  },
  prExName: {
    fontSize: 15,
    fontWeight: '700',
  },
  prType: {
    fontSize: 13,
    fontWeight: '600',
    marginTop: 2,
  },
  prDate: {
    fontSize: 12,
    fontWeight: '600',
  },
});
