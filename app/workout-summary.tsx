// post-workout summary screen celebrating session completion, volume records, and prs

import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { useDatabase } from '../src/context/DatabaseContext';
import { useSettings } from '../src/context/SettingsContext';
import { useAppTheme } from '../src/context/ThemeContext';
import { WorkoutSession } from '../src/types/workout';
import { getAllCompletedSessions } from '../src/database/queries/sessionQueries';
import { calculateElapsedTime } from '../src/utils/timer';
import { calculateSetVolume, formatWeight } from '../src/utils/calculations';
import {
  getExerciseHistoricalBest,
  getSessionHistoricalBest,
  HitRecordInfo,
} from '../src/utils/recordDetector';
import { RecordDetailModal } from '../src/components/RecordDetailModal';

export default function WorkoutSummaryScreen() {
  const { db, isReady } = useDatabase();
  const { settings } = useSettings();
  const { colors } = useAppTheme();
  const router = useRouter();

  const [lastSession, setLastSession] = useState<WorkoutSession | null>(null);
  const [recordsHit, setRecordsHit] = useState<HitRecordInfo[]>([]);
  const [selectedRecord, setSelectedRecord] = useState<HitRecordInfo | null>(null);

  useEffect(() => {
    if (!isReady || !db) return;
    let cancelled = false;

    (async () => {
      const sessions = await getAllCompletedSessions(db);
      if (cancelled || sessions.length === 0) return;
      const session = sessions[0];
      setLastSession(session);

      // detect all records achieved in this session
      const records: HitRecordInfo[] = [];

      // 1. check total session volume record
      let totalSessionVol = 0;
      session.exercises.forEach((se) => {
        if (se.includeInVolume !== false) {
          se.sets.forEach((st) => {
            if (st.completed && st.type !== 'WARMUP') {
              totalSessionVol += st.weightKg * st.reps;
            }
          });
        }
      });

      const sessionHist = await getSessionHistoricalBest(db, session.id);
      if (sessionHist.maxSessionVolume > 0 && totalSessionVol > sessionHist.maxSessionVolume) {
        records.push({
          type: 'SESSION_VOLUME',
          title: 'All-Time Workout Volume Record',
          badge: '🏆 SESSION VOLUME',
          currentValue: totalSessionVol,
          previousBest: sessionHist.maxSessionVolume,
          improvement: totalSessionVol - sessionHist.maxSessionVolume,
          improvementPercent:
            ((totalSessionVol - sessionHist.maxSessionVolume) / sessionHist.maxSessionVolume) * 100,
        });
      }

      // 2. check exercise volume records and set records
      for (const se of session.exercises) {
        const exVol = se.sets
          .filter((st) => st.completed && st.type !== 'WARMUP' && se.includeInVolume !== false)
          .reduce((sum, st) => sum + st.weightKg * st.reps, 0);

        const exHist = await getExerciseHistoricalBest(db, se.exerciseId, session.id);
        if (exHist.maxExerciseVolume > 0 && exVol > exHist.maxExerciseVolume) {
          records.push({
            type: 'EXERCISE_VOLUME',
            title: 'Exercise Volume Record',
            badge: '🏆 VOLUME PR',
            exerciseName: se.exerciseName,
            currentValue: exVol,
            previousBest: exHist.maxExerciseVolume,
            improvement: exVol - exHist.maxExerciseVolume,
            improvementPercent:
              ((exVol - exHist.maxExerciseVolume) / exHist.maxExerciseVolume) * 100,
          });
        }

        // check max weight
        const maxSetWeight = Math.max(
          ...se.sets.filter((s) => s.completed && s.type !== 'WARMUP').map((s) => s.weightKg),
          0
        );
        if (exHist.maxWeight > 0 && maxSetWeight > exHist.maxWeight) {
          records.push({
            type: 'MAX_WEIGHT',
            title: 'Max Weight PR',
            badge: '🏆 WEIGHT PR',
            exerciseName: se.exerciseName,
            currentValue: maxSetWeight,
            previousBest: exHist.maxWeight,
            improvement: maxSetWeight - exHist.maxWeight,
            improvementPercent:
              ((maxSetWeight - exHist.maxWeight) / exHist.maxWeight) * 100,
          });
        }
      }

      if (!cancelled) {
        setRecordsHit(records);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isReady, db]);

  if (!lastSession) {
    return (
      <View style={[styles.centerContainer, { backgroundColor: colors.background }]}>
        <Text style={[styles.titleText, { color: colors.text }]}>WORKOUT COMPLETE!</Text>
        <TouchableOpacity
          style={[styles.doneButton, { backgroundColor: colors.primary }]}
          onPress={() => router.replace('/(tabs)')}
        >
          <Text style={[styles.doneText, { color: colors.primaryText }]}>DONE</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const duration = calculateElapsedTime(lastSession.startedAt, lastSession.finishedAt);
  let workingSetsCount = 0;
  let totalReps = 0;
  let totalVolumeKg = 0;

  lastSession.exercises.forEach((se) => {
    const isIncludedInVol = se.includeInVolume !== false;
    se.sets.forEach((st) => {
      if (st.completed && st.type !== 'WARMUP') {
        workingSetsCount++;
        totalReps += st.reps;
        if (isIncludedInVol) {
          totalVolumeKg += calculateSetVolume(st.type, st.weightKg, st.reps);
        }
      }
    });
  });

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]} contentContainerStyle={styles.content}>
      <View style={styles.headerBox}>
        <Text style={styles.trophyIcon}>🎉</Text>
        <Text style={[styles.bannerTitle, { color: colors.secondary }]}>WORKOUT COMPLETE</Text>
        <Text style={[styles.sessionName, { color: colors.text }]}>{lastSession.name}</Text>
      </View>

      {/* celebratory records broken card (like hevy) */}
      {recordsHit.length > 0 && (
        <View style={[styles.recordsCard, { backgroundColor: colors.card, borderColor: '#FFD700' }]}>
          <View style={styles.recordsHeader}>
            <Text style={styles.recordsTrophy}>🏆</Text>
            <Text style={[styles.recordsTitle, { color: '#FFD700' }]}>
              {recordsHit.length} NEW RECORD{recordsHit.length > 1 ? 'S' : ''} BROKEN!
            </Text>
          </View>
          <Text style={[styles.recordsSubtitle, { color: colors.textMuted }]}>
            Tap any record to view milestone details
          </Text>

          <View style={styles.recordChipsList}>
            {recordsHit.map((rec, idx) => (
              <TouchableOpacity
                key={`rec_${idx}`}
                style={[styles.recordRowItem, { backgroundColor: colors.cardAlt, borderColor: colors.border }]}
                onPress={() => setSelectedRecord(rec)}
                activeOpacity={0.8}
              >
                <View style={{ flex: 1 }}>
                  <Text style={[styles.recordRowTitle, { color: colors.text }]}>{rec.title}</Text>
                  {rec.exerciseName && (
                    <Text style={[styles.recordRowSub, { color: colors.secondary }]}>
                      {rec.exerciseName}
                    </Text>
                  )}
                </View>
                <Text style={styles.recordBadgeTag}>{rec.badge}</Text>
                <Text style={[styles.recordArrow, { color: colors.textMuted }]}>→</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      {/* stats summary card */}
      <View style={[styles.statsCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.statRow}>
          <Text style={[styles.statLabel, { color: colors.textMuted }]}>Duration</Text>
          <Text style={[styles.statVal, { color: colors.text }]}>{duration}</Text>
        </View>

        <View style={[styles.divider, { backgroundColor: colors.border }]} />

        <View style={styles.statRow}>
          <Text style={[styles.statLabel, { color: colors.textMuted }]}>Sets</Text>
          <Text style={[styles.statVal, { color: colors.text }]}>{workingSetsCount}</Text>
        </View>

        <View style={[styles.divider, { backgroundColor: colors.border }]} />

        <View style={styles.statRow}>
          <Text style={[styles.statLabel, { color: colors.textMuted }]}>Repetitions</Text>
          <Text style={[styles.statVal, { color: colors.text }]}>{totalReps}</Text>
        </View>

        <View style={[styles.divider, { backgroundColor: colors.border }]} />

        <View style={styles.statRow}>
          <Text style={[styles.statLabel, { color: colors.textMuted }]}>Total Volume</Text>
          <Text style={[styles.statVal, { color: colors.primary }]}>
            {formatWeight(Math.round(totalVolumeKg), settings.weightUnit)}
          </Text>
        </View>
      </View>

      <TouchableOpacity
        style={[styles.doneButton, { backgroundColor: colors.primary }]}
        onPress={() => router.replace('/(tabs)/history')}
      >
        <Text style={[styles.doneText, { color: colors.primaryText }]}>VIEW IN HISTORY</Text>
      </TouchableOpacity>

      {/* record celebratory modal */}
      <RecordDetailModal
        visible={!!selectedRecord}
        onClose={() => setSelectedRecord(null)}
        record={selectedRecord}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 20,
    paddingBottom: 40,
    alignItems: 'center',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  headerBox: {
    alignItems: 'center',
    marginVertical: 16,
  },
  trophyIcon: {
    fontSize: 48,
    marginBottom: 8,
  },
  bannerTitle: {
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 1,
  },
  sessionName: {
    fontSize: 22,
    fontWeight: '800',
    marginTop: 4,
  },
  titleText: {
    fontSize: 22,
    fontWeight: '800',
    marginBottom: 20,
  },
  recordsCard: {
    width: '100%',
    borderRadius: 16,
    borderWidth: 2,
    padding: 16,
    marginBottom: 16,
  },
  recordsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  recordsTrophy: {
    fontSize: 20,
  },
  recordsTitle: {
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  recordsSubtitle: {
    fontSize: 12,
    marginBottom: 12,
  },
  recordChipsList: {
    gap: 8,
  },
  recordRowItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    gap: 8,
  },
  recordRowTitle: {
    fontSize: 13,
    fontWeight: '800',
  },
  recordRowSub: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 1,
  },
  recordBadgeTag: {
    color: '#FFD700',
    fontSize: 11,
    fontWeight: '900',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    backgroundColor: '#FFD70020',
  },
  recordArrow: {
    fontSize: 16,
    fontWeight: '700',
  },
  statsCard: {
    width: '100%',
    borderRadius: 16,
    padding: 18,
    marginBottom: 20,
    borderWidth: 1,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
  },
  statLabel: {
    fontSize: 15,
    fontWeight: '600',
  },
  statVal: {
    fontSize: 16,
    fontWeight: '800',
  },
  divider: {
    height: 1,
  },
  doneButton: {
    width: '100%',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  doneText: {
    fontSize: 16,
    fontWeight: '800',
  },
});
