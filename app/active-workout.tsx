// active workout logging screen optimized for fast gym set entry with volume calculation

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  BackHandler,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useWorkout } from '../src/context/WorkoutContext';
import { useSettings } from '../src/context/SettingsContext';
import { useAppTheme } from '../src/context/ThemeContext';
import { useAppAlert } from '../src/context/AlertContext';
import { ExerciseSetTable } from '../src/components/ExerciseSetTable';
import { RestTimerOverlay } from '../src/components/RestTimerOverlay';
import { calculateElapsedTime } from '../src/utils/timer';
import { calculateSetVolume, formatWeight } from '../src/utils/calculations';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';

// isolated elapsed time component to prevent full-screen re-renders every second
const WorkoutElapsedTime: React.FC<{ startedAt: string; color: string }> = React.memo(({ startedAt, color }) => {
  const [elapsedText, setElapsedText] = useState(() => calculateElapsedTime(startedAt));

  useEffect(() => {
    const updateElapsed = () => {
      setElapsedText(calculateElapsedTime(startedAt));
    };
    updateElapsed();
    const interval = setInterval(updateElapsed, 1000);
    return () => clearInterval(interval);
  }, [startedAt]);

  return <Text style={[styles.elapsedText, { color }]}>{elapsedText} elapsed</Text>;
});
WorkoutElapsedTime.displayName = 'WorkoutElapsedTime';

export default function ActiveWorkoutScreen() {
  const { activeSession, finishCurrentWorkout, discardCurrentWorkout } = useWorkout();
  const { settings } = useSettings();
  const { colors } = useAppTheme();
  const { showAlert, showConfirm } = useAppAlert();
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

  // handle android back gesture and hardware button to return to menu cleanly
  useEffect(() => {
    const onBackPress = () => {
      router.navigate('/(tabs)');
      return true;
    };
    const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => subscription.remove();
  }, [router]);

  if (!activeSession) {
    return (
      <View style={[styles.centerContainer, { backgroundColor: colors.background }]}>
        <Text style={[styles.noWorkoutText, { color: colors.textMuted }]}>No active workout in progress.</Text>
      </View>
    );
  }

  // calculate sets completion progress and total session volume (filtering included exercises)
  let totalSets = 0;
  let completedSets = 0;
  let totalSessionVolumeKg = 0;

  activeSession.exercises.forEach((se) => {
    const isIncludedInVol = se.includeInVolume !== false;
    se.sets.forEach((st) => {
      totalSets++;
      if (st.completed) {
        completedSets++;
        if (isIncludedInVol && st.type !== 'WARMUP') {
          totalSessionVolumeKg += calculateSetVolume(st.type, st.weightKg, st.reps);
        }
      }
    });
  });

  const handleFinish = () => {
    if (completedSets < totalSets) {
      showAlert({
        title: 'Incomplete Workout',
        message: `${totalSets - completedSets} planned set(s) are still incomplete. Finish workout anyway?`,
        icon: '⚠️',
        buttons: [
          { text: 'Keep Going', style: 'cancel' },
          {
            text: 'Finish Workout',
            style: 'default',
            onPress: async () => {
              await finishCurrentWorkout();
              router.replace('/workout-summary');
            },
          },
        ],
      });
    } else {
      finishCurrentWorkout().then(() => {
        router.replace('/workout-summary');
      });
    }
  };

  const handleDiscard = () => {
    showConfirm(
      'Discard Workout',
      'Are you sure you want to discard this workout? All logged sets for this session will be permanently deleted.',
      async () => {
        await discardCurrentWorkout();
        router.replace('/(tabs)');
      },
      {
        confirmText: 'Discard Workout',
        isDestructive: true,
        icon: '⚠️',
      }
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      >
        {/* session stats header banner */}
        <View style={[styles.headerBanner, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.workoutName, { color: colors.text }]}>{activeSession.name.toUpperCase()}</Text>
          <WorkoutElapsedTime startedAt={activeSession.startedAt} color={colors.secondary} />

          <View style={[styles.statsRow, { backgroundColor: colors.cardAlt }]}>
            <View style={styles.statBox}>
              <Text style={[styles.statLabel, { color: colors.textMuted }]}>Sets Completed</Text>
              <Text style={[styles.statValue, { color: colors.text }]}>
                {completedSets} / {totalSets}
              </Text>
            </View>

            <View style={styles.statBox}>
              <Text style={[styles.statLabel, { color: colors.textMuted }]}>Volume</Text>
              <Text style={[styles.statValue, { color: colors.primary }]}>
                {formatWeight(Math.round(totalSessionVolumeKg), settings.weightUnit)}
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
          style={[styles.addExerciseBtn, { backgroundColor: colors.card, borderColor: colors.primary }]}
          onPress={() => router.push('/exercise-picker')}
        >
          <Text style={[styles.addExerciseText, { color: colors.primary }]}>+ ADD EXERCISE TO SESSION</Text>
        </TouchableOpacity>

        {/* finish & discard buttons */}
        <View style={styles.bottomButtonRow}>
          <TouchableOpacity
            style={[styles.finishBtn, { backgroundColor: colors.primary }]}
            onPress={handleFinish}
          >
            <Text style={[styles.finishText, { color: colors.primaryText }]}>FINISH WORKOUT</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.discardBtn, { backgroundColor: colors.cardAlt, borderColor: colors.danger, borderWidth: 1 }]}
            onPress={handleDiscard}
          >
            <Text style={[styles.discardText, { color: colors.danger }]}>DISCARD</Text>
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
  },
  content: {
    padding: 16,
    paddingBottom: 100,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  noWorkoutText: {
    fontSize: 16,
    marginBottom: 16,
  },
  backBtn: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  backBtnText: {
    fontWeight: '800',
  },
  headerBanner: {
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
  },
  workoutName: {
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  elapsedText: {
    fontSize: 14,
    fontWeight: '700',
    marginTop: 2,
    marginBottom: 12,
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
  statValue: {
    fontSize: 15,
    fontWeight: '800',
    marginTop: 2,
  },
  addExerciseBtn: {
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 16,
  },
  addExerciseText: {
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
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  finishText: {
    fontSize: 15,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  discardBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  discardText: {
    fontSize: 14,
    fontWeight: '800',
  },
});
