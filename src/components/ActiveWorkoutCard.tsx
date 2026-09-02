import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { useWorkout } from '../context/WorkoutContext';
import { useAppTheme } from '../context/ThemeContext';
import { useAppAlert } from '../context/AlertContext';
import { calculateElapsedTime } from '../utils/timer';

export const ActiveWorkoutCard: React.FC = () => {
  const { activeSession, discardCurrentWorkout } = useWorkout();
  const { colors } = useAppTheme();
  const { showConfirm } = useAppAlert();
  const router = useRouter();

  const [elapsedTime, setElapsedTime] = useState(() =>
    activeSession ? calculateElapsedTime(activeSession.startedAt) : ''
  );

  // keep elapsed time ticking every second so it never stays frozen
  useEffect(() => {
    if (!activeSession?.startedAt) return;
    const updateElapsed = () => {
      setElapsedTime(calculateElapsedTime(activeSession.startedAt));
    };
    updateElapsed();
    const interval = setInterval(updateElapsed, 1000);
    return () => clearInterval(interval);
  }, [activeSession?.startedAt]);

  if (!activeSession) return null;

  const handleDiscard = () => {
    showConfirm(
      'Discard Workout',
      'Are you sure you want to discard this active workout? All logged sets will be deleted.',
      () => discardCurrentWorkout(),
      {
        confirmText: 'Discard Workout',
        isDestructive: true,
        icon: '⚠️',
      }
    );
  };

  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.primary }]}>
      <Text style={[styles.badge, { color: colors.primary }]}>WORKOUT IN PROGRESS</Text>
      <Text style={[styles.title, { color: colors.text }]}>{activeSession.name}</Text>
      <Text style={[styles.subtitle, { color: colors.textMuted }]}>Started {elapsedTime} ago</Text>

      <View style={styles.buttonRow}>
        <TouchableOpacity
          style={[styles.resumeButton, { backgroundColor: colors.primary }]}
          onPress={() => router.push('/active-workout')}
        >
          <Text style={[styles.resumeText, { color: colors.primaryText }]}>RESUME</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.discardButton, { backgroundColor: colors.cardAlt, borderColor: colors.danger, borderWidth: 1 }]}
          onPress={handleDiscard}
        >
          <Text style={[styles.discardText, { color: colors.danger }]}>DISCARD</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderWidth: 1.5,
    borderRadius: 14,
    padding: 16,
    marginBottom: 20,
  },
  badge: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    marginTop: 4,
  },
  subtitle: {
    fontSize: 13,
    marginTop: 2,
    marginBottom: 14,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 10,
  },
  resumeButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  resumeText: {
    fontWeight: '800',
    fontSize: 14,
  },
  discardButton: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    alignItems: 'center',
  },
  discardText: {
    fontWeight: '700',
    fontSize: 13,
  },
});
