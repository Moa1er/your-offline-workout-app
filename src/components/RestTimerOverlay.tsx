// floating rest timer overlay bar for active workout sessions

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useWorkout } from '../context/WorkoutContext';
import { useAppTheme } from '../context/ThemeContext';
import { formatTimerSeconds } from '../utils/timer';

export const RestTimerOverlay: React.FC = () => {
  const { timerState, remainingSeconds, addTimerSeconds, skipTimer } = useWorkout();
  const { colors } = useAppTheme();

  if (!timerState || remainingSeconds <= 0) {
    return null;
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.card, borderColor: colors.primary }]}>
      <View style={styles.infoBox}>
        <Text style={[styles.timerType, { color: colors.secondary }]}>
          {timerState.type === 'EXERCISE_REST' ? 'EXERCISE REST' : 'REST TIMER'}
        </Text>
        <Text style={[styles.timerValue, { color: colors.text }]}>{formatTimerSeconds(remainingSeconds)}</Text>
        {timerState.exerciseName && (
          <Text style={[styles.exerciseName, { color: colors.textMuted }]} numberOfLines={1}>
            {timerState.exerciseName}
          </Text>
        )}
      </View>

      <View style={styles.controlsRow}>
        <TouchableOpacity
          style={[styles.button, { backgroundColor: colors.cardAlt, borderColor: colors.border, borderWidth: 1 }]}
          onPress={() => addTimerSeconds(-15)}
        >
          <Text style={[styles.buttonText, { color: colors.text }]}>-15s</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.button, { backgroundColor: colors.cardAlt, borderColor: colors.border, borderWidth: 1 }]}
          onPress={() => addTimerSeconds(15)}
        >
          <Text style={[styles.buttonText, { color: colors.text }]}>+15s</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.button, { backgroundColor: colors.cardAlt, borderColor: colors.danger, borderWidth: 1 }]}
          onPress={skipTimer}
        >
          <Text style={[styles.buttonText, { color: colors.danger }]}>SKIP</Text>
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
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  timerValue: {
    fontSize: 24,
    fontWeight: '900',
    letterSpacing: 1,
  },
  exerciseName: {
    fontSize: 12,
    marginTop: 1,
  },
  controlsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  button: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  buttonText: {
    fontWeight: '800',
    fontSize: 13,
  },
});
