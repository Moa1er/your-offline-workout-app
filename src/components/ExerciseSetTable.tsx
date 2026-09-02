// inline exercise logging table with ultra-fast local state set inputs and record modal

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Keyboard } from 'react-native';
import { SessionExercise, WorkoutSet, SetType } from '../types/workout';
import { useWorkout } from '../context/WorkoutContext';
import { useSettings } from '../context/SettingsContext';
import { useAppTheme } from '../context/ThemeContext';
import { useDatabase } from '../context/DatabaseContext';
import { convertKgToLb, convertLbToKg } from '../utils/calculations';
import { getExerciseHistoricalBest, ExerciseHistoricalBest, HitRecordInfo } from '../utils/recordDetector';
import { RecordDetailModal } from './RecordDetailModal';

interface SetRowItemProps {
  set: WorkoutSet;
  prevSet?: WorkoutSet;
  isLb: boolean;
  historicalBest: ExerciseHistoricalBest | null;
  exerciseName: string;
  colors: any;
  onUpdateSet: (setId: string, updates: Partial<WorkoutSet>) => void;
  onToggleCompleted: (setId: string, exerciseName?: string) => void;
  onDeleteSet: (setId: string) => void;
  onOpenRecord: (record: HitRecordInfo) => void;
}

const SetRowItem: React.FC<SetRowItemProps> = React.memo(({
  set,
  prevSet,
  isLb,
  historicalBest,
  exerciseName,
  colors,
  onUpdateSet,
  onToggleCompleted,
  onDeleteSet,
  onOpenRecord,
}) => {
  const displayWeight = isLb ? convertKgToLb(set.weightKg) : set.weightKg;

  // local independent string states for instant zero-lag typing
  const [weightText, setWeightText] = useState(() => (displayWeight > 0 ? String(displayWeight) : ''));
  const [repsText, setRepsText] = useState(() => (set.reps > 0 ? String(set.reps) : ''));

  const isFocusedRef = useRef<{ weight: boolean; reps: boolean }>({
    weight: false,
    reps: false,
  });

  const debounceTimerRef = useRef<{ weight?: any; reps?: any }>({});

  // sync from external props only if input is NOT actively focused
  useEffect(() => {
    if (!isFocusedRef.current.weight) {
      setWeightText(displayWeight > 0 ? String(displayWeight) : '');
    }
  }, [displayWeight]);

  useEffect(() => {
    if (!isFocusedRef.current.reps) {
      setRepsText(set.reps > 0 ? String(set.reps) : '');
    }
  }, [set.reps]);

  const handleWeightChange = (text: string) => {
    setWeightText(text);
    if (debounceTimerRef.current.weight) clearTimeout(debounceTimerRef.current.weight);
    debounceTimerRef.current.weight = setTimeout(() => {
      const num = parseFloat(text) || 0;
      const weightKg = isLb ? convertLbToKg(num) : num;
      onUpdateSet(set.id, { weightKg });
    }, 200);
  };

  const handleWeightBlur = () => {
    isFocusedRef.current.weight = false;
    if (debounceTimerRef.current.weight) clearTimeout(debounceTimerRef.current.weight);
    const num = parseFloat(weightText) || 0;
    const weightKg = isLb ? convertLbToKg(num) : num;
    onUpdateSet(set.id, { weightKg });
  };

  const handleRepsChange = (text: string) => {
    setRepsText(text);
    if (debounceTimerRef.current.reps) clearTimeout(debounceTimerRef.current.reps);
    debounceTimerRef.current.reps = setTimeout(() => {
      const reps = parseInt(text, 10) || 0;
      onUpdateSet(set.id, { reps });
    }, 200);
  };

  const handleRepsBlur = () => {
    isFocusedRef.current.reps = false;
    if (debounceTimerRef.current.reps) clearTimeout(debounceTimerRef.current.reps);
    const reps = parseInt(repsText, 10) || 0;
    onUpdateSet(set.id, { reps });
  };

  const toggleSetType = () => {
    const types: SetType[] = ['WORKING', 'WARMUP', 'FAILURE', 'DROP_SET'];
    const currentIdx = types.indexOf(set.type);
    const nextType = types[(currentIdx + 1) % types.length];
    onUpdateSet(set.id, { type: nextType });
  };

  const getSetTypeBadge = (type: SetType) => {
    switch (type) {
      case 'WARMUP':
        return { label: 'W', color: '#eab308' };
      case 'FAILURE':
        return { label: 'F', color: colors.danger };
      case 'DROP_SET':
        return { label: 'D', color: colors.primary };
      default:
        return { label: '', color: colors.text };
    }
  };

  const prevWeightDisplay = prevSet
    ? String(isLb ? convertKgToLb(prevSet.weightKg) : prevSet.weightKg)
    : '0';
  const prevRepsDisplay = prevSet ? String(prevSet.reps) : '0';
  const typeBadge = getSetTypeBadge(set.type);

  // trophy evaluates volume per set (weight * reps), not just raw reps count
  const prevSetVol = prevSet ? prevSet.weightKg * prevSet.reps : 0;
  const setVol = set.weightKg * set.reps;
  const isSetVolRecord =
    set.completed &&
    set.type !== 'WARMUP' &&
    setVol > 0 &&
    ((historicalBest && historicalBest.bestSetVolume > 0 && setVol > historicalBest.bestSetVolume) ||
      (prevSetVol > 0 && setVol > prevSetVol));

  return (
    <View
      style={[
        styles.tableRow,
        { borderBottomColor: colors.border },
        set.completed && { backgroundColor: '#2563eb12' },
      ]}
    >
      {/* set number cell with normal white/input background like other cells */}
      <TouchableOpacity
        style={[
          styles.setNumBox,
          {
            backgroundColor: colors.inputBg,
            borderColor: colors.inputBorder,
            borderWidth: 1,
          },
        ]}
        onPress={() => {
          if (isSetVolRecord) {
            onOpenRecord({
              type: 'SET_VOLUME',
              title: 'Best Set Volume Record',
              badge: '🏆 PR',
              exerciseName,
              currentValue: setVol,
              previousBest: historicalBest?.bestSetVolume || prevSetVol,
              improvement: setVol - (historicalBest?.bestSetVolume || prevSetVol),
              improvementPercent:
                (((setVol - (historicalBest?.bestSetVolume || prevSetVol)) /
                  (historicalBest?.bestSetVolume || prevSetVol || 1)) *
                  100),
            });
          } else {
            toggleSetType();
          }
        }}
      >
        <Text
          style={[
            styles.setNumText,
            { color: isSetVolRecord ? '#eab308' : typeBadge.label ? typeBadge.color : colors.text },
          ]}
        >
          {isSetVolRecord
            ? '🏆'
            : typeBadge.label
            ? typeBadge.label
            : set.setNumber}
        </Text>
      </TouchableOpacity>

      {/* weight input */}
      <View style={{ flex: 1 }}>
        <TextInput
          style={[
            styles.numericInput,
            { backgroundColor: colors.inputBg, borderColor: colors.inputBorder, color: colors.text },
          ]}
          keyboardType="numeric"
          textAlign="center"
          textAlignVertical="center"
          scrollEnabled={false}
          value={weightText}
          onFocus={() => {
            isFocusedRef.current.weight = true;
          }}
          onChangeText={handleWeightChange}
          onBlur={handleWeightBlur}
          placeholder={prevWeightDisplay}
          placeholderTextColor={colors.textSubtle}
        />
      </View>

      {/* reps input */}
      <View style={{ flex: 1 }}>
        <TextInput
          style={[
            styles.numericInput,
            { backgroundColor: colors.inputBg, borderColor: colors.inputBorder, color: colors.text },
          ]}
          keyboardType="numeric"
          textAlign="center"
          textAlignVertical="center"
          scrollEnabled={false}
          value={repsText}
          onFocus={() => {
            isFocusedRef.current.reps = true;
          }}
          onChangeText={handleRepsChange}
          onBlur={handleRepsBlur}
          placeholder={prevRepsDisplay}
          placeholderTextColor={colors.textSubtle}
        />
      </View>

      {/* single-tap complete checkmark with blue active background & keyboard dismiss */}
      <TouchableOpacity
        style={[
          styles.checkBtn,
          { backgroundColor: colors.cardAlt, borderColor: colors.border },
          set.completed && { backgroundColor: '#2563eb', borderColor: '#2563eb' },
        ]}
        onPress={() => {
          // dismiss keyboard on checkmark tap
          Keyboard.dismiss();
          onToggleCompleted(set.id, exerciseName);
        }}
      >
        <Text
          style={[
            styles.checkBtnText,
            { color: colors.textMuted },
            set.completed && { color: '#ffffff', fontWeight: '900' },
          ]}
        >
          ✓
        </Text>
      </TouchableOpacity>

      {/* delete set button */}
      <TouchableOpacity style={styles.deleteBtn} onPress={() => onDeleteSet(set.id)}>
        <Text style={[styles.deleteBtnText, { color: colors.textSubtle }]}>×</Text>
      </TouchableOpacity>
    </View>
  );
});
SetRowItem.displayName = 'SetRowItem';

