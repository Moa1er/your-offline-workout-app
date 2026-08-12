// floating rest timer overlay bar for active workout sessions

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useWorkout } from '../context/WorkoutContext';
import { formatTimerSeconds } from '../utils/timer';

export const RestTimerOverlay: React.FC = () => {
  const { timerState, remainingSeconds, addTimerSeconds, skipTimer } = useWorkout();

  if (!timerState || remainingSeconds <= 0) {
    return null;
  }

  return (
    <View style={styles.container}>
      <View style={styles.infoBox}>
        <Text style={styles.timerType}>
          {timerState.type === 'EXERCISE_REST' ? 'EXERCISE REST' : 'REST TIMER'}
        </Text>
        <Text style={styles.timerValue}>{formatTimerSeconds(remainingSeconds)}</Text>
        {timerState.exerciseName && (
          <Text style={styles.exerciseName} numberOfLines={1}>
            {timerState.exerciseName}
          </Text>
        )}
      </View>

      <View style={styles.controlsRow}>
        <TouchableOpacity style={styles.button} onPress={() => addTimerSeconds(15)}>
          <Text style={styles.buttonText}>+15s</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.button} onPress={() => addTimerSeconds(30)}>
          <Text style={styles.buttonText}>+30s</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.button, styles.skipButton]} onPress={skipTimer}>
          <Text style={[styles.buttonText, styles.skipText]}>SKIP</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 20,
    left: 16,
    right: 16,
    backgroundColor: '#1e1b4b',
    borderColor: '#6366f1',
    borderWidth: 1.5,
    borderRadius: 14,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },
  infoBox: {
    flex: 1,
  },
  timerType: {
    color: '#818cf8',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  timerValue: {
    color: '#ffffff',
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: 1,
  },
  exerciseName: {
    color: '#cbd5e1',
    fontSize: 12,
  },
  controlsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  button: {
    backgroundColor: '#312e81',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  buttonText: {
    color: '#a5b4fc',
    fontWeight: '700',
    fontSize: 13,
  },
  skipButton: {
    backgroundColor: '#ef4444',
  },
  skipText: {
    color: '#ffffff',
  },
});
