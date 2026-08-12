// create and edit workout template screen

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
import { WorkoutTemplate, TemplateExercise, Exercise } from '../src/types/workout';
import { getTemplateById, saveTemplate } from '../src/database/queries/templateQueries';
import { getAllExercises } from '../src/database/queries/exerciseQueries';
import { v4 as uuidv4 } from 'uuid';

export default function TemplateEditorScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { db, isReady } = useDatabase();
  const router = useRouter();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [exercises, setExercises] = useState<TemplateExercise[]>([]);
  const [loading, setLoading] = useState(true);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerLoading, setPickerLoading] = useState(false);
  const [pickerSearch, setPickerSearch] = useState('');
  const [pickerExercises, setPickerExercises] = useState<Exercise[]>([]);

  useEffect(() => {
    if (!db || !isReady) return;
    let cancelled = false;
    (async () => {
      if (id) {
        const t = await getTemplateById(db, id);
        if (!cancelled && t) {
          setName(t.name);
          setDescription(t.description || '');
          setExercises(t.exercises);
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
      Alert.alert('Validation Error', 'Please enter a template name.');
      return;
    }
    if (exercises.length === 0) {
      Alert.alert('Validation Error', 'Please add at least one exercise to the template.');
      return;
    }
    if (!db) return;

    const templateId = id || `template_${uuidv4()}`;
    const tmpl: WorkoutTemplate = {
      id: templateId,
      name: name.trim(),
      description: description.trim() || null,
      exercises,
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
      repMin: 6,
      repMax: 10,
      targetRir: 2,
      restBetweenSetsSeconds: 120,
      restAfterExerciseSeconds: 120,
    };
    setExercises([...exercises, newTe]);
    setPickerOpen(false);
    setPickerSearch('');
  };

  const filteredPickerExercises = pickerExercises.filter((ex) =>
    ex.name.toLowerCase().includes(pickerSearch.toLowerCase())
  );

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#6366f1" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.sectionHeader}>TEMPLATE DETAILS</Text>

      <View style={styles.card}>
        <Text style={styles.label}>Routine Name</Text>
        <TextInput
          style={styles.textInput}
          value={name}
          onChangeText={setName}
          placeholder="e.g. Full Upper Body"
          placeholderTextColor="#64748b"
        />

        <Text style={styles.label}>Description (Optional)</Text>
        <TextInput
          style={styles.textInput}
          value={description}
          onChangeText={setDescription}
          placeholder="e.g. Focus on chest and lats"
          placeholderTextColor="#64748b"
        />
      </View>

      <View style={styles.exHeaderRow}>
        <Text style={styles.sectionHeader}>EXERCISES ({exercises.length})</Text>
        <TouchableOpacity style={styles.addExBtn} onPress={openExercisePicker}>
          <Text style={styles.addExText}>+ ADD EXERCISE</Text>
        </TouchableOpacity>
      </View>

      {exercises.map((te, idx) => (
        <View key={te.id || idx} style={styles.exCard}>
          <View style={styles.exCardHeader}>
            <Text style={styles.exOrderText}>{idx + 1}.</Text>
            <Text style={styles.exTitle}>{te.exerciseName || 'Exercise'}</Text>
            <View style={styles.reorderBtns}>
              {idx > 0 && (
                <TouchableOpacity onPress={() => moveExercise(idx, idx - 1)}>
                  <Text style={styles.arrowBtn}>▲</Text>
                </TouchableOpacity>
              )}
              {idx < exercises.length - 1 && (
                <TouchableOpacity onPress={() => moveExercise(idx, idx + 1)}>
                  <Text style={styles.arrowBtn}>▼</Text>
                </TouchableOpacity>
              )}
            </View>
            <TouchableOpacity onPress={() => removeExercise(idx)}>
              <Text style={styles.deleteExText}>×</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.targetGrid}>
            <View style={styles.targetBox}>
              <Text style={styles.targetLabel}>Sets</Text>
              <TextInput
                style={styles.smallInput}
                keyboardType="numeric"
                value={String(te.targetSets)}
                onChangeText={(t) => {
                  const val = parseInt(t, 10) || 1;
                  const updated = [...exercises];
                  updated[idx].targetSets = val;
                  setExercises(updated);
                }}
              />
            </View>

            <View style={styles.targetBox}>
              <Text style={styles.targetLabel}>Min Reps</Text>
              <TextInput
                style={styles.smallInput}
                keyboardType="numeric"
                value={String(te.repMin)}
                onChangeText={(t) => {
                  const val = parseInt(t, 10) || 1;
                  const updated = [...exercises];
                  updated[idx].repMin = val;
                  setExercises(updated);
                }}
              />
            </View>

            <View style={styles.targetBox}>
              <Text style={styles.targetLabel}>Max Reps</Text>
              <TextInput
                style={styles.smallInput}
                keyboardType="numeric"
                value={String(te.repMax)}
                onChangeText={(t) => {
                  const val = parseInt(t, 10) || 1;
                  const updated = [...exercises];
                  updated[idx].repMax = val;
                  setExercises(updated);
                }}
              />
            </View>

            <View style={styles.targetBox}>
              <Text style={styles.targetLabel}>Rest (s)</Text>
              <TextInput
                style={styles.smallInput}
                keyboardType="numeric"
                value={String(te.restBetweenSetsSeconds)}
                onChangeText={(t) => {
                  const val = parseInt(t, 10) || 60;
                  const updated = [...exercises];
                  updated[idx].restBetweenSetsSeconds = val;
                  setExercises(updated);
                }}
              />
            </View>
          </View>
        </View>
      ))}

      <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
        <Text style={styles.saveBtnText}>SAVE TEMPLATE</Text>
      </TouchableOpacity>

      {/* exercise picker modal */}
      <Modal
        visible={pickerOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setPickerOpen(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>SELECT EXERCISE</Text>
              <TouchableOpacity onPress={() => setPickerOpen(false)}>
                <Text style={styles.modalCloseText}>×</Text>
              </TouchableOpacity>
            </View>

            <TextInput
              style={styles.modalSearch}
              placeholder="Search exercises..."
              placeholderTextColor="#64748b"
              value={pickerSearch}
              onChangeText={setPickerSearch}
              autoFocus
            />

            {pickerLoading ? (
              <ActivityIndicator size="large" color="#6366f1" style={styles.modalLoading} />
            ) : (
              <ScrollView style={styles.modalList} keyboardShouldPersistTaps="handled">
                {filteredPickerExercises.map((ex) => (
                  <TouchableOpacity
                    key={ex.id}
                    style={styles.modalItem}
                    onPress={() => addExercise(ex)}
                  >
                    <Text style={styles.modalItemName}>{ex.name}</Text>
                    <Text style={styles.modalItemMuscle}>{ex.primaryMuscle}</Text>
                  </TouchableOpacity>
                ))}
                {filteredPickerExercises.length === 0 && (
                  <Text style={styles.modalEmpty}>No exercises found.</Text>
                )}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
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
    marginBottom: 8,
  },
  card: {
    backgroundColor: '#1e293b',
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#334155',
  },
  label: {
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 4,
    marginTop: 6,
  },
  textInput: {
    backgroundColor: '#0f172a',
    color: '#f8fafc',
    borderRadius: 8,
    padding: 10,
    fontSize: 15,
    borderWidth: 1,
    borderColor: '#334155',
    marginBottom: 8,
  },
  exHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  addExBtn: {
    backgroundColor: '#312e81',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  addExText: {
    color: '#a5b4fc',
    fontSize: 12,
    fontWeight: '800',
  },
  exCard: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#334155',
  },
  exCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    gap: 8,
  },
  exOrderText: {
    color: '#6366f1',
    fontWeight: '800',
    fontSize: 14,
  },
  exTitle: {
    color: '#f8fafc',
    fontSize: 16,
    fontWeight: '700',
    flex: 1,
  },
  reorderBtns: {
    flexDirection: 'row',
    gap: 6,
  },
  arrowBtn: {
    color: '#94a3b8',
    fontSize: 14,
    paddingHorizontal: 4,
  },
  deleteExText: {
    color: '#ef4444',
    fontSize: 22,
    fontWeight: '700',
    paddingLeft: 8,
  },
  targetGrid: {
    flexDirection: 'row',
    gap: 8,
  },
  targetBox: {
    flex: 1,
    backgroundColor: '#0f172a',
    borderRadius: 8,
    padding: 8,
    alignItems: 'center',
  },
  targetLabel: {
    color: '#64748b',
    fontSize: 10,
    fontWeight: '700',
    marginBottom: 4,
  },
  smallInput: {
    color: '#f8fafc',
    fontSize: 15,
    fontWeight: '800',
    textAlign: 'center',
  },
  saveBtn: {
    backgroundColor: '#6366f1',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 10,
  },
  saveBtnText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '800',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    width: '100%',
    maxHeight: '75%',
    backgroundColor: '#1e293b',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#334155',
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  modalTitle: {
    color: '#f8fafc',
    fontSize: 16,
    fontWeight: '800',
  },
  modalCloseText: {
    color: '#94a3b8',
    fontSize: 20,
    fontWeight: '700',
    paddingLeft: 12,
  },
  modalSearch: {
    backgroundColor: '#0f172a',
    color: '#f8fafc',
    borderRadius: 8,
    padding: 10,
    fontSize: 14,
    borderWidth: 1,
    borderColor: '#334155',
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
    backgroundColor: '#0f172a',
  },
  modalItemName: {
    color: '#f8fafc',
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
  },
  modalItemMuscle: {
    color: '#38bdf8',
    fontSize: 11,
    fontWeight: '700',
    marginLeft: 8,
  },
  modalEmpty: {
    color: '#64748b',
    fontSize: 13,
    textAlign: 'center',
    padding: 20,
  },
});