interface ExerciseSetTableProps {
  exercise: SessionExercise;
}

export const ExerciseSetTable: React.FC<ExerciseSetTableProps> = React.memo(({ exercise }) => {
  const {
    activeSession,
    updateSet,
    toggleSetCompleted,
    addSet,
    deleteSet,
    updateExerciseNotes,
    updateExerciseRestTimers,
    toggleExerciseIncludeInVolume,
  } = useWorkout();
  const { settings } = useSettings();
  const { colors } = useAppTheme();
  const { db } = useDatabase();

  const [historicalBest, setHistoricalBest] = useState<ExerciseHistoricalBest | null>(null);
  const [selectedRecord, setSelectedRecord] = useState<HitRecordInfo | null>(null);

  const isLb = settings.weightUnit === 'lb';
  const setRestSec = exercise.restBetweenSetsSeconds ?? 120;
  const exerciseRestSec = exercise.restAfterExerciseSeconds ?? 120;
  const isIncludedInVolume = exercise.includeInVolume !== false;

  // fetch historical records for this exercise
  useEffect(() => {
    if (!db || !exercise.exerciseId) return;
    let cancelled = false;
    getExerciseHistoricalBest(db, exercise.exerciseId, activeSession?.id).then((best) => {
      if (!cancelled) {
        setHistoricalBest(best);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [db, exercise.exerciseId, activeSession?.id]);

  // compute previous workout volume for this exercise
  const previousVolumeKg = (exercise.previousPerformance || [])
    .filter((s) => s.type !== 'WARMUP')
    .reduce((sum, s) => sum + s.weightKg * s.reps, 0);

  // compute current session volume accumulating as user checks sets
  const currentVolumeKg = exercise.sets
    .filter((s) => s.completed && s.type !== 'WARMUP' && isIncludedInVolume)
    .reduce((sum, s) => sum + s.weightKg * s.reps, 0);

  const displayPrevVol = Math.round(isLb ? convertKgToLb(previousVolumeKg) : previousVolumeKg);
  const displayCurrVol = Math.round(isLb ? convertKgToLb(currentVolumeKg) : currentVolumeKg);

  // color coding for current volume: red if below, green if above, blue if same
  let currentVolColor = colors.text;
  if (displayPrevVol > 0) {
    if (displayCurrVol < displayPrevVol) {
      currentVolColor = '#ef4444';
    } else if (displayCurrVol > displayPrevVol) {
      currentVolColor = '#10b981';
    } else {
      currentVolColor = '#2563eb';
    }
  } else if (displayCurrVol > 0) {
    currentVolColor = '#10b981';
  }

  const isVolumeRecord =
    historicalBest &&
    historicalBest.maxExerciseVolume > 0 &&
    currentVolumeKg > historicalBest.maxExerciseVolume;

  const changeSetRest = (delta: number) => {
    const next = Math.max(0, setRestSec + delta);
    updateExerciseRestTimers(exercise.id, next, exerciseRestSec);
  };

  const changeExerciseRest = (delta: number) => {
    const next = Math.max(0, exerciseRestSec + delta);
    updateExerciseRestTimers(exercise.id, setRestSec, next);
  };

  const handleOpenRecord = useCallback((rec: HitRecordInfo) => {
    setSelectedRecord(rec);
  }, []);

  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: isVolumeRecord ? '#f59e0b' : colors.border }]}>
      {/* exercise title & muscle group header */}
      <View style={styles.headerRow}>
        <View style={styles.headerLeft}>
          <Text style={[styles.exerciseName, { color: colors.text }]}>{exercise.exerciseName}</Text>
          <Text
            style={[
              styles.muscleBadge,
              { backgroundColor: colors.cardAlt, color: colors.secondary, borderColor: colors.border },
            ]}
          >
            {exercise.primaryMuscle}
          </Text>
        </View>

        <View style={styles.headerRight}>
          {/* previous and current volume comparison pill */}
          <View style={[styles.volumePill, { backgroundColor: colors.cardAlt, borderColor: colors.border }]}>
            <Text style={[styles.volumeLabel, { color: colors.textMuted }]}>
              P: <Text style={{ color: colors.text, fontWeight: '700' }}>{displayPrevVol}</Text>
            </Text>
            <Text style={[styles.volumeLabel, { color: colors.textMuted, marginLeft: 8 }]}>
              C: <Text style={{ color: currentVolColor, fontWeight: '800' }}>{displayCurrVol}</Text>
            </Text>
          </View>

          {/* celebratory volume record badge */}
          {isVolumeRecord && (
            <TouchableOpacity
              style={[styles.recordChip, { backgroundColor: '#f59e0b20', borderColor: '#f59e0b' }]}
              onPress={() =>
                setSelectedRecord({
                  type: 'EXERCISE_VOLUME',
                  title: 'Exercise Volume Record',
                  badge: '🏆 BEST VOLUME',
                  exerciseName: exercise.exerciseName,
                  currentValue: currentVolumeKg,
                  previousBest: historicalBest?.maxExerciseVolume ?? 0,
                  improvement: currentVolumeKg - (historicalBest?.maxExerciseVolume ?? 0),
                  improvementPercent:
                    ((currentVolumeKg - (historicalBest?.maxExerciseVolume ?? 0)) /
                      (historicalBest?.maxExerciseVolume || 1)) *
                    100,
                })
              }
              activeOpacity={0.8}
            >
              <Text style={[styles.recordChipText, { color: '#f59e0b' }]}>🏆 BEST</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* exercise notes input */}
      <TextInput
        style={[
          styles.notesInput,
          { backgroundColor: colors.inputBg, borderColor: colors.inputBorder, color: colors.text },
        ]}
        placeholder="Add exercise notes..."
        placeholderTextColor={colors.textSubtle}
        value={exercise.notes || ''}
        onChangeText={(t) => updateExerciseNotes(exercise.id, t)}
      />

      {/* volume count checkbox toggle */}
      <TouchableOpacity
        style={styles.volumeToggleRow}
        onPress={() => toggleExerciseIncludeInVolume(exercise.id)}
        activeOpacity={0.7}
      >
        <View
          style={[
            styles.checkbox,
            { borderColor: isIncludedInVolume ? colors.primary : colors.textSubtle },
            isIncludedInVolume && { backgroundColor: colors.primary },
          ]}
        >
          {isIncludedInVolume && <Text style={[styles.checkMark, { color: colors.primaryText }]}>✓</Text>}
        </View>
        <Text style={[styles.volumeToggleLabel, { color: isIncludedInVolume ? colors.text : colors.textSubtle }]}>
          {isIncludedInVolume ? 'Count in session volume' : 'Excluded from session volume'}
        </Text>
      </TouchableOpacity>

      {/* custom rest time controls */}
      <View style={styles.restControlsRow}>
        <View style={[styles.restPill, { backgroundColor: colors.cardAlt, borderColor: colors.border }]}>
          <Text style={[styles.restPillLabel, { color: colors.textMuted }]}>Set Rest:</Text>
          <TouchableOpacity
            style={[styles.stepperBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
            onPress={() => changeSetRest(-15)}
          >
            <Text style={[styles.stepperBtnText, { color: colors.text }]}>-</Text>
          </TouchableOpacity>
          <Text style={[styles.restPillVal, { color: colors.secondary }]}>{setRestSec}s</Text>
          <TouchableOpacity
            style={[styles.stepperBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
            onPress={() => changeSetRest(15)}
          >
            <Text style={[styles.stepperBtnText, { color: colors.text }]}>+</Text>
          </TouchableOpacity>
        </View>

        <View style={[styles.restPill, { backgroundColor: colors.cardAlt, borderColor: colors.border }]}>
          <Text style={[styles.restPillLabel, { color: colors.textMuted }]}>Ex Rest:</Text>
          <TouchableOpacity
            style={[styles.stepperBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
            onPress={() => changeExerciseRest(-15)}
          >
            <Text style={[styles.stepperBtnText, { color: colors.text }]}>-</Text>
          </TouchableOpacity>
          <Text style={[styles.restPillVal, { color: colors.secondary }]}>{exerciseRestSec}s</Text>
          <TouchableOpacity
            style={[styles.stepperBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
            onPress={() => changeExerciseRest(15)}
          >
            <Text style={[styles.stepperBtnText, { color: colors.text }]}>+</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* table header */}
      <View style={[styles.tableHeader, { borderBottomColor: colors.border }]}>
        <Text style={[styles.colHeader, { width: 36, color: colors.textMuted }]}>SET</Text>
        <Text style={[styles.colHeader, { flex: 1, color: colors.textMuted }]}>{isLb ? 'LB' : 'KG'}</Text>
        <Text style={[styles.colHeader, { flex: 1, color: colors.textMuted }]}>REPS</Text>
        <Text style={[styles.colHeader, { width: 36, textAlign: 'center', color: colors.textMuted }]}>✓</Text>
      </View>

      {/* table rows with independent fast state */}
      {exercise.sets.map((set, idx) => (
        <SetRowItem
          key={set.id}
          set={set}
          prevSet={exercise.previousPerformance?.[idx]}
          isLb={isLb}
          historicalBest={historicalBest}
          exerciseName={exercise.exerciseName || ''}
          colors={colors}
          onUpdateSet={updateSet}
          onToggleCompleted={toggleSetCompleted}
          onDeleteSet={deleteSet}
          onOpenRecord={handleOpenRecord}
        />
      ))}

      {/* add set button */}
      <TouchableOpacity
        style={[styles.addSetBtn, { backgroundColor: colors.cardAlt, borderColor: colors.border }]}
        onPress={() => addSet(exercise.id)}
      >
        <Text style={[styles.addSetText, { color: colors.primary }]}>+ ADD SET</Text>
      </TouchableOpacity>

      {/* record celebratory modal */}
      <RecordDetailModal
        visible={!!selectedRecord}
        onClose={() => setSelectedRecord(null)}
        record={selectedRecord}
      />
    </View>
  );
});

ExerciseSetTable.displayName = 'ExerciseSetTable';

const styles = StyleSheet.create({
  card: {
    borderRadius: 14,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1.5,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
    flexWrap: 'wrap',
  },
  exerciseName: {
    fontSize: 16,
    fontWeight: '800',
  },
  muscleBadge: {
    fontSize: 10,
    fontWeight: '800',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  volumePill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
  },
  volumeLabel: {
    fontSize: 11,
    fontWeight: '700',
  },
  recordChip: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  recordChipText: {
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  notesInput: {
    borderRadius: 8,
    padding: 8,
    fontSize: 13,
    borderWidth: 1,
    marginBottom: 8,
  },
  volumeToggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    gap: 8,
  },
  checkbox: {
    width: 18,
    height: 18,
    borderRadius: 5,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkMark: {
    fontSize: 11,
    fontWeight: '900',
  },
  volumeToggleLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  restControlsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  restPill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
  },
  restPillLabel: {
    fontSize: 11,
    fontWeight: '700',
  },
  restPillVal: {
    fontSize: 12,
    fontWeight: '800',
  },
  stepperBtn: {
    width: 22,
    height: 22,
    borderRadius: 5,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperBtnText: {
    fontSize: 13,
    fontWeight: '800',
  },
  tableHeader: {
    flexDirection: 'row',
    paddingBottom: 6,
    marginBottom: 6,
    borderBottomWidth: 1,
    alignItems: 'center',
    gap: 6,
  },
  colHeader: {
    fontSize: 11,
    fontWeight: '800',
    textAlign: 'center',
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 5,
    borderBottomWidth: 1,
    gap: 6,
    borderRadius: 6,
    paddingHorizontal: 2,
  },
  setNumBox: {
    width: 36,
    height: 32,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  setNumText: {
    color: '#000000',
    fontWeight: '900',
    fontSize: 12,
  },
  numericInput: {
    height: 34,
    borderRadius: 6,
    textAlign: 'center',
    textAlignVertical: 'center',
    paddingVertical: 0,
    paddingHorizontal: 0,
    includeFontPadding: false,
    fontWeight: '700',
    fontSize: 14,
    borderWidth: 1,
  },
  checkBtn: {
    width: 36,
    height: 32,
    borderRadius: 6,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkBtnText: {
    fontSize: 15,
    fontWeight: '700',
  },
  deleteBtn: {
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteBtnText: {
    fontSize: 18,
    fontWeight: '700',
  },
  addSetBtn: {
    marginTop: 10,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
  },
  addSetText: {
    fontWeight: '800',
    fontSize: 12,
    letterSpacing: 0.5,
  },
});
