// post-workout summary screen celebrating session completion and new prs

import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { useDatabase } from '../src/context/DatabaseContext';
import { useSettings } from '../src/context/SettingsContext';
import { WorkoutSession } from '../src/types/workout';
import { getAllCompletedSessions } from '../src/database/queries/sessionQueries';
import { calculateElapsedTime } from '../src/utils/timer';
import { calculateSetVolume, formatWeight } from '../src/utils/calculations';

export default function WorkoutSummaryScreen() {
  const { db, isReady } = useDatabase();
  const { settings } = useSettings();
  const router = useRouter();

  const [lastSession, setLastSession] = useState<WorkoutSession | null>(null);

  useEffect(() => {
    if (isReady && db) {
      getAllCompletedSessions(db).then((sessions) => {
        if (sessions.length > 0) {
          setLastSession(sessions[0]);
        }
      });
    }
  }, [isReady, db]);

  if (!lastSession) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.titleText}>WORKOUT COMPLETE!</Text>
        <TouchableOpacity style={styles.doneButton} onPress={() => router.replace('/(tabs)')}>
          <Text style={styles.doneText}>DONE</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const duration = calculateElapsedTime(lastSession.startedAt, lastSession.finishedAt);
  let workingSetsCount = 0;
  let totalReps = 0;
  let totalVolumeKg = 0;

  lastSession.exercises.forEach((se) => {
    se.sets.forEach((st) => {
      if (st.completed && st.type !== 'WARMUP') {
        workingSetsCount++;
        totalReps += st.reps;
        totalVolumeKg += calculateSetVolume(st.type, st.weightKg, st.reps);
      }
    });
  });

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.headerBox}>
        <Text style={styles.trophyIcon}>🎉</Text>
        <Text style={styles.bannerTitle}>WORKOUT COMPLETE</Text>
        <Text style={styles.sessionName}>{lastSession.name}</Text>
      </View>

      {/* stats summary card */}
      <View style={styles.statsCard}>
        <View style={styles.statRow}>
          <Text style={styles.statLabel}>Duration</Text>
          <Text style={styles.statVal}>{duration}</Text>
        </View>

        <View style={styles.divider} />

        <View style={styles.statRow}>
          <Text style={styles.statLabel}>Working Sets</Text>
          <Text style={styles.statVal}>{workingSetsCount}</Text>
        </View>

        <View style={styles.divider} />

        <View style={styles.statRow}>
          <Text style={styles.statLabel}>Repetitions</Text>
          <Text style={styles.statVal}>{totalReps}</Text>
        </View>

        <View style={styles.divider} />

        <View style={styles.statRow}>
          <Text style={styles.statLabel}>Volume</Text>
          <Text style={styles.statVal}>
            {formatWeight(Math.round(totalVolumeKg), settings.weightUnit)}
          </Text>
        </View>
      </View>

      <TouchableOpacity style={styles.doneButton} onPress={() => router.replace('/(tabs)/history')}>
        <Text style={styles.doneText}>VIEW IN HISTORY</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  content: {
    padding: 20,
    paddingBottom: 40,
    alignItems: 'center',
  },
  centerContainer: {
    flex: 1,
    backgroundColor: '#0f172a',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  headerBox: {
    alignItems: 'center',
    marginVertical: 20,
  },
  trophyIcon: {
    fontSize: 54,
    marginBottom: 10,
  },
  bannerTitle: {
    color: '#10b981',
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 1,
  },
  sessionName: {
    color: '#ffffff',
    fontSize: 24,
    fontWeight: '800',
    marginTop: 4,
  },
  titleText: {
    color: '#ffffff',
    fontSize: 22,
    fontWeight: '800',
    marginBottom: 20,
  },
  statsCard: {
    backgroundColor: '#1e293b',
    width: '100%',
    borderRadius: 16,
    padding: 18,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#334155',
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
  },
  statLabel: {
    color: '#94a3b8',
    fontSize: 15,
    fontWeight: '600',
  },
  statVal: {
    color: '#f8fafc',
    fontSize: 16,
    fontWeight: '800',
  },
  divider: {
    height: 1,
    backgroundColor: '#334155',
  },
  doneButton: {
    backgroundColor: '#6366f1',
    width: '100%',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  doneText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '800',
  },
});
