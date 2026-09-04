// workout history timeline screen with theme support and volume filtering

import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { useDatabase } from '../../src/context/DatabaseContext';
import { useSettings } from '../../src/context/SettingsContext';
import { useAppTheme } from '../../src/context/ThemeContext';
import { WorkoutSession } from '../../src/types/workout';
import { getPaginatedCompletedSessions } from '../../src/database/queries/sessionQueries';
import { calculateElapsedTime } from '../../src/utils/timer';
import { calculateSetVolume, formatWeight } from '../../src/utils/calculations';

const PAGE_SIZE = 10;

export default function HistoryScreen() {
  const { db, isReady, dataVersion } = useDatabase();
  const { settings } = useSettings();
  const { colors } = useAppTheme();
  const router = useRouter();

  const [sessions, setSessions] = useState<WorkoutSession[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [compareMode, setCompareMode] = useState(false);
  const [selectedSessionIds, setSelectedSessionIds] = useState<string[]>([]);

  const handleToggleSelectSession = (sessionId: string) => {
    setSelectedSessionIds((prev) => {
      if (prev.includes(sessionId)) {
        return prev.filter((id) => id !== sessionId);
      }
      if (prev.length >= 2) {
        // replace the second workout if already 2 selected
        return [prev[0], sessionId];
      }
      return [...prev, sessionId];
    });
  };

  const loadInitialHistory = useCallback(async () => {
    if (!isReady || !db) return;
    try {
      const res = await getPaginatedCompletedSessions(db, PAGE_SIZE, 0);
      setSessions(res.sessions);
      setHasMore(res.hasMore);
      setTotalCount(res.totalCount);
    } catch (err) {
      console.error('error loading completed sessions:', err);
    } finally {
      setLoading(false);
    }
  }, [isReady, db]);

  useFocusEffect(
    useCallback(() => {
      loadInitialHistory();
    }, [loadInitialHistory, dataVersion])
  );

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

  if (loading) {
    return (
      <View style={[styles.centerContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (sessions.length === 0) {
    return (
      <View style={[styles.emptyContainer, { backgroundColor: colors.background }]}>
        <Text style={styles.emptyIcon}>📜</Text>
        <Text style={[styles.emptyTitle, { color: colors.text }]}>NO HISTORY YET</Text>
        <Text style={[styles.emptySub, { color: colors.textMuted }]}>
          Complete your first workout to see your training history.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.screenWrapper}>
      <ScrollView style={[styles.container, { backgroundColor: colors.background }]} contentContainerStyle={styles.content}>
        <View style={styles.headerActionRow}>
          <Text style={[styles.sectionHeader, { color: colors.textMuted }]}>
            {compareMode
              ? `SELECT 2 WORKOUTS (${selectedSessionIds.length}/2)`
              : `COMPLETED WORKOUTS (${sessions.length} OF ${totalCount})`}
          </Text>
          <TouchableOpacity
            style={[
              styles.compareToggleBtn,
              {
                backgroundColor: compareMode ? colors.primary : colors.cardAlt,
                borderColor: colors.border,
              },
            ]}
            onPress={() => {
              setCompareMode(!compareMode);
              setSelectedSessionIds([]);
            }}
          >
            <Text
              style={[
                styles.compareToggleText,
                { color: compareMode ? colors.primaryText : colors.text },
              ]}
            >
              {compareMode ? '✕ Cancel' : '⚖️ Compare'}
            </Text>
          </TouchableOpacity>
        </View>

        {sessions.map((session) => {
          const dateObj = new Date(session.startedAt);
          const monthStr = dateObj
            .toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
            .toUpperCase();

          const duration = calculateElapsedTime(session.startedAt, session.finishedAt);

          let workingSetsCount = 0;
          let totalVolumeKg = 0;

          session.exercises.forEach((se) => {
            const isIncludedInVol = se.includeInVolume !== false;
            se.sets.forEach((st) => {
              if (st.completed && st.type !== 'WARMUP') {
                workingSetsCount++;
                if (isIncludedInVol) {
                  totalVolumeKg += calculateSetVolume(st.type, st.weightKg, st.reps);
                }
              }
            });
          });

          const isSelected = selectedSessionIds.includes(session.id);
          const selectedIndex = selectedSessionIds.indexOf(session.id);

          return (
            <TouchableOpacity
              key={session.id}
              style={[
                styles.sessionCard,
                { backgroundColor: colors.card, borderColor: isSelected ? colors.primary : colors.border },
                isSelected && { borderWidth: 2 },
              ]}
              onPress={() => {
                if (compareMode) {
                  handleToggleSelectSession(session.id);
                } else {
                  router.push({ pathname: '/session-detail', params: { id: session.id } });
                }
              }}
            >
              <View style={styles.cardHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.sessionName, { color: colors.text }]}>{session.name}</Text>
                  <Text style={[styles.dateText, { color: colors.secondary }]}>{monthStr}</Text>
                </View>

                {compareMode && (
                  <View
                    style={[
                      styles.compareBadge,
                      {
                        backgroundColor: isSelected
                          ? selectedIndex === 0
                            ? colors.secondary
                            : colors.primary
                          : colors.cardAlt,
                        borderColor: colors.border,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.compareBadgeText,
                        { color: isSelected ? '#ffffff' : colors.textMuted },
                      ]}
                    >
                      {isSelected ? `Workout ${selectedIndex + 1}` : 'Select'}
                    </Text>
                  </View>
                )}
              </View>

              <View style={[styles.statsRow, { backgroundColor: colors.cardAlt }]}>
                <View style={styles.statBox}>
                  <Text style={[styles.statLabel, { color: colors.textMuted }]}>Duration</Text>
                  <Text style={[styles.statVal, { color: colors.text }]}>{duration}</Text>
                </View>

                <View style={styles.statBox}>
                  <Text style={[styles.statLabel, { color: colors.textMuted }]}>Sets</Text>
                  <Text style={[styles.statVal, { color: colors.text }]}>{workingSetsCount}</Text>
                </View>

                <View style={styles.statBox}>
                  <Text style={[styles.statLabel, { color: colors.textMuted }]}>Volume</Text>
                  <Text style={[styles.statVal, { color: colors.primary }]}>
                    {formatWeight(Math.round(totalVolumeKg), settings.weightUnit)}
                  </Text>
                </View>
              </View>

              {session.notes ? (
                <Text style={[styles.notesText, { color: colors.textMuted }]}>{session.notes}</Text>
              ) : null}
            </TouchableOpacity>
          );
        })}

        {hasMore && (
          <TouchableOpacity
            style={[styles.loadMoreBtn, { backgroundColor: colors.cardAlt, borderColor: colors.primary }]}
            onPress={loadMoreHistory}
            disabled={loadingMore}
          >
            {loadingMore ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <Text style={[styles.loadMoreText, { color: colors.primary }]}>
                LOAD MORE WORKOUTS ({totalCount - sessions.length} REMAINING)
              </Text>
            )}
          </TouchableOpacity>
        )}
      </ScrollView>

      {/* bottom floating action button to compare selected workouts */}
      {compareMode && selectedSessionIds.length === 2 && (
        <View style={styles.floatingBarContainer}>
          <TouchableOpacity
            style={[styles.compareSubmitBtn, { backgroundColor: colors.primary }]}
            onPress={() => {
              router.push({
                pathname: '/workout-compare',
                params: {
                  idA: selectedSessionIds[0],
                  idB: selectedSessionIds[1],
                },
              });
            }}
          >
            <Text style={[styles.compareSubmitText, { color: colors.primaryText }]}>
              COMPARE 2 WORKOUTS →
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screenWrapper: {
    flex: 1,
  },
  headerActionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  compareToggleBtn: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
  },
  compareToggleText: {
    fontSize: 12,
    fontWeight: '800',
  },
  compareBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
  },
  compareBadgeText: {
    fontSize: 11,
    fontWeight: '800',
  },
  floatingBarContainer: {
    position: 'absolute',
    bottom: 20,
    left: 16,
    right: 16,
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
  },
  compareSubmitBtn: {
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  compareSubmitText: {
    fontSize: 15,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
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
  sectionHeader: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  sessionCard: {
    borderRadius: 14,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  sessionName: {
    fontSize: 18,
    fontWeight: '800',
  },
  dateText: {
    fontSize: 12,
    fontWeight: '700',
  },
  statsRow: {
    flexDirection: 'row',
    borderRadius: 10,
    padding: 10,
  },
  statBox: {
    flex: 1,
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '600',
  },
  statVal: {
    fontSize: 14,
    fontWeight: '700',
    marginTop: 2,
  },
  notesText: {
    fontSize: 12,
    marginTop: 10,
    fontStyle: 'italic',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '800',
  },
  emptySub: {
    fontSize: 14,
    textAlign: 'center',
    marginTop: 6,
  },
  loadMoreBtn: {
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 20,
  },
  loadMoreText: {
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
});
