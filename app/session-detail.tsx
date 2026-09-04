// view and edit historical workout session detail screen with full set and exercise editing

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
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useDatabase } from '../src/context/DatabaseContext';
import { useSettings } from '../src/context/SettingsContext';
import { useAppTheme } from '../src/context/ThemeContext';
import { WorkoutSession, Exercise, SetType } from '../src/types/workout';
import {
  getSessionById,
  deleteSession,
  updateCompletedWorkoutSession,
} from '../src/database/queries/sessionQueries';
import { getAllExercises } from '../src/database/queries/exerciseQueries';
import { calculateElapsedTime } from '../src/utils/timer';
import { calculateSetVolume, formatWeight, convertKgToLb, convertLbToKg } from '../src/utils/calculations';
import { useAppAlert } from '../src/context/AlertContext';
import { generateId as uuidv4 } from '../src/utils/uuid';

interface DraftSet {
  id: string;
  setNumber: number;
  type: SetType;
  weightText: string;
  repsText: string;
  completed: boolean;
}

interface DraftExercise {
  id: string;
  exerciseId: string;
  exerciseName: string;
  order: number;
  includeInVolume: boolean;
  sets: DraftSet[];
}

const SET_TYPE_CYCLE: SetType[] = ['WORKING', 'WARMUP', 'DROP_SET', 'FAILURE'];

const getNextSetType = (current: SetType): SetType => {
  const idx = SET_TYPE_CYCLE.indexOf(current);
  if (idx === -1 || idx === SET_TYPE_CYCLE.length - 1) return SET_TYPE_CYCLE[0];
  return SET_TYPE_CYCLE[idx + 1];
};

const getSetTypeLabel = (type: SetType): string => {
  switch (type) {
    case 'WARMUP':
      return 'Warmup';
    case 'DROP_SET':
      return 'Drop';
    case 'FAILURE':
      return 'Fail';
    case 'WORKING':
    default:
      return 'Normal';
  }
};

