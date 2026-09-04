// workout comparison screen comparing volume, duration, and exercise progress between two sessions

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useDatabase } from '../src/context/DatabaseContext';
import { useSettings } from '../src/context/SettingsContext';
import { useAppTheme } from '../src/context/ThemeContext';
import { WorkoutSession } from '../src/types/workout';
import { getSessionById } from '../src/database/queries/sessionQueries';
import { calculateElapsedTime } from '../src/utils/timer';
import { calculateSetVolume, formatWeight, convertKgToLb } from '../src/utils/calculations';

interface ExerciseComparisonData {
  exerciseId: string;
  exerciseName: string;
  primaryMuscle: string;
  sessionA?: {
    setsCount: number;
    maxWeightKg: number;
    volumeKg: number;
  };
  sessionB?: {
    setsCount: number;
    maxWeightKg: number;
    volumeKg: number;
  };
}

export default function WorkoutCompareScreen() {
  const { idA, idB } = useLocalSearchParams<{ idA: string; idB: string }>();
  const { db, isReady } = useDatabase();
  const { settings } = useSettings();
  const { colors } = useAppTheme();
  const router = useRouter();

  const [sessionA, setSessionA] = useState<WorkoutSession | null>(null);
  const [sessionB, setSessionB] = useState<WorkoutSession | null>(null);
  const [loading, setLoading] = useState(true);

  const isLb = settings.weightUnit === 'lb';

  useEffect(() => {
    if (!isReady || !db || !idA || !idB) return;
    let cancelled = false;

    (async () => {
      try {
        const [resA, resB] = await Promise.all([
          getSessionById(db, idA),
          getSessionById(db, idB),
        ]);
        if (!cancelled) {
          setSessionA(resA);
          setSessionB(resB);
        }
      } catch (err) {
        console.error('error loading sessions for comparison:', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isReady, db, idA, idB]);

  if (loading) {
    return (
      <View style={[styles.centerContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!sessionA || !sessionB) {
    return (
      <View style={[styles.centerContainer, { backgroundColor: colors.background }]}>
        <Text style={[styles.errorText, { color: colors.textMuted }]}>
          Unable to load one or both workouts for comparison.
        </Text>
        <TouchableOpacity
          style={[styles.backBtn, { backgroundColor: colors.cardAlt, borderColor: colors.border }]}
          onPress={() => router.back()}
        >
          <Text style={[styles.backBtnText, { color: colors.text }]}>GO BACK</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // compute overall metrics for session a
  let totalVolA = 0;
  let setsCountA = 0;
  sessionA.exercises.forEach((se) => {
    se.sets.forEach((s) => {
      if (s.completed && s.type !== 'WARMUP') {
        setsCountA++;
        if (se.includeInVolume !== false) {
          totalVolA += calculateSetVolume(s.type, s.weightKg, s.reps);
        }
      }
    });
  });

  // compute overall metrics for session b
  let totalVolB = 0;
  let setsCountB = 0;
  sessionB.exercises.forEach((se) => {
    se.sets.forEach((s) => {
      if (s.completed && s.type !== 'WARMUP') {
        setsCountB++;
        if (se.includeInVolume !== false) {
          totalVolB += calculateSetVolume(s.type, s.weightKg, s.reps);
        }
      }
    });
  });

  const durationA = calculateElapsedTime(sessionA.startedAt, sessionA.finishedAt);
  const durationB = calculateElapsedTime(sessionB.startedAt, sessionB.finishedAt);

  const dateA = new Date(sessionA.startedAt).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
  const dateB = new Date(sessionB.startedAt).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  // calculate volume delta from a to b
  const volDiffKg = totalVolB - totalVolA;
  const volPercentDiff = totalVolA > 0 ? ((volDiffKg / totalVolA) * 100).toFixed(1) : '0';
  const setsDiff = setsCountB - setsCountA;

  // build exercise comparison dictionary
  const exerciseMap = new Map<string, ExerciseComparisonData>();

  sessionA.exercises.forEach((se) => {
    let vol = 0;
    let maxW = 0;
    let count = 0;
    se.sets.forEach((s) => {
      if (s.completed && s.type !== 'WARMUP') {
        count++;
        vol += s.weightKg * s.reps;
        if (s.weightKg > maxW) maxW = s.weightKg;
      }
    });
    exerciseMap.set(se.exerciseId, {
      exerciseId: se.exerciseId,
      exerciseName: se.exerciseName || 'Exercise',
      primaryMuscle: se.primaryMuscle || 'OTHER',
      sessionA: { setsCount: count, maxWeightKg: maxW, volumeKg: vol },
    });
  });

  sessionB.exercises.forEach((se) => {
    let vol = 0;
    let maxW = 0;
    let count = 0;
    se.sets.forEach((s) => {
      if (s.completed && s.type !== 'WARMUP') {
        count++;
        vol += s.weightKg * s.reps;
        if (s.weightKg > maxW) maxW = s.weightKg;
      }
    });
    const existing = exerciseMap.get(se.exerciseId);
    if (existing) {
      existing.sessionB = { setsCount: count, maxWeightKg: maxW, volumeKg: vol };
    } else {
      exerciseMap.set(se.exerciseId, {
        exerciseId: se.exerciseId,
        exerciseName: se.exerciseName || 'Exercise',
        primaryMuscle: se.primaryMuscle || 'OTHER',
        sessionB: { setsCount: count, maxWeightKg: maxW, volumeKg: vol },
      });
    }
  });

  const comparisons = Array.from(exerciseMap.values());

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]} contentContainerStyle={styles.content}>
      {/* top side-by-side header cards */}
      <View style={styles.headerCardsRow}>
        {/* workout 1 card */}
        <View style={[styles.summaryCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.workoutBadge, { color: colors.secondary }]}>WORKOUT 1</Text>
          <Text style={[styles.workoutName, { color: colors.text }]} numberOfLines={1}>
            {sessionA.name}
          </Text>
          <Text style={[styles.dateSub, { color: colors.textMuted }]}>{dateA}</Text>
          <View style={styles.metricItem}>
            <Text style={[styles.metricLabel, { color: colors.textMuted }]}>Volume</Text>
            <Text style={[styles.metricValue, { color: colors.primary }]}>
              {formatWeight(Math.round(totalVolA), settings.weightUnit)}
            </Text>
          </View>
          <View style={styles.metricItem}>
            <Text style={[styles.metricLabel, { color: colors.textMuted }]}>Sets / Duration</Text>
            <Text style={[styles.metricSubValue, { color: colors.text }]}>
              {setsCountA} sets • {durationA}
            </Text>
          </View>
        </View>

        {/* workout 2 card */}
        <View style={[styles.summaryCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.workoutBadge, { color: colors.primary }]}>WORKOUT 2</Text>
          <Text style={[styles.workoutName, { color: colors.text }]} numberOfLines={1}>
            {sessionB.name}
          </Text>
          <Text style={[styles.dateSub, { color: colors.textMuted }]}>{dateB}</Text>
          <View style={styles.metricItem}>
            <Text style={[styles.metricLabel, { color: colors.textMuted }]}>Volume</Text>
            <Text style={[styles.metricValue, { color: colors.primary }]}>
              {formatWeight(Math.round(totalVolB), settings.weightUnit)}
            </Text>
          </View>
          <View style={styles.metricItem}>
            <Text style={[styles.metricLabel, { color: colors.textMuted }]}>Sets / Duration</Text>
            <Text style={[styles.metricSubValue, { color: colors.text }]}>
              {setsCountB} sets • {durationB}
            </Text>
          </View>
        </View>
      </View>

      {/* delta summary banner */}
      <View style={[styles.deltaBanner, { backgroundColor: colors.cardAlt, borderColor: colors.border }]}>
        <Text style={[styles.deltaTitle, { color: colors.text }]}>TOTAL VOLUME DELTA (W1 → W2)</Text>
        <Text
          style={[
            styles.deltaValue,
            { color: volDiffKg > 0 ? '#10b981' : volDiffKg < 0 ? '#ef4444' : colors.text },
          ]}
        >
          {volDiffKg > 0 ? `+${formatWeight(Math.round(volDiffKg), settings.weightUnit)} (+${volPercentDiff}%)` : volDiffKg < 0 ? `${formatWeight(Math.round(volDiffKg), settings.weightUnit)} (${volPercentDiff}%)` : 'Equal volume'}
        </Text>
        <Text style={[styles.deltaSubtitle, { color: colors.textMuted }]}>
          {setsDiff > 0 ? `+${setsDiff} more working sets` : setsDiff < 0 ? `${setsDiff} fewer working sets` : 'Same set count'}
        </Text>
      </View>

      {/* exercise breakdown header */}
      <Text style={[styles.sectionHeading, { color: colors.textMuted }]}>EXERCISE-BY-EXERCISE BREAKDOWN</Text>

      {comparisons.map((item) => {
        const a = item.sessionA;
        const b = item.sessionB;

        const volA = a ? Math.round(isLb ? convertKgToLb(a.volumeKg) : a.volumeKg) : 0;
        const volB = b ? Math.round(isLb ? convertKgToLb(b.volumeKg) : b.volumeKg) : 0;
        const exVolDiff = volB - volA;
        const exVolPct = volA > 0 ? ((exVolDiff / volA) * 100).toFixed(1) : null;

        const maxWeightA = a ? Math.round(isLb ? convertKgToLb(a.maxWeightKg) : a.maxWeightKg) : 0;
        const maxWeightB = b ? Math.round(isLb ? convertKgToLb(b.maxWeightKg) : b.maxWeightKg) : 0;
        const unit = isLb ? 'lb' : 'kg';

        return (
          <View
            key={item.exerciseId}
            style={[styles.exerciseCard, { backgroundColor: colors.card, borderColor: colors.border }]}
          >
            <View style={styles.exerciseHeader}>
              <Text style={[styles.exerciseTitle, { color: colors.text }]}>{item.exerciseName}</Text>
              <Text
                style={[
                  styles.muscleChip,
                  { backgroundColor: colors.cardAlt, color: colors.secondary, borderColor: colors.border },
                ]}
              >
                {item.primaryMuscle}
              </Text>
            </View>

            {a && b ? (
              // exercise in both sessions
              <View style={styles.comparisonGrid}>
                <View style={[styles.gridCol, { borderRightColor: colors.border, borderRightWidth: 1 }]}>
                  <Text style={[styles.gridColHeader, { color: colors.secondary }]}>WORKOUT 1</Text>
                  <Text style={[styles.gridRowText, { color: colors.text }]}>Sets: {a.setsCount}</Text>
                  <Text style={[styles.gridRowText, { color: colors.text }]}>Top: {maxWeightA} {unit}</Text>
                  <Text style={[styles.gridRowText, { color: colors.primary }]}>Vol: {volA} {unit}</Text>
                </View>

                <View style={styles.gridCol}>
                  <Text style={[styles.gridColHeader, { color: colors.primary }]}>WORKOUT 2</Text>
                  <Text style={[styles.gridRowText, { color: colors.text }]}>Sets: {b.setsCount}</Text>
                  <Text style={[styles.gridRowText, { color: colors.text }]}>Top: {maxWeightB} {unit}</Text>
                  <Text style={[styles.gridRowText, { color: colors.primary }]}>Vol: {volB} {unit}</Text>
                </View>
              </View>
            ) : a && !b ? (
              // only in workout 1
              <View style={styles.singleWorkoutBanner}>
                <Text style={[styles.singleWorkoutText, { color: colors.textMuted }]}>
                  Performed only in Workout 1 ({a.setsCount} sets • {volA} {unit} volume)
                </Text>
              </View>
            ) : (
              // only in workout 2
              <View style={styles.singleWorkoutBanner}>
                <Text style={[styles.singleWorkoutText, { color: colors.primary }]}>
                  Performed only in Workout 2 ({b!.setsCount} sets • {volB} {unit} volume)
                </Text>
              </View>
            )}

            {/* delta row when present in both */}
            {a && b && (
              <View style={[styles.exerciseDeltaRow, { backgroundColor: colors.cardAlt }]}>
                <Text style={[styles.exerciseDeltaLabel, { color: colors.textMuted }]}>Volume Change:</Text>
                <Text
                  style={[
                    styles.exerciseDeltaValue,
                    { color: exVolDiff > 0 ? '#10b981' : exVolDiff < 0 ? '#ef4444' : colors.text },
                  ]}
                >
                  {exVolDiff > 0 ? `+${exVolDiff} ${unit} (+${exVolPct}%)` : exVolDiff < 0 ? `${exVolDiff} ${unit} (${exVolPct}%)` : `0 ${unit} (Equal)`}
                </Text>
              </View>
            )}
          </View>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 50,
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  errorText: {
    fontSize: 15,
    textAlign: 'center',
    marginBottom: 16,
  },
  backBtn: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    borderWidth: 1,
  },
  backBtnText: {
    fontWeight: '800',
    fontSize: 13,
  },
  headerCardsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 14,
  },
  summaryCard: {
    flex: 1,
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
  },
  workoutBadge: {
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  workoutName: {
    fontSize: 15,
    fontWeight: '800',
    marginTop: 2,
  },
  dateSub: {
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 8,
  },
  metricItem: {
    marginTop: 6,
  },
  metricLabel: {
    fontSize: 10,
    fontWeight: '600',
  },
  metricValue: {
    fontSize: 16,
    fontWeight: '900',
  },
  metricSubValue: {
    fontSize: 12,
    fontWeight: '700',
    marginTop: 1,
  },
  deltaBanner: {
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    marginBottom: 18,
    alignItems: 'center',
  },
  deltaTitle: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  deltaValue: {
    fontSize: 18,
    fontWeight: '900',
    marginTop: 3,
  },
  deltaSubtitle: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
  },
  sectionHeading: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  exerciseCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    marginBottom: 12,
  },
  exerciseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  exerciseTitle: {
    fontSize: 14,
    fontWeight: '800',
    flex: 1,
  },
  muscleChip: {
    fontSize: 10,
    fontWeight: '700',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    overflow: 'hidden',
  },
  comparisonGrid: {
    flexDirection: 'row',
    marginVertical: 4,
  },
  gridCol: {
    flex: 1,
    paddingHorizontal: 8,
  },
  gridColHeader: {
    fontSize: 10,
    fontWeight: '800',
    marginBottom: 4,
    letterSpacing: 0.5,
  },
  gridRowText: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
  },
  singleWorkoutBanner: {
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  singleWorkoutText: {
    fontSize: 12,
    fontWeight: '600',
    fontStyle: 'italic',
  },
  exerciseDeltaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 8,
    marginTop: 8,
  },
  exerciseDeltaLabel: {
    fontSize: 11,
    fontWeight: '700',
  },
  exerciseDeltaValue: {
    fontSize: 12,
    fontWeight: '800',
  },
});
