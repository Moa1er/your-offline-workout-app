// active workout logging screen optimized for fast gym set entry

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useWorkout } from '../src/context/WorkoutContext';
import { useSettings } from '../src/context/SettingsContext';
import { ExerciseSetTable } from '../src/components/ExerciseSetTable';
import { RestTimerOverlay } from '../src/components/RestTimerOverlay';
import { calculateElapsedTime } from '../src/utils/timer';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';

// isolated elapsed time component to prevent full-screen re-renders every second
const WorkoutElapsedTime: React.FC<{ startedAt: string }> = React.memo(({ startedAt }) => {
  const [elapsedText, setElapsedText] = useState(() => calculateElapsedTime(startedAt));

  useEffect(() => {
    const updateElapsed = () => {
      setElapsedText(calculateElapsedTime(startedAt));
    };
    updateElapsed();
    const interval = setInterval(updateElapsed, 1000);
    return () => clearInterval(interval);
  }, [startedAt]);

  return <Text style={styles.elapsedText}>{elapsedText} elapsed</Text>;
});
WorkoutElapsedTime.displayName = 'WorkoutElapsedTime';

export default function ActiveWorkoutScreen() {
  const { activeSession, finishCurrentWorkout, discardCurrentWorkout } = useWorkout();
  const { settings } = useSettings();
  const router = useRouter();

  // handle screen awake preference
  useEffect(() => {
    if (settings.keepScreenAwake) {
      activateKeepAwakeAsync('active-workout');
    }
    return () => {
      deactivateKeepAwake('active-workout');
    };
  }, [settings.keepScreenAwake]);

  if (!activeSession) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.noWorkoutText}>No active workout in progress.</Text>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.replace('/(tabs)')}>
          <Text style={styles.backBtnText}>GO TO HOME</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // calculate sets completion progress
  let totalSets = 0;
  let completedSets = 0;
  activeSession.exercises.forEach((se) => {
    se.sets.forEach((st) => {
      totalSets++;
      if (st.completed) completedSets++;
    });
  });

  const handleFinish = () => {
    if (completedSets < totalSets) {
      Alert.alert(
        'Incomplete Workout',
        'Some planned sets are incomplete. Finish workout anyway?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Finish Workout',
            onPress: async () => {
              await finishCurrentWorkout();
              router.replace('/workout-summary');
            },
          },
        ]
      );
    } else {
      finishCurrentWorkout().then(() => {
        router.replace('/workout-summary');
      });
    }
  };

  const handleDiscard = () => {
    Alert.alert('Discard Workout', 'Are you sure you want to discard this workout session?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Discard',
        style: 'destructive',
        onPress: async () => {
          await discardCurrentWorkout();
          router.replace('/(tabs)');
        },
      },
    ]);
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} removeClippedSubviews={true}>
        {/* session stats header banner */}
        <View style={styles.headerBanner}>
          <Text style={styles.workoutName}>{activeSession.name.toUpperCase()}</Text>
          <WorkoutElapsedTime startedAt={activeSession.startedAt} />

          <View style={styles.statsRow}>
            <View style={styles.statBox}>
              <Text style={styles.statLabel}>Exercises</Text>
              <Text style={styles.statValue}>
                {activeSession.exercises.length}
              </Text>
            </View>

            <View style={styles.statBox}>
              <Text style={styles.statLabel}>Sets Completed</Text>
              <Text style={styles.statValue}>
                {completedSets} / {totalSets}
              </Text>
            </View>
          </View>
        </View>

        {/* exercise set tables */}
        {activeSession.exercises.map((se) => (
          <ExerciseSetTable key={se.id} exercise={se} />
        ))}

        {/* add exercise to session button */}
        <TouchableOpacity
          style={styles.addExerciseBtn}
          onPress={() => router.push('/exercise-picker')}
        >
          <Text style={styles.addExerciseText}>+ ADD EXERCISE TO SESSION</Text>
        </TouchableOpacity>

        {/* finish & discard buttons */}
        <View style={styles.bottomButtonRow}>
          <TouchableOpacity style={styles.finishBtn} onPress={handleFinish}>
            <Text style={styles.finishText}>FINISH WORKOUT</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.discardBtn} onPress={handleDiscard}>
            <Text style={styles.discardText}>DISCARD</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* floating rest timer overlay */}
      <RestTimerOverlay />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  content: {
    padding: 16,
    paddingBottom: 100,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0f172a',
    padding: 24,
  },
  noWorkoutText: {
    color: '#94a3b8',
    fontSize: 16,
    marginBottom: 16,
  },
  backBtn: {
    backgroundColor: '#6366f1',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  backBtnText: {
    color: '#ffffff',
    fontWeight: '800',
  },
  headerBanner: {
    backgroundColor: '#1e293b',
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#334155',
  },
  workoutName: {
    color: '#f8fafc',
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  elapsedText: {
    color: '#38bdf8',
    fontSize: 14,
    fontWeight: '700',
    marginTop: 2,
    marginBottom: 12,
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
  statValue: {
    color: '#f8fafc',
    fontSize: 15,
    fontWeight: '800',
    marginTop: 2,
  },
  addExerciseBtn: {
    backgroundColor: '#1e293b',
    borderColor: '#38bdf8',
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 16,
  },
  addExerciseText: {
    color: '#38bdf8',
    fontSize: 14,
    fontWeight: '800',
  },
  bottomButtonRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 10,
  },
  finishBtn: {
    flex: 2,
    backgroundColor: '#10b981',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  finishText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  discardBtn: {
    flex: 1,
    backgroundColor: '#7f1d1d',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  discardText: {
    color: '#fca5a5',
    fontSize: 14,
    fontWeight: '800',
  },
});
