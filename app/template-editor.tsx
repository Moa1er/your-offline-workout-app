// create and edit workout template screen with single target reps, rest controls, and science guide

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useDatabase } from '../src/context/DatabaseContext';
import { useAppTheme } from '../src/context/ThemeContext';
import { WorkoutTemplate, TemplateExercise, Exercise } from '../src/types/workout';
import { getTemplateById, saveTemplate } from '../src/database/queries/templateQueries';
import { getAllExercises } from '../src/database/queries/exerciseQueries';
import { ScienceGuidelinesModal } from '../src/components/ScienceGuidelinesModal';
import { useAppAlert } from '../src/context/AlertContext';
import { generateId as uuidv4 } from '../src/utils/uuid';

export default function TemplateEditorScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { db, isReady } = useDatabase();
  const { colors } = useAppTheme();
  const { showAlert } = useAppAlert();
  const router = useRouter();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [exercises, setExercises] = useState<TemplateExercise[]>([]);
  const [loading, setLoading] = useState(true);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerLoading, setPickerLoading] = useState(false);
  const [pickerSearch, setPickerSearch] = useState('');
  const [pickerExercises, setPickerExercises] = useState<Exercise[]>([]);
  const [scienceModalVisible, setScienceModalVisible] = useState(false);

  useEffect(() => {
    if (!db || !isReady) return;
    let cancelled = false;
    (async () => {
      if (id) {
        const t = await getTemplateById(db, id);
        if (!cancelled && t) {
          setName(t.name);
          setDescription(t.description || '');
          setExercises(
            t.exercises.map((e) => ({
              ...e,
              targetReps: e.targetReps ?? e.repMax ?? e.repMin ?? 10,
              restBetweenSetsSeconds: e.restBetweenSetsSeconds ?? 120,
              restAfterExerciseSeconds: e.restAfterExerciseSeconds ?? 120,
            }))
          );
        }
      }
      if (!cancelled) setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [db, isReady, id]);

  const handleSave = async () => {
    if (!name.trim()) {
      showAlert({
        title: 'Validation Error',
        message: 'Please enter a routine name for this template.',
        icon: '⚠️',
      });
      return;
    }
    if (exercises.length === 0) {
      showAlert({
        title: 'Validation Error',
        message: 'Please add at least one exercise to the template before saving.',
        icon: '⚠️',
      });
      return;
    }
    if (!db) return;

    const templateId = id || `template_${uuidv4()}`;
    const tmpl: WorkoutTemplate = {
      id: templateId,
      name: name.trim(),
      description: description.trim() || null,
      exercises: exercises.map((e, idx) => ({
        ...e,
        order: idx + 1,
        targetSets: e.targetSets || 3,
        targetReps: e.targetReps || 10,
        repMin: e.targetReps || 10,
        repMax: e.targetReps || 10,
        restBetweenSetsSeconds: e.restBetweenSetsSeconds !== undefined ? e.restBetweenSetsSeconds : 120,
        restAfterExerciseSeconds: e.restAfterExerciseSeconds !== undefined ? e.restAfterExerciseSeconds : 120,
        includeInVolume: e.includeInVolume !== false,
      })),
    };

    await saveTemplate(db, tmpl);
    router.replace('/(tabs)/templates');
  };

  const removeExercise = (idx: number) => {
    setExercises(exercises.filter((_, i) => i !== idx));
  };

  const moveExercise = (fromIdx: number, toIdx: number) => {
    if (toIdx < 0 || toIdx >= exercises.length) return;
    const updated = [...exercises];
    const item = updated.splice(fromIdx, 1)[0];
    updated.splice(toIdx, 0, item);
    setExercises(updated.map((ex, i) => ({ ...ex, order: i + 1 })));
  };

  const openExercisePicker = async () => {
    setPickerOpen(true);
    if (pickerExercises.length === 0 && db) {
      setPickerLoading(true);
      try {
        const allEx = await getAllExercises(db);
        setPickerExercises(allEx);
      } catch (err) {
        console.error('error loading exercises for picker:', err);
      } finally {
        setPickerLoading(false);
      }
    }
  };

  const addExercise = (ex: Exercise) => {
    const newTe: TemplateExercise = {
      id: uuidv4(),
      exerciseId: ex.id,
      exerciseName: ex.name,
      order: exercises.length + 1,
      targetSets: 3,
      targetReps: 10,
      repMin: 10,
      repMax: 10,
      targetRir: 2,
      restBetweenSetsSeconds: 120,
      restAfterExerciseSeconds: 120,
      includeInVolume: true,
    };
    setExercises([...exercises, newTe]);
    setPickerOpen(false);
    setPickerSearch('');
  };

  const updateExerciseField = (
    idx: number,
    field: keyof TemplateExercise,
    value: any
  ) => {
    const updated = [...exercises];
    updated[idx] = { ...updated[idx], [field]: value };
    setExercises(updated);
  };

  const adjustRestTime = (
    idx: number,
    field: 'restBetweenSetsSeconds' | 'restAfterExerciseSeconds',
    delta: number
  ) => {
    const current = exercises[idx][field] ?? 120;
    const next = Math.max(0, current + delta);
    updateExerciseField(idx, field, next);
  };

  const filteredPickerExercises = pickerExercises.filter((ex) =>
    ex.name.toLowerCase().includes(pickerSearch.toLowerCase())
  );

  if (loading) {
    return (
      <View style={[styles.centerContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]} contentContainerStyle={styles.content}>
      {/* prominent science guide banner */}
      <TouchableOpacity
        style={[styles.guideBanner, { backgroundColor: colors.card, borderColor: colors.secondary }]}
        onPress={() => setScienceModalVisible(true)}
        activeOpacity={0.8}
      >
        <View style={styles.guideIconCircle}>
          <Text style={styles.guideEmoji}>💡</Text>
        </View>
        <View style={styles.guideBannerTextContainer}>
          <Text style={[styles.guideBannerTitle, { color: colors.secondary }]}>
            WORKOUT DESIGN & SCIENCE GUIDE
          </Text>
          <Text style={[styles.guideBannerSub, { color: colors.textMuted }]}>
            Optimal sets (10-20/wk), reps (6-20 @ 1-3 RIR), and rest (2-3+ min compound)
          </Text>
        </View>
        <Text style={[styles.guideArrow, { color: colors.secondary }]}>→</Text>
      </TouchableOpacity>

      <Text style={[styles.sectionHeader, { color: colors.textMuted }]}>TEMPLATE DETAILS</Text>

      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.label, { color: colors.textMuted }]}>Routine Name</Text>
        <TextInput
          style={[styles.textInput, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder, color: colors.text }]}
          value={name}
          onChangeText={setName}
          placeholder="e.g. Full Upper Body"
          placeholderTextColor={colors.textSubtle}
        />

        <Text style={[styles.label, { color: colors.textMuted }]}>Description (Optional)</Text>
        <TextInput
          style={[styles.textInput, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder, color: colors.text }]}
          value={description}
          onChangeText={setDescription}
          placeholder="e.g. Focus on chest and lats"
          placeholderTextColor={colors.textSubtle}
        />
      </View>

      <View style={styles.exHeaderRow}>
        <Text style={[styles.sectionHeader, { color: colors.textMuted }]}>EXERCISES ({exercises.length})</Text>
        <TouchableOpacity
          style={[styles.addExBtn, { backgroundColor: colors.cardAlt, borderColor: colors.border, borderWidth: 1 }]}
          onPress={openExercisePicker}
        >
          <Text style={[styles.addExText, { color: colors.primary }]}>+ ADD EXERCISE</Text>
        </TouchableOpacity>
      </View>

      {exercises.map((te, idx) => {
        const setRest = te.restBetweenSetsSeconds !== undefined ? te.restBetweenSetsSeconds : 120;
        const exRest = te.restAfterExerciseSeconds !== undefined ? te.restAfterExerciseSeconds : 120;

        return (
          <View key={te.id || idx} style={[styles.exCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.exCardHeader}>
              <Text style={[styles.exOrderText, { color: colors.primary }]}>{idx + 1}.</Text>
              <Text style={[styles.exTitle, { color: colors.text }]}>{te.exerciseName || 'Exercise'}</Text>
              <View style={styles.reorderBtns}>
                {idx > 0 && (
                  <TouchableOpacity onPress={() => moveExercise(idx, idx - 1)}>
                    <Text style={[styles.arrowBtn, { color: colors.textMuted }]}>▲</Text>
                  </TouchableOpacity>
                )}
                {idx < exercises.length - 1 && (
                  <TouchableOpacity onPress={() => moveExercise(idx, idx + 1)}>
                    <Text style={[styles.arrowBtn, { color: colors.textMuted }]}>▼</Text>
                  </TouchableOpacity>
                )}
              </View>
              <TouchableOpacity onPress={() => removeExercise(idx)}>
                <Text style={[styles.deleteExText, { color: colors.danger }]}>×</Text>
              </TouchableOpacity>
            </View>

            {/* sets and reps controls */}
            <View style={styles.targetGrid}>
              <View style={[styles.targetBox, { backgroundColor: colors.cardAlt }]}>
                <Text style={[styles.targetLabel, { color: colors.textMuted }]}>Target Sets</Text>
                <View style={styles.stepperInputRow}>
                  <TouchableOpacity
                    style={[styles.stepperBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
                    onPress={() => updateExerciseField(idx, 'targetSets', Math.max(1, (te.targetSets || 3) - 1))}
                  >
                    <Text style={[styles.stepperBtnText, { color: colors.text }]}>-</Text>
                  </TouchableOpacity>
                  <TextInput
                    style={[styles.smallInput, { color: colors.text }]}
                    keyboardType="numeric"
                    value={String(te.targetSets || 3)}
                    onChangeText={(t) => {
                      const num = parseInt(t.replace(/[^0-9]/g, ''), 10);
                      updateExerciseField(idx, 'targetSets', isNaN(num) ? 0 : num);
                    }}
                  />
                  <TouchableOpacity
                    style={[styles.stepperBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
                    onPress={() => updateExerciseField(idx, 'targetSets', (te.targetSets || 3) + 1)}
                  >
                    <Text style={[styles.stepperBtnText, { color: colors.text }]}>+</Text>
                  </TouchableOpacity>
                </View>
              </View>

              <View style={[styles.targetBox, { backgroundColor: colors.cardAlt }]}>
                <Text style={[styles.targetLabel, { color: colors.textMuted }]}>Target Reps</Text>
                <View style={styles.stepperInputRow}>
                  <TouchableOpacity
                    style={[styles.stepperBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
                    onPress={() => updateExerciseField(idx, 'targetReps', Math.max(1, (te.targetReps || 10) - 1))}
                  >
                    <Text style={[styles.stepperBtnText, { color: colors.text }]}>-</Text>
                  </TouchableOpacity>
                  <TextInput
                    style={[styles.smallInput, { color: colors.text }]}
                    keyboardType="numeric"
                    value={String(te.targetReps ?? 10)}
                    onChangeText={(t) => {
                      const num = parseInt(t.replace(/[^0-9]/g, ''), 10);
                      updateExerciseField(idx, 'targetReps', isNaN(num) ? 0 : num);
                    }}
                  />
                  <TouchableOpacity
                    style={[styles.stepperBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
                    onPress={() => updateExerciseField(idx, 'targetReps', (te.targetReps || 10) + 1)}
                  >
                    <Text style={[styles.stepperBtnText, { color: colors.text }]}>+</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>

            {/* dedicated set rest and exercise rest controls with steppers */}
            <View style={styles.restSectionRow}>
              {/* set rest control */}
              <View style={[styles.restControlCard, { backgroundColor: colors.cardAlt, borderColor: colors.border }]}>
                <Text style={[styles.restControlLabel, { color: colors.textMuted }]}>Set Rest</Text>
                <View style={styles.restStepperRow}>
                  <TouchableOpacity
                    style={[styles.restStepBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
                    onPress={() => adjustRestTime(idx, 'restBetweenSetsSeconds', -15)}
                  >
                    <Text style={[styles.restStepText, { color: colors.text }]}>-15</Text>
                  </TouchableOpacity>
                  <TextInput
                    style={[styles.restNumberInput, { color: colors.secondary, backgroundColor: colors.card }]}
                    keyboardType="numeric"
                    value={String(setRest)}
                    onChangeText={(t) => {
                      const num = parseInt(t.replace(/[^0-9]/g, ''), 10);
                      updateExerciseField(idx, 'restBetweenSetsSeconds', isNaN(num) ? 0 : num);
                    }}
                  />
                  <Text style={[styles.unitSec, { color: colors.textMuted }]}>s</Text>
                  <TouchableOpacity
                    style={[styles.restStepBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
                    onPress={() => adjustRestTime(idx, 'restBetweenSetsSeconds', 15)}
                  >
                    <Text style={[styles.restStepText, { color: colors.text }]}>+15</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* exercise rest control */}
              <View style={[styles.restControlCard, { backgroundColor: colors.cardAlt, borderColor: colors.border }]}>
                <Text style={[styles.restControlLabel, { color: colors.textMuted }]}>Exercise Rest</Text>
                <View style={styles.restStepperRow}>
                  <TouchableOpacity
                    style={[styles.restStepBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
                    onPress={() => adjustRestTime(idx, 'restAfterExerciseSeconds', -15)}
                  >
                    <Text style={[styles.restStepText, { color: colors.text }]}>-15</Text>
                  </TouchableOpacity>
                  <TextInput
                    style={[styles.restNumberInput, { color: colors.secondary, backgroundColor: colors.card }]}
                    keyboardType="numeric"
                    value={String(exRest)}
                    onChangeText={(t) => {
                      const num = parseInt(t.replace(/[^0-9]/g, ''), 10);
                      updateExerciseField(idx, 'restAfterExerciseSeconds', isNaN(num) ? 0 : num);
                    }}
                  />
                  <Text style={[styles.unitSec, { color: colors.textMuted }]}>s</Text>
                  <TouchableOpacity
                    style={[styles.restStepBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
                    onPress={() => adjustRestTime(idx, 'restAfterExerciseSeconds', 15)}
                  >
                    <Text style={[styles.restStepText, { color: colors.text }]}>+15</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </View>
        );
      })}

      <TouchableOpacity
        style={[styles.saveBtn, { backgroundColor: colors.primary }]}
        onPress={handleSave}
      >
        <Text style={[styles.saveBtnText, { color: colors.primaryText }]}>SAVE TEMPLATE</Text>
      </TouchableOpacity>

      {/* exercise picker modal */}
      <Modal
        visible={pickerOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setPickerOpen(false)}
      >
        <View style={[styles.modalBackdrop, { backgroundColor: 'rgba(0,0,0,0.7)' }]}>
          <View style={[styles.modalCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>SELECT EXERCISE</Text>
              <TouchableOpacity onPress={() => setPickerOpen(false)}>
                <Text style={[styles.modalCloseText, { color: colors.textMuted }]}>✕</Text>
              </TouchableOpacity>
            </View>

            <TextInput
              style={[
                styles.modalSearch,
                { backgroundColor: colors.inputBg, borderColor: colors.inputBorder, color: colors.text },
              ]}
              placeholder="Search exercises..."
              placeholderTextColor={colors.textSubtle}
              value={pickerSearch}
              onChangeText={setPickerSearch}
              autoFocus
            />

            {pickerLoading ? (
              <ActivityIndicator size="large" color={colors.primary} style={styles.modalLoading} />
            ) : (
              <ScrollView style={styles.modalList} keyboardShouldPersistTaps="handled">
                {filteredPickerExercises.map((ex) => (
                  <TouchableOpacity
                    key={ex.id}
                    style={[styles.modalItem, { backgroundColor: colors.cardAlt }]}
                    onPress={() => addExercise(ex)}
                  >
                    <Text style={[styles.modalItemName, { color: colors.text }]}>{ex.name}</Text>
                    <Text style={[styles.modalItemMuscle, { color: colors.secondary }]}>
                      {ex.primaryMuscle}
                    </Text>
                  </TouchableOpacity>
                ))}
                {filteredPickerExercises.length === 0 && (
                  <Text style={[styles.modalEmpty, { color: colors.textMuted }]}>No exercises found.</Text>
                )}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      {/* science guidelines modal */}
      <ScienceGuidelinesModal
        visible={scienceModalVisible}
        onClose={() => setScienceModalVisible(false)}
      />
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
  },
  guideBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1.5,
    marginBottom: 16,
    gap: 12,
  },
  guideIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  guideEmoji: {
    fontSize: 20,
  },
  guideBannerTextContainer: {
    flex: 1,
  },
  guideBannerTitle: {
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  guideBannerSub: {
    fontSize: 11,
    marginTop: 2,
    lineHeight: 15,
  },
  guideArrow: {
    fontSize: 18,
    fontWeight: '800',
    paddingRight: 4,
  },
  sectionHeader: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  card: {
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 4,
    marginTop: 6,
  },
  textInput: {
    borderRadius: 8,
    padding: 10,
    fontSize: 15,
    borderWidth: 1,
    marginBottom: 8,
  },
  exHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  addExBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  addExText: {
    fontSize: 12,
    fontWeight: '800',
  },
  exCard: {
    borderRadius: 12,
    padding: 14,
    marginBottom: 14,
    borderWidth: 1,
  },
  exCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    gap: 8,
  },
  exOrderText: {
    fontWeight: '800',
    fontSize: 14,
  },
  exTitle: {
    fontSize: 16,
    fontWeight: '700',
    flex: 1,
  },
  reorderBtns: {
    flexDirection: 'row',
    gap: 6,
  },
  arrowBtn: {
    fontSize: 14,
    paddingHorizontal: 4,
  },
  deleteExText: {
    fontSize: 22,
    fontWeight: '700',
    paddingLeft: 8,
  },
  targetGrid: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10,
  },
  targetBox: {
    flex: 1,
    borderRadius: 8,
    padding: 8,
    alignItems: 'center',
  },
  targetLabel: {
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 4,
  },
  stepperInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  stepperBtn: {
    width: 26,
    height: 26,
    borderRadius: 6,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperBtnText: {
    fontSize: 14,
    fontWeight: '800',
  },
  smallInput: {
    fontSize: 15,
    fontWeight: '800',
    textAlign: 'center',
    textAlignVertical: 'center',
    paddingVertical: 0,
    includeFontPadding: false,
    minWidth: 32,
  },
  restSectionRow: {
    flexDirection: 'row',
    gap: 8,
  },
  restControlCard: {
    flex: 1,
    borderRadius: 8,
    padding: 8,
    borderWidth: 1,
    alignItems: 'center',
  },
  restControlLabel: {
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 4,
  },
  restStepperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  restStepBtn: {
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
  },
  restStepText: {
    fontSize: 11,
    fontWeight: '700',
  },
  restNumberInput: {
    fontSize: 14,
    fontWeight: '800',
    textAlign: 'center',
    textAlignVertical: 'center',
    paddingVertical: 0,
    paddingHorizontal: 4,
    includeFontPadding: false,
    borderRadius: 4,
    minWidth: 36,
  },
  unitSec: {
    fontSize: 11,
    fontWeight: '600',
  },
  saveBtn: {
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 10,
  },
  saveBtnText: {
    fontSize: 15,
    fontWeight: '800',
  },
  modalBackdrop: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    width: '100%',
    maxHeight: '75%',
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  modalCloseText: {
    fontSize: 20,
    fontWeight: '700',
    paddingLeft: 12,
  },
  modalSearch: {
    borderRadius: 8,
    padding: 10,
    fontSize: 14,
    borderWidth: 1,
    margin: 12,
  },
  modalLoading: {
    padding: 24,
  },
  modalList: {
    paddingHorizontal: 12,
    paddingBottom: 12,
  },
  modalItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginBottom: 4,
  },
  modalItemName: {
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
  },
  modalItemMuscle: {
    fontSize: 11,
    fontWeight: '700',
    marginLeft: 8,
  },
  modalEmpty: {
    fontSize: 13,
    textAlign: 'center',
    padding: 20,
  },
});
