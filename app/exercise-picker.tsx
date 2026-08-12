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
import { Exercise } from '../src/types/workout';
import { getAllExercises } from '../src/database/queries/exerciseQueries';
import { addSetToSessionExercise } from '../src/database/queries/sessionQueries';
import { v4 as uuidv4 } from 'uuid';

export default function ExercisePickerScreen() {
  const { db, isReady } = useDatabase();
  const { activeSession, refreshActiveSession } = useWorkout();
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

    // insert session exercise
    await db.runAsync(
      `INSERT INTO workout_session_exercises (id, session_id, exercise_id, exercise_order)
       VALUES (?, ?, ?, ?);`,
      [seId, activeSession.id, exercise.id, order]
    );

    // add initial set
    await addSetToSessionExercise(db, seId, 1, 0, 10, 'WORKING');

    await refreshActiveSession();
    router.back();
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#6366f1" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* search input */}
      <View style={styles.searchBox}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search exercises..."
          placeholderTextColor="#64748b"
          value={search}
          onChangeText={setSearch}
        />
      </View>

      {/* list of exercises */}
      <ScrollView contentContainerStyle={styles.content}>
        {filteredExercises.map((ex) => (
          <TouchableOpacity
            key={ex.id}
            style={styles.exCard}
            onPress={() => handleSelectExercise(ex)}
          >
            <View style={styles.exInfo}>
              <Text style={styles.exName}>{ex.name}</Text>
              <Text style={styles.exSub}>
                {ex.primaryMuscle} • {ex.equipment}
              </Text>
            </View>
            <Text style={styles.addIcon}>+</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  searchBox: {
    padding: 16,
    backgroundColor: '#1e293b',
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  searchInput: {
    backgroundColor: '#0f172a',
    color: '#f8fafc',
    borderRadius: 10,
    padding: 12,
    fontSize: 15,
    borderWidth: 1,
    borderColor: '#334155',
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
  exCard: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#334155',
  },
  exInfo: {
    flex: 1,
  },
  exName: {
    color: '#f8fafc',
    fontSize: 16,
    fontWeight: '700',
  },
  exSub: {
    color: '#38bdf8',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
  },
  addIcon: {
    color: '#6366f1',
    fontSize: 24,
    fontWeight: '800',
  },
});
