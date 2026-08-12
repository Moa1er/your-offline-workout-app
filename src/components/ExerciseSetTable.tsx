// inline exercise logging table for active workout screen

import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Modal } from 'react-native';
import { SessionExercise, WorkoutSet, SetType } from '../types/workout';
import { useWorkout } from '../context/WorkoutContext';
import { useSettings } from '../context/SettingsContext';
import { convertKgToLb, convertLbToKg } from '../utils/calculations';

interface ExerciseSetTableProps {
  exercise: SessionExercise;
}

export const ExerciseSetTable: React.FC<ExerciseSetTableProps> = React.memo(({ exercise }) => {
  const {
    updateSet,
    toggleSetCompleted,
    addSet,
    deleteSet,
    updateExerciseNotes,
    updateExerciseRestTimers,
  } = useWorkout();
  const { settings } = useSettings();

  const [rirModalOpen, setRirModalOpen] = useState(false);

  const isLb = settings.weightUnit === 'lb';
  const setRestSec = exercise.restBetweenSetsSeconds ?? 120;
  const exerciseRestSec = exercise.restAfterExerciseSeconds ?? 120;

  const handleWeightChange = (set: WorkoutSet, text: string) => {
    const num = parseFloat(text) || 0;
    const weightKg = isLb ? convertLbToKg(num) : num;
    updateSet(set.id, { weightKg });
  };

  const handleRepsChange = (set: WorkoutSet, text: string) => {
    const reps = parseInt(text, 10) || 0;
    updateSet(set.id, { reps });
  };

  const handleRirChange = (set: WorkoutSet, text: string) => {
    const rir = text === '' ? null : parseInt(text, 10);
    updateSet(set.id, { rir: rir !== null && !isNaN(rir) ? rir : null });
  };

  const toggleSetType = (set: WorkoutSet) => {
    const types: SetType[] = ['WORKING', 'WARMUP', 'FAILURE', 'DROP_SET'];
    const currentIdx = types.indexOf(set.type);
    const nextType = types[(currentIdx + 1) % types.length];
    updateSet(set.id, { type: nextType });
  };

  const getSetTypeBadge = (type: SetType) => {
    switch (type) {
      case 'WARMUP':
        return { label: 'W', color: '#eab308' };
      case 'FAILURE':
        return { label: 'F', color: '#ef4444' };
      case 'DROP_SET':
        return { label: 'D', color: '#a855f7' };
      default:
        return { label: '', color: '#6366f1' };
    }
  };

  const changeSetRest = (delta: number) => {
    const next = Math.max(0, setRestSec + delta);
    updateExerciseRestTimers(exercise.id, next, exerciseRestSec);
  };

  const changeExerciseRest = (delta: number) => {
    const next = Math.max(0, exerciseRestSec + delta);
    updateExerciseRestTimers(exercise.id, setRestSec, next);
  };

  return (
    <View style={styles.card}>
      {/* exercise title & muscle group header */}
      <View style={styles.headerRow}>
        <Text style={styles.exerciseName}>{exercise.exerciseName}</Text>
        <Text style={styles.muscleBadge}>{exercise.primaryMuscle}</Text>
      </View>

      {/* exercise notes input */}
      <TextInput
        style={styles.notesInput}
        placeholder="Add exercise notes..."
        placeholderTextColor="#64748b"
        value={exercise.notes || ''}
        onChangeText={(t) => updateExerciseNotes(exercise.id, t)}
      />

      {/* custom rest time controls */}
      <View style={styles.restControlsRow}>
        <View style={styles.restPill}>
          <Text style={styles.restPillLabel}>Set Rest:</Text>
          <TouchableOpacity style={styles.stepperBtn} onPress={() => changeSetRest(-15)}>
            <Text style={styles.stepperBtnText}>-</Text>
          </TouchableOpacity>
          <Text style={styles.restPillVal}>{setRestSec}s</Text>
          <TouchableOpacity style={styles.stepperBtn} onPress={() => changeSetRest(15)}>
            <Text style={styles.stepperBtnText}>+</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.restPill}>
          <Text style={styles.restPillLabel}>Ex Rest:</Text>
          <TouchableOpacity style={styles.stepperBtn} onPress={() => changeExerciseRest(-15)}>
            <Text style={styles.stepperBtnText}>-</Text>
          </TouchableOpacity>
          <Text style={styles.restPillVal}>{exerciseRestSec}s</Text>
          <TouchableOpacity style={styles.stepperBtn} onPress={() => changeExerciseRest(15)}>
            <Text style={styles.stepperBtnText}>+</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* table header */}
      <View style={styles.tableHeader}>
        <Text style={[styles.colHeader, { width: 36 }]}>SET</Text>
        <Text style={[styles.colHeader, { flex: 1 }]}>{isLb ? 'LB' : 'KG'}</Text>
        <Text style={[styles.colHeader, { flex: 1 }]}>REPS</Text>
        {settings.showRir && (
          <TouchableOpacity
            style={[styles.colHeaderTouchable, { flex: 0.9 }]}
            onPress={() => setRirModalOpen(true)}
          >
            <Text style={styles.colHeader}>RIR ⓘ</Text>
          </TouchableOpacity>
        )}
        <Text style={[styles.colHeader, { width: 36, textAlign: 'center' }]}>✓</Text>
      </View>

      {/* table rows */}
      {exercise.sets.map((set, idx) => {
        const prevSet = exercise.previousPerformance?.[idx];
        const prevWeightDisplay = prevSet
          ? String(isLb ? convertKgToLb(prevSet.weightKg) : prevSet.weightKg)
          : '0';
        const prevRepsDisplay = prevSet ? String(prevSet.reps) : '0';

        const displayWeight = isLb ? convertKgToLb(set.weightKg) : set.weightKg;
        const typeBadge = getSetTypeBadge(set.type);

        return (
          <View
            key={set.id}
            style={[styles.tableRow, set.completed && styles.completedRow]}
          >
            {/* set number & type toggle */}
            <TouchableOpacity
              style={[styles.setNumBox, { backgroundColor: typeBadge.color }]}
              onPress={() => toggleSetType(set)}
            >
              <Text style={styles.setNumText}>
                {typeBadge.label ? typeBadge.label : set.setNumber}
              </Text>
            </TouchableOpacity>

            {/* weight input with previous weight placeholder */}
            <View style={{ flex: 1 }}>
              <TextInput
                style={styles.numericInput}
                keyboardType="numeric"
                value={displayWeight > 0 ? String(displayWeight) : ''}
                onChangeText={(t) => handleWeightChange(set, t)}
                placeholder={prevWeightDisplay}
                placeholderTextColor="#64748b"
              />
            </View>

            {/* reps input with previous reps placeholder */}
            <View style={{ flex: 1 }}>
              <TextInput
                style={styles.numericInput}
                keyboardType="numeric"
                value={set.reps > 0 ? String(set.reps) : ''}
                onChangeText={(t) => handleRepsChange(set, t)}
                placeholder={prevRepsDisplay}
                placeholderTextColor="#64748b"
              />
            </View>

            {/* rir input */}
            {settings.showRir && (
              <View style={{ flex: 0.9 }}>
                <TextInput
                  style={styles.numericInput}
                  keyboardType="numeric"
                  value={set.rir !== null && set.rir !== undefined ? String(set.rir) : ''}
                  onChangeText={(t) => handleRirChange(set, t)}
                  placeholder="-"
                  placeholderTextColor="#64748b"
                />
              </View>
            )}

            {/* single-tap complete checkmark */}
            <TouchableOpacity
              style={[styles.checkBtn, set.completed && styles.checkBtnActive]}
              onPress={() => toggleSetCompleted(set.id, exercise.exerciseName)}
            >
              <Text style={styles.checkIcon}>{set.completed ? '✓' : ''}</Text>
            </TouchableOpacity>

            {/* delete set button */}
            <TouchableOpacity style={styles.deleteBtn} onPress={() => deleteSet(set.id)}>
              <Text style={styles.deleteText}>×</Text>
            </TouchableOpacity>
          </View>
        );
      })}

      {/* action footer */}
      <View style={styles.footerRow}>
        <TouchableOpacity
          style={styles.addSetBtn}
          onPress={() => {
            const lastSet = exercise.sets[exercise.sets.length - 1];
            addSet(exercise.id, lastSet ? lastSet.weightKg : 0, lastSet ? lastSet.reps : 10);
          }}
        >
          <Text style={styles.addSetText}>+ ADD SET</Text>
        </TouchableOpacity>
      </View>

      {/* rir explanation modal */}
      <Modal
        visible={rirModalOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setRirModalOpen(false)}
      >
        <TouchableOpacity
          style={styles.modalBackdrop}
          activeOpacity={1}
          onPress={() => setRirModalOpen(false)}
        >
          <View style={styles.modalCard} onStartShouldSetResponder={() => true}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>RIR (Reps in Reserve)</Text>
              <TouchableOpacity onPress={() => setRirModalOpen(false)}>
                <Text style={styles.modalCloseText}>✕</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.modalBody}>
              <Text style={styles.modalSubtitle}>What is RIR?</Text>
              <Text style={styles.modalText}>
                RIR stands for Reps in Reserve. It measures how many more repetitions you could have performed with clean form before muscle failure.
              </Text>
              <View style={styles.rirList}>
                <Text style={styles.rirItem}>• <Text style={styles.boldText}>0 RIR</Text>: Absolute failure (0 reps remaining)</Text>
                <Text style={styles.rirItem}>• <Text style={styles.boldText}>1 RIR</Text>: 1 rep remaining in reserve</Text>
                <Text style={styles.rirItem}>• <Text style={styles.boldText}>2 RIR</Text>: 2 reps remaining in reserve</Text>
                <Text style={styles.rirItem}>• <Text style={styles.boldText}>3 RIR</Text>: 3 reps remaining in reserve</Text>
              </View>
              <Text style={styles.modalSubtitle}>Why is it useful?</Text>
              <Text style={styles.modalText}>
                RIR lets you auto-regulate workout intensity, track strength progress even if weight stays constant, and avoid overtraining or injury!
              </Text>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
});
ExerciseSetTable.displayName = 'ExerciseSetTable';

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#1e293b',
    borderRadius: 14,
    padding: 14,
    marginBottom: 14,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  exerciseName: {
    color: '#f8fafc',
    fontSize: 16,
    fontWeight: '700',
    flex: 1,
  },
  muscleBadge: {
    color: '#38bdf8',
    backgroundColor: '#0c4a6e',
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderRadius: 6,
    fontSize: 10,
    fontWeight: '700',
  },
  notesInput: {
    backgroundColor: '#0f172a',
    color: '#f8fafc',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    fontSize: 13,
    borderWidth: 1,
    borderColor: '#334155',
    marginBottom: 8,
  },
  restControlsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10,
  },
  restPill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0f172a',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: '#334155',
    justifyContent: 'space-between',
  },
  restPillLabel: {
    color: '#64748b',
    fontSize: 11,
    fontWeight: '700',
  },
  restPillVal: {
    color: '#38bdf8',
    fontSize: 12,
    fontWeight: '800',
    marginHorizontal: 4,
  },
  stepperBtn: {
    backgroundColor: '#334155',
    width: 22,
    height: 22,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperBtnText: {
    color: '#f8fafc',
    fontSize: 13,
    fontWeight: '800',
  },
  tableHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
    marginBottom: 6,
    gap: 6,
  },
  colHeader: {
    color: '#64748b',
    fontSize: 11,
    fontWeight: '700',
  },
  colHeaderTouchable: {
    justifyContent: 'center',
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
    gap: 6,
  },
  completedRow: {
    backgroundColor: '#064e3b15',
  },
  setNumBox: {
    width: 28,
    height: 28,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  setNumText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '800',
  },
  numericInput: {
    backgroundColor: '#0f172a',
    color: '#f8fafc',
    textAlign: 'center',
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 4,
    fontSize: 15,
    fontWeight: '700',
    borderColor: '#334155',
    borderWidth: 1,
  },
  checkBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: '#475569',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0f172a',
  },
  checkBtnActive: {
    backgroundColor: '#10b981',
    borderColor: '#10b981',
  },
  checkIcon: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '800',
  },
  deleteBtn: {
    width: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteText: {
    color: '#64748b',
    fontSize: 18,
  },
  footerRow: {
    marginTop: 10,
    alignItems: 'flex-start',
  },
  addSetBtn: {
    backgroundColor: '#0f172a',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#334155',
  },
  addSetText: {
    color: '#38bdf8',
    fontSize: 12,
    fontWeight: '700',
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
    backgroundColor: '#1e293b',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#334155',
    padding: 16,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
    paddingBottom: 10,
  },
  modalTitle: {
    color: '#f8fafc',
    fontSize: 17,
    fontWeight: '800',
  },
  modalCloseText: {
    color: '#94a3b8',
    fontSize: 18,
    fontWeight: '700',
  },
  modalBody: {},
  modalSubtitle: {
    color: '#38bdf8',
    fontSize: 14,
    fontWeight: '800',
    marginTop: 6,
    marginBottom: 4,
  },
  modalText: {
    color: '#cbd5e1',
    fontSize: 13,
    lineHeight: 18,
  },
  rirList: {
    marginVertical: 8,
    backgroundColor: '#0f172a',
    padding: 10,
    borderRadius: 8,
    gap: 4,
  },
  rirItem: {
    color: '#94a3b8',
    fontSize: 13,
  },
  boldText: {
    color: '#ffffff',
    fontWeight: '700',
  },
});
