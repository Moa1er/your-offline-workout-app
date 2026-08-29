// view and edit historical workout session detail screen with duration editing

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  TextInput,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useDatabase } from '../src/context/DatabaseContext';
import { useSettings } from '../src/context/SettingsContext';
import { useAppTheme } from '../src/context/ThemeContext';
import { WorkoutSession } from '../src/types/workout';
import { getSessionById, deleteSession } from '../src/database/queries/sessionQueries';
import { calculateElapsedTime } from '../src/utils/timer';
import { calculateSetVolume, formatWeight } from '../src/utils/calculations';
import { useAppAlert } from '../src/context/AlertContext';

export default function SessionDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { db, isReady } = useDatabase();
  const { settings } = useSettings();
  const { colors } = useAppTheme();
  const { showConfirm, showAlert } = useAppAlert();
  const router = useRouter();

  const [session, setSession] = useState<WorkoutSession | null>(null);
  const [loading, setLoading] = useState(true);

  // duration editing state
  const [editDurationOpen, setEditDurationOpen] = useState(false);
  const [editMinutes, setEditMinutes] = useState<number>(45);

  useEffect(() => {
    if (!isReady || !db || !id) return;
    let cancelled = false;
    (async () => {
      try {
        const data = await getSessionById(db, id);
        if (!cancelled && data) {
          setSession(data);
          const startMs = new Date(data.startedAt).getTime();
          const endMs = new Date(data.finishedAt || data.startedAt).getTime();
          const mins = Math.max(1, Math.round((endMs - startMs) / 60000));
          setEditMinutes(mins);
        }
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
    showConfirm(
      'Delete Workout Session',
      'Are you sure you want to delete this historical workout? This action cannot be undone and PRs will be recalculated.',
      async () => {
        await deleteSession(db, id);
        router.replace('/(tabs)/history');
      },
      {
        confirmText: 'Delete Session',
        isDestructive: true,
        icon: '🗑️',
      }
    );
  };

  const handleSaveDuration = async () => {
    if (!db || !session || editMinutes <= 0) return;
    try {
      const startMs = new Date(session.startedAt).getTime();
      const newFinishedAt = new Date(startMs + editMinutes * 60000).toISOString();
      await db.runAsync(
        'UPDATE workout_sessions SET finished_at = ? WHERE id = ?;',
        [newFinishedAt, session.id]
      );
      setSession({
        ...session,
        finishedAt: newFinishedAt,
      });
      setEditDurationOpen(false);
    } catch (err: any) {
      showAlert({
        title: 'Save Duration Error',
        message: err.message || 'Failed to update workout duration.',
        icon: '⚠️',
      });
    }
  };

  const adjustMinutes = (delta: number) => {
    setEditMinutes((prev) => Math.max(1, prev + delta));
  };

  if (loading) {
    return (
      <View style={[styles.centerContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!session) {
    return (
      <View style={[styles.centerContainer, { backgroundColor: colors.background }]}>
        <Text style={[styles.errorText, { color: colors.danger }]}>Historical session not found.</Text>
      </View>
    );
  }

  const duration = calculateElapsedTime(session.startedAt, session.finishedAt);
  let totalVolume = 0;
  let totalWorkingSets = 0;

  session.exercises.forEach((se) => {
    const isIncludedInVol = se.includeInVolume !== false;
    se.sets.forEach((st) => {
      if (st.completed && st.type !== 'WARMUP') {
        totalWorkingSets++;
        if (isIncludedInVol) {
          totalVolume += calculateSetVolume(st.type, st.weightKg, st.reps);
        }
      }
    });
  });

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]} contentContainerStyle={styles.content}>
      <View style={[styles.headerCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.headerTopRow}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.title, { color: colors.text }]}>{session.name}</Text>
            <Text style={[styles.dateText, { color: colors.secondary }]}>
              {new Date(session.startedAt).toLocaleString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </Text>
          </View>
          <TouchableOpacity
            style={[styles.topDeleteBtn, { backgroundColor: colors.cardAlt, borderColor: colors.danger }]}
            onPress={handleDelete}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Text style={styles.topDeleteIcon}>🗑️</Text>
          </TouchableOpacity>
        </View>

        <View style={[styles.statsGrid, { backgroundColor: colors.cardAlt }]}>
          <TouchableOpacity
            style={styles.statBox}
            onPress={() => {
              const startMs = new Date(session.startedAt).getTime();
              const endMs = new Date(session.finishedAt || session.startedAt).getTime();
              setEditMinutes(Math.max(1, Math.round((endMs - startMs) / 60000)));
              setEditDurationOpen(true);
            }}
            activeOpacity={0.7}
          >
            <View style={styles.statLabelRow}>
              <Text style={[styles.statLabel, { color: colors.textMuted }]}>Duration</Text>
              <Text style={styles.editIcon}>✏️</Text>
            </View>
            <Text style={[styles.statVal, { color: colors.secondary }]}>{duration}</Text>
          </TouchableOpacity>

          <View style={styles.statBox}>
            <Text style={[styles.statLabel, { color: colors.textMuted }]}>Sets</Text>
            <Text style={[styles.statVal, { color: colors.text }]}>{totalWorkingSets}</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={[styles.statLabel, { color: colors.textMuted }]}>Volume</Text>
            <Text style={[styles.statVal, { color: colors.primary }]}>
              {formatWeight(Math.round(totalVolume), settings.weightUnit)}
            </Text>
          </View>
        </View>

        {session.notes ? <Text style={[styles.notesText, { color: colors.textMuted }]}>Notes: {session.notes}</Text> : null}
      </View>

      {/* exercise list */}
      {session.exercises.map((se) => (
        <View key={se.id} style={[styles.exCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.exCardHeader}>
            <Text style={[styles.exTitle, { color: colors.text }]}>{se.exerciseName}</Text>
            {se.includeInVolume === false && (
              <Text style={[styles.excludedBadge, { color: colors.textSubtle }]}>Excluded from volume</Text>
            )}
          </View>
          <View style={styles.setTable}>
            {se.sets.map((st) => (
              <View key={st.id} style={[styles.setRow, { backgroundColor: colors.cardAlt }]}>
                <Text style={[styles.setNumText, { color: colors.primary }]}>Set {st.setNumber}</Text>
                <Text style={[styles.setValText, { color: colors.text }]}>
                  {formatWeight(st.weightKg, settings.weightUnit)} × {st.reps} reps
                </Text>
                {st.type === 'WARMUP' && <Text style={[styles.setTypeText, { color: '#eab308' }]}>[Warmup]</Text>}
                {st.type === 'DROP_SET' && <Text style={[styles.setTypeText, { color: colors.primary }]}>[Drop Set]</Text>}
                {st.type === 'FAILURE' && <Text style={[styles.setTypeText, { color: colors.danger }]}>[Failure]</Text>}
              </View>
            ))}
          </View>
        </View>
      ))}

      {/* delete session button */}
      <TouchableOpacity
        style={[styles.deleteBtn, { backgroundColor: colors.cardAlt, borderColor: colors.danger, borderWidth: 1 }]}
        onPress={handleDelete}
      >
        <Text style={[styles.deleteBtnText, { color: colors.danger }]}>DELETE WORKOUT SESSION</Text>
      </TouchableOpacity>

      {/* edit duration modal */}
      <Modal
        visible={editDurationOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setEditDurationOpen(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>EDIT WORKOUT DURATION</Text>
            <Text style={[styles.modalSub, { color: colors.textMuted }]}>
              Adjust total session duration in minutes
            </Text>

            <View style={[styles.durationDisplayBox, { backgroundColor: colors.cardAlt, borderColor: colors.border }]}>
              <Text style={[styles.durationLargeText, { color: colors.primary }]}>
                {Math.floor(editMinutes / 60) > 0 ? `${Math.floor(editMinutes / 60)}h ` : ''}
                {editMinutes % 60}m
              </Text>
              <Text style={[styles.durationSubText, { color: colors.textMuted }]}>
                ({editMinutes} total minutes)
              </Text>
            </View>

            {/* quick adjuster steppers */}
            <View style={styles.adjustPillRow}>
              <TouchableOpacity
                style={[styles.adjustPill, { backgroundColor: colors.cardAlt, borderColor: colors.border }]}
                onPress={() => adjustMinutes(-15)}
              >
                <Text style={[styles.adjustPillText, { color: colors.text }]}>-15m</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.adjustPill, { backgroundColor: colors.cardAlt, borderColor: colors.border }]}
                onPress={() => adjustMinutes(-5)}
              >
                <Text style={[styles.adjustPillText, { color: colors.text }]}>-5m</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.adjustPill, { backgroundColor: colors.cardAlt, borderColor: colors.border }]}
                onPress={() => adjustMinutes(5)}
              >
                <Text style={[styles.adjustPillText, { color: colors.text }]}>+5m</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.adjustPill, { backgroundColor: colors.cardAlt, borderColor: colors.border }]}
                onPress={() => adjustMinutes(15)}
              >
                <Text style={[styles.adjustPillText, { color: colors.text }]}>+15m</Text>
              </TouchableOpacity>
            </View>

            {/* direct minute numeric input */}
            <View style={styles.directInputRow}>
              <Text style={[styles.directInputLabel, { color: colors.textMuted }]}>Custom Minutes:</Text>
              <TextInput
                style={[
                  styles.minuteInput,
                  { backgroundColor: colors.inputBg, borderColor: colors.inputBorder, color: colors.text },
                ]}
                keyboardType="numeric"
                textAlign="center"
                textAlignVertical="center"
                value={String(editMinutes)}
                onChangeText={(t) => {
                  const num = parseInt(t, 10);
                  setEditMinutes(isNaN(num) ? 0 : num);
                }}
              />
            </View>

            <View style={styles.modalBtnRow}>
              <TouchableOpacity
                style={[styles.modalCancelBtn, { borderColor: colors.border }]}
                onPress={() => setEditDurationOpen(false)}
              >
                <Text style={[styles.modalCancelText, { color: colors.textMuted }]}>CANCEL</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalSaveBtn, { backgroundColor: colors.primary }]}
                onPress={handleSaveDuration}
              >
                <Text style={[styles.modalSaveText, { color: colors.primaryText }]}>SAVE DURATION</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    fontWeight: '700',
  },
  headerCard: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
  },
  headerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  topDeleteBtn: {
    width: 38,
    height: 38,
    borderRadius: 10,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topDeleteIcon: {
    fontSize: 18,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
  },
  dateText: {
    fontSize: 12,
    marginTop: 2,
    fontWeight: '600',
  },
  statsGrid: {
    flexDirection: 'row',
    borderRadius: 12,
    padding: 12,
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
  },
  statLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '700',
  },
  editIcon: {
    fontSize: 10,
  },
  statVal: {
    fontSize: 15,
    fontWeight: '800',
    marginTop: 4,
  },
  notesText: {
    fontSize: 13,
    marginTop: 10,
    fontStyle: 'italic',
  },
  exCard: {
    borderRadius: 14,
    padding: 14,
    marginBottom: 14,
    borderWidth: 1,
  },
  exCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  exTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  excludedBadge: {
    fontSize: 11,
    fontWeight: '600',
    fontStyle: 'italic',
  },
  setTable: {
    gap: 6,
  },
  setRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 8,
    gap: 8,
  },
  setNumText: {
    fontSize: 12,
    fontWeight: '800',
    width: 48,
  },
  setValText: {
    fontSize: 14,
    fontWeight: '700',
    flex: 1,
  },
  setTypeText: {
    fontSize: 11,
    fontWeight: '700',
    textAlign: 'right',
  },
  deleteBtn: {
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 12,
  },
  deleteBtnText: {
    fontWeight: '800',
    fontSize: 13,
    letterSpacing: 0.5,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    width: '100%',
    maxWidth: 360,
    borderRadius: 20,
    borderWidth: 1,
    padding: 22,
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '900',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  modalSub: {
    fontSize: 12,
    marginBottom: 16,
    textAlign: 'center',
  },
  durationDisplayBox: {
    width: '100%',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    alignItems: 'center',
    marginBottom: 16,
  },
  durationLargeText: {
    fontSize: 32,
    fontWeight: '900',
  },
  durationSubText: {
    fontSize: 12,
    marginTop: 2,
    fontWeight: '600',
  },
  adjustPillRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
    width: '100%',
  },
  adjustPill: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
  },
  adjustPillText: {
    fontSize: 13,
    fontWeight: '800',
  },
  directInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 20,
  },
  directInputLabel: {
    fontSize: 13,
    fontWeight: '700',
  },
  minuteInput: {
    width: 80,
    height: 38,
    borderRadius: 8,
    borderWidth: 1,
    fontSize: 15,
    fontWeight: '800',
  },
  modalBtnRow: {
    flexDirection: 'row',
    gap: 10,
    width: '100%',
  },
  modalCancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
  },
  modalCancelText: {
    fontSize: 13,
    fontWeight: '800',
  },
  modalSaveBtn: {
    flex: 1.4,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  modalSaveText: {
    fontSize: 13,
    fontWeight: '900',
  },
});
