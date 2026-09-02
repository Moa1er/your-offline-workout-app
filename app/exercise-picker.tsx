// modal for selecting and searching exercises to add to session

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useDatabase } from '../src/context/DatabaseContext';
import { useWorkout } from '../src/context/WorkoutContext';
import { useAppTheme } from '../src/context/ThemeContext';
import { Exercise } from '../src/types/workout';
import { getAllExercises } from '../src/database/queries/exerciseQueries';
import { addSetToSessionExercise } from '../src/database/queries/sessionQueries';
import { generateId as uuidv4 } from '../src/utils/uuid';

export default function ExercisePickerScreen() {
  const { db, isReady } = useDatabase();
  const { activeSession, refreshActiveSession } = useWorkout();
  const { colors } = useAppTheme();
  const router = useRouter();

  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isReady && db) {
      getAllExercises(db).then((data) => {
        setExercises(data);
        setLoading(false);
      });
    }
  }, [isReady, db]);

  const filteredExercises = exercises.filter((ex) => {
    const matchesSearch = ex.name.toLowerCase().includes(search.toLowerCase());
    return matchesSearch;
  });

  const handleSelectExercise = async (exercise: Exercise) => {
    if (!activeSession || !db) return;

    const seId = `se_${uuidv4()}`;
    const order = activeSession.exercises.length + 1;

    // insert session exercise with default rest timers
    await db.runAsync(
      `INSERT INTO workout_session_exercises (id, session_id, exercise_id, exercise_order, include_in_volume, rest_between_sets_seconds, rest_after_exercise_seconds)
       VALUES (?, ?, ?, ?, 1, 120, 120);`,
      [seId, activeSession.id, exercise.id, order]
    );

    // add initial set
    await addSetToSessionExercise(db, seId, 1, 0, 10, 'WORKING');

    await refreshActiveSession();
    router.back();
  };

  if (loading) {
    return (
      <View style={[styles.centerContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* search input */}
      <View style={[styles.searchBox, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <TextInput
          style={[
            styles.searchInput,
            { backgroundColor: colors.inputBg, borderColor: colors.inputBorder, color: colors.text },
          ]}
          placeholder="Search exercises..."
          placeholderTextColor={colors.textSubtle}
          value={search}
          onChangeText={setSearch}
        />
      </View>

      {/* list of exercises */}
      <ScrollView contentContainerStyle={styles.content}>
        {filteredExercises.map((ex) => (
          <TouchableOpacity
            key={ex.id}
            style={[styles.exCard, { backgroundColor: colors.card, borderColor: colors.border }]}
            onPress={() => handleSelectExercise(ex)}
          >
            <View style={styles.exInfo}>
              <Text style={[styles.exName, { color: colors.text }]}>{ex.name}</Text>
              <Text style={[styles.exSub, { color: colors.secondary }]}>
                {ex.primaryMuscle} • {ex.equipment}
              </Text>
            </View>
            <Text style={[styles.addIcon, { color: colors.primary }]}>+</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  searchBox: {
    padding: 16,
    borderBottomWidth: 1,
  },
  searchInput: {
    borderRadius: 10,
    padding: 12,
    fontSize: 15,
    borderWidth: 1,
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
  exCard: {
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
  },
  exInfo: {
    flex: 1,
  },
  exName: {
    fontSize: 16,
    fontWeight: '700',
  },
  exSub: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
  },
  addIcon: {
    fontSize: 24,
    fontWeight: '800',
  },
});
