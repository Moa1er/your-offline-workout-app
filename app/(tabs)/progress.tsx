// progress dashboard with statistics, muscle split, and exercise charts

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { useDatabase } from '../../src/context/DatabaseContext';
import { useSettings } from '../../src/context/SettingsContext';
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

  useEffect(() => {
    if (!isReady || !db) return;
    let cancelled = false;
    (async () => {
      try {
        const startDate = calculateStartDate(period);
        const overview = await getProgressOverviewStats(db, startDate);
        const muscleBreakdown = await getMuscleVolumeBreakdown(db, startDate);
        const overallVolPoints = await getOverallWorkoutVolumeHistory(db, startDate);
        const allPrs = await getAllPersonalRecords(db);
        // fetch only exercises with recorded history
        const performedEx = await getPerformedExercises(db);

        if (cancelled) return;
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
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isReady, db, period, dataVersion]);

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
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#6366f1" />
      </View>
    );
  }

  const selectedExercise = exercises.find((e) => e.id === selectedExerciseId);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* time period filter buttons */}
      <View style={styles.periodRow}>
        {(['1m', '3m', '6m', '1y', '2y', 'ALL'] as TimePeriod[]).map((p) => (
          <TouchableOpacity
            key={p}
            style={[styles.periodBtn, period === p && styles.periodBtnActive]}
            onPress={() => setPeriod(p)}
          >
            <Text style={[styles.periodText, period === p && styles.periodTextActive]}>
              {p.toUpperCase()}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* overview stats summary */}
      {stats && (
        <View style={styles.overviewCard}>
          <Text style={styles.cardHeaderTitle}>TRAINING OVERVIEW</Text>

          <View style={styles.statsGrid}>
            <View style={styles.gridBox}>
              <Text style={styles.gridLabel}>Workouts</Text>
              <Text style={styles.gridVal}>{stats.workoutCount}</Text>
            </View>

            <View style={styles.gridBox}>
              <Text style={styles.gridLabel}>Working Sets</Text>
              <Text style={styles.gridVal}>{stats.workingSetsCount}</Text>
            </View>

            <View style={styles.gridBox}>
              <Text style={styles.gridLabel}>Total Volume</Text>
              <Text style={styles.gridVal}>
                {formatWeight(stats.totalVolumeKg, settings.weightUnit)}
              </Text>
            </View>

            <View style={styles.gridBox}>
              <Text style={styles.gridLabel}>PR Exercises</Text>
              <Text style={[styles.gridVal, { color: '#10b981' }]}>🏆 {stats.prCount}</Text>
            </View>
          </View>
        </View>
      )}

      {/* overall workout volume line graph */}
      <View style={styles.sectionHeaderRow}>
        <Text style={styles.sectionTitle}>TOTAL WORKOUT VOLUME OVER TIME</Text>
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
        <Text style={styles.sectionTitle}>EXERCISE PROGRESSION</Text>
      </View>

      {/* exercise dropdown picker */}
      {exercises.length === 0 ? (
        <View style={styles.emptyPrCard}>
          <Text style={styles.emptyPrText}>No workouts recorded yet.</Text>
        </View>
      ) : (
        <>
          <TouchableOpacity
            style={styles.dropdownTrigger}
            onPress={() => setDropdownOpen(true)}
            activeOpacity={0.7}
          >
            <View style={styles.dropdownInfo}>
              <Text style={styles.dropdownSubLabel}>SELECTED EXERCISE</Text>
              <Text style={styles.dropdownTitle}>
                {selectedExercise ? selectedExercise.name : 'Select performed exercise...'}
              </Text>
            </View>
            <View style={styles.dropdownChevronCircle}>
              <Text style={styles.dropdownChevron}>▼</Text>
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
              style={styles.modalBackdrop}
              activeOpacity={1}
              onPress={() => setDropdownOpen(false)}
            >
              <View style={styles.modalCard} onStartShouldSetResponder={() => true}>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>Select Performed Exercise</Text>
                  <TouchableOpacity onPress={() => setDropdownOpen(false)} style={styles.modalCloseBtn}>
                    <Text style={styles.modalCloseText}>✕</Text>
                  </TouchableOpacity>
                </View>
                <ScrollView style={styles.modalList} nestedScrollEnabled>
                  {exercises.map((ex) => {
                    const isSelected = selectedExerciseId === ex.id;
                    return (
                      <TouchableOpacity
                        key={ex.id}
                        style={[styles.modalItem, isSelected && styles.modalItemActive]}
                        onPress={() => {
                          setSelectedExerciseId(ex.id);
                          setDropdownOpen(false);
                        }}
                      >
                        <View style={styles.modalItemLeft}>
                          <Text style={[styles.modalItemName, isSelected && styles.modalItemNameActive]}>
                            {ex.name}
                          </Text>
                          {ex.primaryMuscle && (
                            <Text style={styles.modalItemMuscle}>{ex.primaryMuscle}</Text>
                          )}
                        </View>
                        {isSelected && <Text style={styles.modalCheckmark}>✓</Text>}
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
                style={[styles.metricBtn, chartMetric === m && styles.metricBtnActive]}
                onPress={() => setChartMetric(m)}
              >
                <Text style={[styles.metricText, chartMetric === m && styles.metricTextActive]}>
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
        <Text style={styles.sectionTitle}>PERSONAL RECORDS (PRs)</Text>
      </View>

      {prs.length === 0 ? (
        <View style={styles.emptyPrCard}>
          <Text style={styles.emptyPrText}>No PRs recorded yet. Complete workouts to earn PRs!</Text>
        </View>
      ) : (
        prs.slice(0, 15).map((pr) => (
          <View key={pr.id} style={styles.prCard}>
            <Text style={styles.prTrophy}>🏆</Text>
            <View style={styles.prDetails}>
              <Text style={styles.prExName}>{pr.exerciseName}</Text>
              <Text style={styles.prType}>
                {pr.recordType === 'MAX_WEIGHT'
                  ? `Heaviest Weight: ${formatWeight(pr.value, settings.weightUnit)}`
                  : pr.recordType === 'MAX_E1RM'
                  ? `Best e1RM: ${formatWeight(pr.value, settings.weightUnit)}`
                  : `Max Reps: ${pr.reps} reps @ ${formatWeight(pr.weightKg || 0, settings.weightUnit)}`}
              </Text>
            </View>
            <Text style={styles.prDate}>
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
  },
  periodRow: {
    flexDirection: 'row',
    backgroundColor: '#1e293b',
    borderRadius: 10,
    padding: 4,
    marginBottom: 16,
  },
  periodBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 8,
  },
  periodBtnActive: {
    backgroundColor: '#6366f1',
  },
  periodText: {
    color: '#64748b',
    fontSize: 12,
    fontWeight: '800',
  },
  periodTextActive: {
    color: '#ffffff',
  },
  overviewCard: {
    backgroundColor: '#1e293b',
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
  },
  cardHeaderTitle: {
    color: '#94a3b8',
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
    backgroundColor: '#0f172a',
    borderRadius: 10,
    padding: 12,
  },
  gridLabel: {
    color: '#64748b',
    fontSize: 11,
    fontWeight: '600',
  },
  gridVal: {
    color: '#f8fafc',
    fontSize: 18,
    fontWeight: '800',
    marginTop: 4,
  },
  sectionHeaderRow: {
    marginBottom: 10,
    marginTop: 6,
  },
  sectionTitle: {
    color: '#64748b',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  dropdownTrigger: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#334155',
  },
  dropdownInfo: {
    flex: 1,
  },
  dropdownSubLabel: {
    color: '#6366f1',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  dropdownTitle: {
    color: '#f8fafc',
    fontSize: 15,
    fontWeight: '700',
    marginTop: 2,
  },
  dropdownChevronCircle: {
    backgroundColor: '#334155',
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 10,
  },
  dropdownChevron: {
    color: '#38bdf8',
    fontSize: 11,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    width: '100%',
    maxHeight: '70%',
    backgroundColor: '#1e293b',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#334155',
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  modalTitle: {
    color: '#f8fafc',
    fontSize: 16,
    fontWeight: '800',
  },
  modalCloseBtn: {
    padding: 4,
  },
  modalCloseText: {
    color: '#94a3b8',
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
  modalItemActive: {
    backgroundColor: '#312e81',
  },
  modalItemLeft: {
    flex: 1,
  },
  modalItemName: {
    color: '#cbd5e1',
    fontSize: 14,
    fontWeight: '600',
  },
  modalItemNameActive: {
    color: '#ffffff',
    fontWeight: '800',
  },
  modalItemMuscle: {
    color: '#64748b',
    fontSize: 11,
    fontWeight: '500',
    marginTop: 2,
  },
  modalCheckmark: {
    color: '#38bdf8',
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
    backgroundColor: '#1e293b',
    paddingVertical: 6,
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
  emptyPrCard: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyPrText: {
    color: '#64748b',
    fontSize: 14,
  },
  prCard: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#334155',
  },
  prTrophy: {
    fontSize: 22,
    marginRight: 12,
  },
  prDetails: {
    flex: 1,
  },
  prExName: {
    color: '#f8fafc',
    fontSize: 15,
    fontWeight: '700',
  },
  prType: {
    color: '#10b981',
    fontSize: 13,
    fontWeight: '600',
    marginTop: 2,
  },
  prDate: {
    color: '#64748b',
    fontSize: 12,
    fontWeight: '600',
  },
});
