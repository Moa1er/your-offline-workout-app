// view and edit historical workout session detail screen

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useDatabase } from '../src/context/DatabaseContext';
import { useSettings } from '../src/context/SettingsContext';
import { WorkoutSession } from '../src/types/workout';
import { getSessionById, deleteSession } from '../src/database/queries/sessionQueries';
import { calculateElapsedTime } from '../src/utils/timer';
import { calculateSetVolume, formatWeight } from '../src/utils/calculations';

export default function SessionDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { db, isReady } = useDatabase();
  const { settings } = useSettings();
  const router = useRouter();

  const [session, setSession] = useState<WorkoutSession | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isReady || !db || !id) return;
    let cancelled = false;
    (async () => {
      try {
        const data = await getSessionById(db, id);
        if (!cancelled) setSession(data);
      } catch (err) {
        console.error('error loading session detail:', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isReady, db, id]);

  const handleDelete = () => {
    if (!db || !id) return;
    Alert.alert('Delete Session', 'Are you sure you want to delete this historical workout?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await deleteSession(db, id);
          router.replace('/(tabs)/history');
        },
      },
    ]);
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#6366f1" />
      </View>
    );
  }

  if (!session) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>Historical session not found.</Text>
      </View>
    );
  }

  const duration = calculateElapsedTime(session.startedAt, session.finishedAt);
  let totalVolume = 0;
  let totalWorkingSets = 0;

  session.exercises.forEach((se) => {
    se.sets.forEach((st) => {
      if (st.completed && st.type !== 'WARMUP') {
        totalWorkingSets++;
        totalVolume += calculateSetVolume(st.type, st.weightKg, st.reps);
      }
    });
  });

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.headerCard}>
        <Text style={styles.title}>{session.name}</Text>
        <Text style={styles.dateText}>
          {new Date(session.startedAt).toLocaleString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          })}
        </Text>

        <View style={styles.statsGrid}>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>Duration</Text>
            <Text style={styles.statVal}>{duration}</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>Working Sets</Text>
            <Text style={styles.statVal}>{totalWorkingSets}</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>Volume</Text>
            <Text style={styles.statVal}>
              {formatWeight(Math.round(totalVolume), settings.weightUnit)}
            </Text>
          </View>
        </View>

        {session.notes && <Text style={styles.notesText}>Notes: {session.notes}</Text>}
      </View>

      {/* exercise list */}
      {session.exercises.map((se) => (
        <View key={se.id} style={styles.exCard}>
          <Text style={styles.exTitle}>{se.exerciseName}</Text>
          <View style={styles.setTable}>
            {se.sets.map((st) => (
              <View key={st.id} style={styles.setRow}>
                <Text style={styles.setNumText}>Set {st.setNumber}</Text>
                <Text style={styles.setTypeText}>[{st.type}]</Text>
                <Text style={styles.setValText}>
                  {formatWeight(st.weightKg, settings.weightUnit)} × {st.reps} reps
                </Text>
                {st.rir !== null && <Text style={styles.rirText}>RIR {st.rir}</Text>}
              </View>
            ))}
          </View>
        </View>
      ))}

      {/* delete session button */}
      <TouchableOpacity style={styles.deleteBtn} onPress={handleDelete}>
        <Text style={styles.deleteBtnText}>DELETE WORKOUT SESSION</Text>
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
  title: {
    color: '#f8fafc',
    fontSize: 22,
    fontWeight: '800',
  },
  dateText: {
    color: '#38bdf8',
    fontSize: 13,
    fontWeight: '600',
    marginTop: 2,
    marginBottom: 12,
  },
  statsGrid: {
    flexDirection: 'row',
    backgroundColor: '#0f172a',
    borderRadius: 10,
    padding: 10,
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
    fontSize: 14,
    fontWeight: '700',
    marginTop: 2,
  },
  notesText: {
    color: '#94a3b8',
    fontSize: 13,
    marginTop: 12,
    fontStyle: 'italic',
  },
  exCard: {
    backgroundColor: '#1e293b',
    borderRadius: 14,
    padding: 14,
    marginBottom: 14,
  },
  exTitle: {
    color: '#f8fafc',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 8,
  },
  setTable: {
    gap: 6,
  },
  setRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0f172a',
    padding: 8,
    borderRadius: 6,
    gap: 8,
  },
  setNumText: {
    color: '#6366f1',
    fontWeight: '700',
    fontSize: 13,
  },
  setTypeText: {
    color: '#64748b',
    fontSize: 11,
    fontWeight: '700',
  },
  setValText: {
    color: '#f8fafc',
    fontSize: 14,
    fontWeight: '700',
    flex: 1,
  },
  rirText: {
    color: '#38bdf8',
    fontSize: 12,
    fontWeight: '600',
  },
  deleteBtn: {
    backgroundColor: '#7f1d1d',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 10,
  },
  deleteBtnText: {
    color: '#fca5a5',
    fontSize: 14,
    fontWeight: '800',
  },
});