export default function SessionDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { db, isReady, notifyDataChanged } = useDatabase();
  const { settings } = useSettings();
  const { colors } = useAppTheme();
  const { showConfirm, showAlert } = useAppAlert();
  const router = useRouter();

  const [session, setSession] = useState<WorkoutSession | null>(null);
  const [loading, setLoading] = useState(true);

  // mode toggles
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // draft edit state
  const [editName, setEditName] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [editMinutes, setEditMinutes] = useState<number>(45);
  const [editExercises, setEditExercises] = useState<DraftExercise[]>([]);

  // standalone duration modal state
  const [editDurationOpen, setEditDurationOpen] = useState(false);

  // exercise picker modal state
  const [exercisePickerOpen, setExercisePickerOpen] = useState(false);
  const [availableExercises, setAvailableExercises] = useState<Exercise[]>([]);
  const [exerciseSearch, setExerciseSearch] = useState('');
  const [loadingExercises, setLoadingExercises] = useState(false);

  const isLb = settings.weightUnit === 'lb';

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

  const enterEditMode = () => {
    if (!session) return;
    const startMs = new Date(session.startedAt).getTime();
    const endMs = new Date(session.finishedAt || session.startedAt).getTime();
    const mins = Math.max(1, Math.round((endMs - startMs) / 60000));

    setEditName(session.name);
    setEditNotes(session.notes || '');
    setEditMinutes(mins);
    setEditExercises(
      session.exercises.map((se) => ({
        id: se.id,
        exerciseId: se.exerciseId,
        exerciseName: se.exerciseName || 'Exercise',
        order: se.order,
        includeInVolume: se.includeInVolume !== false,
        sets: se.sets.map((st) => ({
          id: st.id,
          setNumber: st.setNumber,
          type: st.type,
          weightText: String(isLb ? convertKgToLb(st.weightKg) : st.weightKg),
          repsText: String(st.reps),
          completed: st.completed,
        })),
      }))
    );
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
  };

  const handleSetWeightChange = (exId: string, setId: string, text: string) => {
    setEditExercises((prev) =>
      prev.map((ex) => {
        if (ex.id !== exId) return ex;
        return {
          ...ex,
          sets: ex.sets.map((s) => (s.id === setId ? { ...s, weightText: text } : s)),
        };
      })
    );
  };

  const handleSetRepsChange = (exId: string, setId: string, text: string) => {
    setEditExercises((prev) =>
      prev.map((ex) => {
        if (ex.id !== exId) return ex;
        return {
          ...ex,
          sets: ex.sets.map((s) => (s.id === setId ? { ...s, repsText: text } : s)),
        };
      })
    );
  };

  const handleCycleSetType = (exId: string, setId: string) => {
    setEditExercises((prev) =>
      prev.map((ex) => {
        if (ex.id !== exId) return ex;
        return {
          ...ex,
          sets: ex.sets.map((s) =>
            s.id === setId ? { ...s, type: getNextSetType(s.type) } : s
          ),
        };
      })
    );
  };

  const handleToggleSetCompleted = (exId: string, setId: string) => {
    setEditExercises((prev) =>
      prev.map((ex) => {
        if (ex.id !== exId) return ex;
        return {
          ...ex,
          sets: ex.sets.map((s) =>
            s.id === setId ? { ...s, completed: !s.completed } : s
          ),
        };
      })
    );
  };

  const handleDeleteSet = (exId: string, setId: string) => {
    setEditExercises((prev) =>
      prev.map((ex) => {
        if (ex.id !== exId) return ex;
        const remaining = ex.sets.filter((s) => s.id !== setId);
        return {
          ...ex,
          sets: remaining.map((s, idx) => ({ ...s, setNumber: idx + 1 })),
        };
      })
    );
  };

  const handleAddSet = (exId: string) => {
    setEditExercises((prev) =>
      prev.map((ex) => {
        if (ex.id !== exId) return ex;
        const lastSet = ex.sets[ex.sets.length - 1];
        const newSet: DraftSet = {
          id: `set_${uuidv4()}`,
          setNumber: ex.sets.length + 1,
          type: 'WORKING',
          weightText: lastSet ? lastSet.weightText : '0',
          repsText: lastSet ? lastSet.repsText : '10',
          completed: true,
        };
        return {
          ...ex,
          sets: [...ex.sets, newSet],
        };
      })
    );
  };

  const handleToggleIncludeInVolume = (exId: string) => {
    setEditExercises((prev) =>
      prev.map((ex) => (ex.id === exId ? { ...ex, includeInVolume: !ex.includeInVolume } : ex))
    );
  };

  const handleDeleteExercise = (exId: string, exName: string) => {
    showConfirm(
      'Remove Exercise',
      `Remove ${exName} and its sets from this workout session?`,
      () => {
        setEditExercises((prev) => prev.filter((ex) => ex.id !== exId));
      },
      { isDestructive: true, confirmText: 'Remove' }
    );
  };

  const openExercisePicker = async () => {
    if (!db) return;
    if (availableExercises.length === 0) {
      setLoadingExercises(true);
      try {
        const exList = await getAllExercises(db);
        setAvailableExercises(exList);
      } catch (err) {
        console.error('failed to load exercises:', err);
      } finally {
        setLoadingExercises(false);
      }
    }
    setExerciseSearch('');
    setExercisePickerOpen(true);
  };

  const handleSelectExercise = (exercise: Exercise) => {
    const newSeId = `se_${uuidv4()}`;
    const newExercise: DraftExercise = {
      id: newSeId,
      exerciseId: exercise.id,
      exerciseName: exercise.name,
      order: editExercises.length + 1,
      includeInVolume: true,
      sets: [
        {
          id: `set_${uuidv4()}`,
          setNumber: 1,
          type: 'WORKING',
          weightText: '0',
          repsText: '10',
          completed: true,
        },
      ],
    };
    setEditExercises((prev) => [...prev, newExercise]);
    setExercisePickerOpen(false);
  };

  const handleSaveWorkout = async () => {
    if (!db || !session) return;
    if (!editName.trim()) {
      showAlert({
        title: 'Missing Name',
        message: 'Please enter a name for the workout.',
        icon: '⚠️',
      });
      return;
    }

    setIsSaving(true);
    try {
      const startMs = new Date(session.startedAt).getTime();
      const newFinishedAt = new Date(startMs + editMinutes * 60000).toISOString();

      const payload = {
        name: editName.trim(),
        notes: editNotes.trim() || null,
        finishedAt: newFinishedAt,
        exercises: editExercises.map((ex, exIdx) => ({
          id: ex.id,
          exerciseId: ex.exerciseId,
          order: exIdx + 1,
          includeInVolume: ex.includeInVolume,
          sets: ex.sets.map((st, stIdx) => {
            const parsedW = parseFloat(st.weightText) || 0;
            const weightKg = isLb ? convertLbToKg(parsedW) : parsedW;
            const reps = parseInt(st.repsText, 10) || 0;
            return {
              id: st.id,
              setNumber: stIdx + 1,
              type: st.type,
              weightKg,
              reps,
              completed: st.completed,
            };
          }),
        })),
      };

      await updateCompletedWorkoutSession(db, session.id, payload);
      const refreshed = await getSessionById(db, session.id);
      if (refreshed) {
        setSession(refreshed);
      }
      notifyDataChanged();
      setIsEditing(false);
      showAlert({
        title: 'Workout Updated',
        message: 'Your workout values have been saved and personal records recalculated.',
        icon: '✅',
      });
    } catch (err: any) {
      console.error('failed to update workout:', err);
      showAlert({
        title: 'Save Failed',
        message: err.message || 'Could not save workout edits.',
        icon: '⚠️',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = () => {
    if (!db || !id) return;
    showConfirm(
      'Delete Workout Session',
      'Are you sure you want to delete this historical workout? This action cannot be undone and PRs will be recalculated.',
      async () => {
        await deleteSession(db, id);
        notifyDataChanged();
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
      notifyDataChanged();
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

  const filteredPickerExercises = availableExercises.filter((ex) =>
    ex.name.toLowerCase().includes(exerciseSearch.toLowerCase())
  );

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        style={[styles.container, { backgroundColor: colors.background }]}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        {/* top header banner */}
        <View style={[styles.headerCard, { backgroundColor: colors.card, borderColor: isEditing ? colors.primary : colors.border }]}>
          <View style={styles.headerTopRow}>
            <View style={{ flex: 1 }}>
              {isEditing ? (
                <View>
                  <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>WORKOUT NAME</Text>
                  <TextInput
                    style={[
                      styles.nameInput,
                      { backgroundColor: colors.inputBg, borderColor: colors.border, color: colors.text },
                    ]}
                    value={editName}
                    onChangeText={setEditName}
                    placeholder="Workout Name"
                    placeholderTextColor={colors.textSubtle}
                  />
                </View>
              ) : (
                <>
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
                </>
              )}
            </View>

            {/* header action buttons */}
            <View style={styles.headerActionBtns}>
              {isEditing ? (
                <>
                  <TouchableOpacity
                    style={[styles.actionBtnSmall, { backgroundColor: colors.cardAlt, borderColor: colors.border }]}
                    onPress={handleCancelEdit}
                    disabled={isSaving}
                  >
                    <Text style={[styles.actionBtnText, { color: colors.textMuted }]}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.actionBtnSmall, { backgroundColor: colors.primary, borderColor: colors.primary }]}
                    onPress={handleSaveWorkout}
                    disabled={isSaving}
                  >
                    {isSaving ? (
                      <ActivityIndicator size="small" color={colors.primaryText} />
                    ) : (
                      <Text style={[styles.actionBtnText, { color: colors.primaryText, fontWeight: '800' }]}>Save</Text>
                    )}
                  </TouchableOpacity>
                </>
              ) : (
                <>
                  <TouchableOpacity
                    style={[styles.topEditBtn, { backgroundColor: colors.primary }]}
                    onPress={enterEditMode}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.topEditText, { color: colors.primaryText }]}>✏️ Edit</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.topDeleteBtn, { backgroundColor: colors.cardAlt, borderColor: colors.danger }]}
                    onPress={handleDelete}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    <Text style={styles.topDeleteIcon}>🗑️</Text>
                  </TouchableOpacity>
                </>
              )}
            </View>
          </View>

          {/* edit mode duration and notes fields */}
          {isEditing ? (
            <View style={styles.editMetaSection}>
              <View style={styles.editDurationBox}>
                <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>DURATION (MINUTES)</Text>
                <View style={styles.editDurationRow}>
                  <TouchableOpacity
                    style={[styles.adjustPillSmall, { backgroundColor: colors.cardAlt, borderColor: colors.border }]}
                    onPress={() => adjustMinutes(-10)}
                  >
                    <Text style={[styles.adjustPillTextSmall, { color: colors.text }]}>-10m</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.adjustPillSmall, { backgroundColor: colors.cardAlt, borderColor: colors.border }]}
                    onPress={() => adjustMinutes(-5)}
                  >
                    <Text style={[styles.adjustPillTextSmall, { color: colors.text }]}>-5m</Text>
                  </TouchableOpacity>
                  <TextInput
                    style={[
                      styles.minuteInputSmall,
                      { backgroundColor: colors.inputBg, borderColor: colors.border, color: colors.text },
                    ]}
                    keyboardType="numeric"
                    textAlign="center"
                    value={String(editMinutes)}
                    onChangeText={(t) => {
                      const num = parseInt(t, 10);
                      setEditMinutes(isNaN(num) ? 0 : num);
                    }}
                  />
                  <TouchableOpacity
                    style={[styles.adjustPillSmall, { backgroundColor: colors.cardAlt, borderColor: colors.border }]}
                    onPress={() => adjustMinutes(5)}
                  >
                    <Text style={[styles.adjustPillTextSmall, { color: colors.text }]}>+5m</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.adjustPillSmall, { backgroundColor: colors.cardAlt, borderColor: colors.border }]}
                    onPress={() => adjustMinutes(10)}
                  >
                    <Text style={[styles.adjustPillTextSmall, { color: colors.text }]}>+10m</Text>
                  </TouchableOpacity>
                </View>
              </View>

              <View style={{ marginTop: 12 }}>
                <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>WORKOUT NOTES</Text>
                <TextInput
                  style={[
                    styles.notesInput,
                    { backgroundColor: colors.inputBg, borderColor: colors.border, color: colors.text },
                  ]}
                  value={editNotes}
                  onChangeText={setEditNotes}
                  placeholder="Add notes about your workout..."
                  placeholderTextColor={colors.textSubtle}
                  multiline
                />
              </View>
            </View>
          ) : (
            <>
              {/* view mode stats grid */}
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
            </>
          )}
        </View>

        {/* exercise list rendering */}
        {isEditing ? (
          // ================= EDIT MODE EXERCISE LIST =================
          <View style={styles.editExerciseSection}>
            {editExercises.map((ex) => (
              <View key={ex.id} style={[styles.exCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={styles.exCardHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.exTitle, { color: colors.text }]}>{ex.exerciseName}</Text>
                  </View>
                  <View style={styles.exHeaderActions}>
                    <TouchableOpacity
                      style={[
                        styles.volumeTogglePill,
                        {
                          backgroundColor: ex.includeInVolume ? colors.cardAlt : '#2a1a24',
                          borderColor: ex.includeInVolume ? colors.border : colors.danger,
                        },
                      ]}
                      onPress={() => handleToggleIncludeInVolume(ex.id)}
                    >
                      <Text
                        style={[
                          styles.volumeToggleText,
                          { color: ex.includeInVolume ? colors.textMuted : colors.danger },
                        ]}
                      >
                        {ex.includeInVolume ? 'Vol: ON' : 'Vol: OFF'}
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.removeExBtn, { backgroundColor: colors.cardAlt }]}
                      onPress={() => handleDeleteExercise(ex.id, ex.exerciseName)}
                    >
                      <Text style={styles.removeExIcon}>🗑️</Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {/* set edit headers */}
                <View style={styles.setTableHeaderRow}>
                  <Text style={[styles.colHeader, { width: 34, color: colors.textMuted }]}>SET</Text>
                  <Text style={[styles.colHeader, { width: 66, color: colors.textMuted }]}>TYPE</Text>
                  <Text style={[styles.colHeader, { flex: 1, color: colors.textMuted }]}>
                    WEIGHT ({settings.weightUnit})
                  </Text>
                  <Text style={[styles.colHeader, { flex: 1, color: colors.textMuted }]}>REPS</Text>
                  <Text style={[styles.colHeader, { width: 44, textAlign: 'center', color: colors.textMuted }]}>DONE</Text>
                  <Text style={[styles.colHeader, { width: 32 }]}></Text>
                </View>

                {/* set rows */}
                {ex.sets.map((st) => (
                  <View key={st.id} style={[styles.setEditRow, { backgroundColor: colors.cardAlt }]}>
                    <Text style={[styles.setNumText, { width: 34, color: colors.primary }]}>{st.setNumber}</Text>

                    {/* cycle set type button */}
                    <TouchableOpacity
                      style={[styles.typeBadgeBtn, { borderColor: colors.border }]}
                      onPress={() => handleCycleSetType(ex.id, st.id)}
                    >
                      <Text
                        style={[
                          styles.typeBadgeText,
                          {
                            color:
                              st.type === 'WARMUP'
                                ? '#eab308'
                                : st.type === 'DROP_SET'
                                ? colors.primary
                                : st.type === 'FAILURE'
                                ? colors.danger
                                : colors.text,
                          },
                        ]}
                      >
                        {getSetTypeLabel(st.type)}
                      </Text>
                    </TouchableOpacity>

                    {/* weight input */}
                    <TextInput
                      style={[
                        styles.numInput,
                        { backgroundColor: colors.inputBg, borderColor: colors.border, color: colors.text },
                      ]}
                      keyboardType="numeric"
                      value={st.weightText}
                      onChangeText={(t) => handleSetWeightChange(ex.id, st.id, t)}
                    />

                    {/* reps input */}
                    <TextInput
                      style={[
                        styles.numInput,
                        { backgroundColor: colors.inputBg, borderColor: colors.border, color: colors.text },
                      ]}
                      keyboardType="numeric"
                      value={st.repsText}
                      onChangeText={(t) => handleSetRepsChange(ex.id, st.id, t)}
                    />

                    {/* completed toggle checkmark */}
                    <TouchableOpacity
                      style={[
                        styles.doneCheckBtn,
                        {
                          backgroundColor: st.completed ? '#10b981' : colors.card,
                          borderColor: st.completed ? '#10b981' : colors.border,
                        },
                      ]}
                      onPress={() => handleToggleSetCompleted(ex.id, st.id)}
                    >
                      <Text style={[styles.doneCheckText, { color: st.completed ? '#ffffff' : colors.textMuted }]}>
                        ✓
                      </Text>
                    </TouchableOpacity>

                    {/* delete set button */}
                    <TouchableOpacity
                      style={styles.deleteSetBtn}
                      onPress={() => handleDeleteSet(ex.id, st.id)}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <Text style={[styles.deleteSetIcon, { color: colors.danger }]}>✕</Text>
                    </TouchableOpacity>
                  </View>
                ))}

                {/* add set button */}
                <TouchableOpacity
                  style={[styles.addSetRowBtn, { borderColor: colors.border }]}
                  onPress={() => handleAddSet(ex.id)}
                >
                  <Text style={[styles.addSetRowText, { color: colors.primary }]}>+ Add Set</Text>
                </TouchableOpacity>
              </View>
            ))}

            {/* add exercise to session button */}
            <TouchableOpacity
              style={[styles.addExBtn, { backgroundColor: colors.card, borderColor: colors.primary }]}
              onPress={openExercisePicker}
            >
              <Text style={[styles.addExText, { color: colors.primary }]}>+ ADD EXERCISE TO WORKOUT</Text>
            </TouchableOpacity>

            {/* bottom save & cancel bar */}
            <View style={styles.bottomEditBar}>
              <TouchableOpacity
                style={[styles.saveChangesBtn, { backgroundColor: colors.primary }]}
                onPress={handleSaveWorkout}
                disabled={isSaving}
              >
                {isSaving ? (
                  <ActivityIndicator size="small" color={colors.primaryText} />
                ) : (
                  <Text style={[styles.saveChangesText, { color: colors.primaryText }]}>SAVE CHANGES</Text>
                )}
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.cancelChangesBtn, { backgroundColor: colors.cardAlt, borderColor: colors.border }]}
                onPress={handleCancelEdit}
                disabled={isSaving}
              >
                <Text style={[styles.cancelChangesText, { color: colors.textMuted }]}>CANCEL</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          // ================= VIEW MODE EXERCISE LIST =================
          <>
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
                      {st.completed ? (
                        <Text style={[styles.completedIndicator, { color: '#10b981' }]}>✓</Text>
                      ) : (
                        <Text style={[styles.completedIndicator, { color: colors.textSubtle }]}>incomplete</Text>
                      )}
                      {st.type === 'WARMUP' && <Text style={[styles.setTypeText, { color: '#eab308' }]}>[Warmup]</Text>}
                      {st.type === 'DROP_SET' && <Text style={[styles.setTypeText, { color: colors.primary }]}>[Drop Set]</Text>}
                      {st.type === 'FAILURE' && <Text style={[styles.setTypeText, { color: colors.danger }]}>[Failure]</Text>}
                    </View>
                  ))}
                </View>
              </View>
            ))}

            {/* edit and delete buttons in view mode */}
            <TouchableOpacity
              style={[styles.editWorkoutBtn, { backgroundColor: colors.card, borderColor: colors.primary }]}
              onPress={enterEditMode}
            >
              <Text style={[styles.editWorkoutBtnText, { color: colors.primary }]}>✏️ EDIT WORKOUT VALUES & SETS</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.deleteBtn, { backgroundColor: colors.cardAlt, borderColor: colors.danger, borderWidth: 1 }]}
              onPress={handleDelete}
            >
              <Text style={[styles.deleteBtnText, { color: colors.danger }]}>DELETE WORKOUT SESSION</Text>
            </TouchableOpacity>
          </>
        )}

        {/* standalone edit duration modal */}
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

        {/* exercise picker modal */}
        <Modal
          visible={exercisePickerOpen}
          animationType="slide"
          onRequestClose={() => setExercisePickerOpen(false)}
        >
          <View style={[styles.pickerContainer, { backgroundColor: colors.background }]}>
            <View style={[styles.pickerHeader, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
              <Text style={[styles.pickerTitle, { color: colors.text }]}>ADD EXERCISE</Text>
              <TouchableOpacity onPress={() => setExercisePickerOpen(false)}>
                <Text style={[styles.pickerCloseText, { color: colors.primary }]}>Close</Text>
              </TouchableOpacity>
            </View>

            <View style={[styles.pickerSearchRow, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
              <TextInput
                style={[
                  styles.pickerSearchInput,
                  { backgroundColor: colors.inputBg, borderColor: colors.border, color: colors.text },
                ]}
                placeholder="Search exercises..."
                placeholderTextColor={colors.textSubtle}
                value={exerciseSearch}
                onChangeText={setExerciseSearch}
                autoFocus
              />
            </View>

            {loadingExercises ? (
              <View style={styles.centerContainer}>
                <ActivityIndicator size="large" color={colors.primary} />
              </View>
            ) : (
              <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16 }}>
                {filteredPickerExercises.map((ex) => (
                  <TouchableOpacity
                    key={ex.id}
                    style={[styles.pickerItemCard, { backgroundColor: colors.card, borderColor: colors.border }]}
                    onPress={() => handleSelectExercise(ex)}
                  >
                    <View>
                      <Text style={[styles.pickerItemTitle, { color: colors.text }]}>{ex.name}</Text>
                      <Text style={[styles.pickerItemSub, { color: colors.secondary }]}>
                        {ex.primaryMuscle} • {ex.equipment}
                      </Text>
                    </View>
                    <Text style={[styles.pickerItemAdd, { color: colors.primary }]}>+ Add</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}
          </View>
        </Modal>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 60,
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
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  headerActionBtns: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginLeft: 8,
  },
  topEditBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topEditText: {
    fontSize: 13,
    fontWeight: '800',
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
    fontSize: 16,
  },
  actionBtnSmall: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  actionBtnText: {
    fontSize: 13,
    fontWeight: '700',
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
  fieldLabel: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  nameInput: {
    height: 40,
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 10,
    fontSize: 15,
    fontWeight: '700',
  },
  editMetaSection: {
    marginTop: 6,
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(255,255,255,0.1)',
  },
  editDurationBox: {
    marginTop: 4,
  },
  editDurationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  adjustPillSmall: {
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
  },
  adjustPillTextSmall: {
    fontSize: 11,
    fontWeight: '800',
  },
  minuteInputSmall: {
    flex: 1,
    height: 36,
    borderRadius: 6,
    borderWidth: 1,
    fontSize: 14,
    fontWeight: '800',
  },
  notesInput: {
    minHeight: 50,
    borderRadius: 8,
    borderWidth: 1,
    padding: 8,
    fontSize: 13,
    textAlignVertical: 'top',
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
  editExerciseSection: {
    gap: 14,
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
  exHeaderActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  volumeTogglePill: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
  },
  volumeToggleText: {
    fontSize: 11,
    fontWeight: '700',
  },
  removeExBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeExIcon: {
    fontSize: 14,
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
  setTableHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 4,
    marginBottom: 6,
    gap: 6,
  },
  colHeader: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  setEditRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    borderRadius: 8,
    marginBottom: 6,
    gap: 6,
  },
  typeBadgeBtn: {
    width: 66,
    paddingVertical: 5,
    borderRadius: 6,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  typeBadgeText: {
    fontSize: 11,
    fontWeight: '800',
  },
  numInput: {
    flex: 1,
    height: 36,
    borderRadius: 6,
    borderWidth: 1,
    textAlign: 'center',
    fontSize: 14,
    fontWeight: '800',
  },
  doneCheckBtn: {
    width: 44,
    height: 36,
    borderRadius: 6,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  doneCheckText: {
    fontSize: 16,
    fontWeight: '900',
  },
  deleteSetBtn: {
    width: 32,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteSetIcon: {
    fontSize: 14,
    fontWeight: '900',
  },
  addSetRowBtn: {
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderStyle: 'dashed',
    alignItems: 'center',
    marginTop: 4,
  },
  addSetRowText: {
    fontSize: 13,
    fontWeight: '700',
  },
  addExBtn: {
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    alignItems: 'center',
    marginBottom: 10,
  },
  addExText: {
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  bottomEditBar: {
    gap: 8,
    marginTop: 4,
    marginBottom: 20,
  },
  saveChangesBtn: {
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  saveChangesText: {
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  cancelChangesBtn: {
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
  },
  cancelChangesText: {
    fontSize: 13,
    fontWeight: '700',
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
  },
  setValText: {
    fontSize: 14,
    fontWeight: '700',
    flex: 1,
  },
  completedIndicator: {
    fontSize: 12,
    fontWeight: '700',
  },
  setTypeText: {
    fontSize: 11,
    fontWeight: '700',
    textAlign: 'right',
  },
  editWorkoutBtn: {
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1.5,
    alignItems: 'center',
    marginTop: 6,
  },
  editWorkoutBtnText: {
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  deleteBtn: {
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 10,
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
  pickerContainer: {
    flex: 1,
  },
  pickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 48,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  pickerTitle: {
    fontSize: 17,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  pickerCloseText: {
    fontSize: 15,
    fontWeight: '700',
  },
  pickerSearchRow: {
    padding: 12,
    borderBottomWidth: 1,
  },
  pickerSearchInput: {
    height: 42,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    fontSize: 14,
  },
  pickerItemCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 10,
  },
  pickerItemTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  pickerItemSub: {
    fontSize: 12,
    marginTop: 2,
    fontWeight: '600',
  },
  pickerItemAdd: {
    fontSize: 13,
    fontWeight: '800',
  },
});
