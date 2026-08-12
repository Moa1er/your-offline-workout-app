// workout history timeline screen

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useDatabase } from '../../src/context/DatabaseContext';
import { useSettings } from '../../src/context/SettingsContext';
import { WorkoutSession } from '../../src/types/workout';
import { getPaginatedCompletedSessions } from '../../src/database/queries/sessionQueries';
import { calculateElapsedTime } from '../../src/utils/timer';
import { calculateSetVolume, formatWeight } from '../../src/utils/calculations';

const PAGE_SIZE = 10;

export default function HistoryScreen() {
  const { db, isReady, dataVersion } = useDatabase();
  const { settings } = useSettings();
  const router = useRouter();

  const [sessions, setSessions] = useState<WorkoutSession[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const loadMoreHistory = async () => {
    if (!db || !isReady || loadingMore || !hasMore) return;
    setLoadingMore(true);
    try {
      const res = await getPaginatedCompletedSessions(db, PAGE_SIZE, sessions.length);
      setSessions((prev) => [...prev, ...res.sessions]);
      setHasMore(res.hasMore);
      setTotalCount(res.totalCount);
    } catch (err) {
      console.error('error loading more completed sessions:', err);
    } finally {
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    if (!isReady || !db) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await getPaginatedCompletedSessions(db, PAGE_SIZE, 0);
        if (cancelled) return;
        setSessions(res.sessions);
        setHasMore(res.hasMore);
        setTotalCount(res.totalCount);
      } catch (err) {
        console.error('error loading completed sessions:', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isReady, db, dataVersion]);

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#6366f1" />
      </View>
    );
  }

  if (sessions.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyIcon}>📜</Text>
        <Text style={styles.emptyTitle}>NO HISTORY YET</Text>
        <Text style={styles.emptySub}>
          Complete your first workout to see your training history.
        </Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.sectionHeader}>
        COMPLETED WORKOUTS ({sessions.length} OF {totalCount})
      </Text>

      {sessions.map((session) => {
        const dateObj = new Date(session.startedAt);
        const monthStr = dateObj
          .toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
          .toUpperCase();

        const duration = calculateElapsedTime(session.startedAt, session.finishedAt);

        let workingSetsCount = 0;
        let totalVolumeKg = 0;

        session.exercises.forEach((se) => {
          se.sets.forEach((st) => {
            if (st.completed && st.type !== 'WARMUP') {
              workingSetsCount++;
              totalVolumeKg += calculateSetVolume(st.type, st.weightKg, st.reps);
            }
          });
        });

        return (
          <TouchableOpacity
            key={session.id}
            style={styles.sessionCard}
            onPress={() => router.push({ pathname: '/session-detail', params: { id: session.id } })}
          >
            <View style={styles.cardHeader}>
              <Text style={styles.sessionName}>{session.name}</Text>
              <Text style={styles.dateText}>{monthStr}</Text>
            </View>

            <View style={styles.statsRow}>
              <View style={styles.statBox}>
                <Text style={styles.statLabel}>Duration</Text>
                <Text style={styles.statVal}>{duration}</Text>
              </View>

              <View style={styles.statBox}>
                <Text style={styles.statLabel}>Working Sets</Text>
                <Text style={styles.statVal}>{workingSetsCount}</Text>
              </View>

              <View style={styles.statBox}>
                <Text style={styles.statLabel}>Volume</Text>
                <Text style={styles.statVal}>
                  {formatWeight(Math.round(totalVolumeKg), settings.weightUnit)}
                </Text>
              </View>
            </View>

            {session.notes && <Text style={styles.notesText}>{session.notes}</Text>}
          </TouchableOpacity>
        );
      })}

      {hasMore && (
        <TouchableOpacity
          style={styles.loadMoreBtn}
          onPress={loadMoreHistory}
          disabled={loadingMore}
        >
          {loadingMore ? (
            <ActivityIndicator size="small" color="#ffffff" />
          ) : (
            <Text style={styles.loadMoreText}>
              LOAD MORE WORKOUTS ({totalCount - sessions.length} REMAINING)
            </Text>
          )}
        </TouchableOpacity>
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
  sectionHeader: {
    color: '#64748b',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  sessionCard: {
    backgroundColor: '#1e293b',
    borderRadius: 14,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#334155',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  sessionName: {
    color: '#f8fafc',
    fontSize: 18,
    fontWeight: '800',
  },
  dateText: {
    color: '#38bdf8',
    fontSize: 12,
    fontWeight: '700',
  },
  statsRow: {
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
    fontSize: 12,
    marginTop: 10,
    fontStyle: 'italic',
  },
  emptyContainer: {
    flex: 1,
    backgroundColor: '#0f172a',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyTitle: {
    color: '#f8fafc',
    fontSize: 18,
    fontWeight: '800',
  },
  emptySub: {
    color: '#94a3b8',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 6,
  },
  loadMoreBtn: {
    backgroundColor: '#312e81',
    borderColor: '#6366f1',
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 20,
  },
  loadMoreText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
});
