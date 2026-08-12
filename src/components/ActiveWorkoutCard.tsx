// unfinished active workout prompt card on home screen

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useWorkout } from '../context/WorkoutContext';
import { calculateElapsedTime } from '../utils/timer';

export const ActiveWorkoutCard: React.FC = () => {
  const { activeSession, discardCurrentWorkout } = useWorkout();
  const router = useRouter();

  if (!activeSession) return null;

  const elapsedTime = calculateElapsedTime(activeSession.startedAt);

  const handleDiscard = () => {
    Alert.alert(
      'Discard Workout',
      'Are you sure you want to discard this workout session?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Discard',
          style: 'destructive',
          onPress: () => discardCurrentWorkout(),
        },
      ]
    );
  };

  return (
    <View style={styles.card}>
      <Text style={styles.badge}>WORKOUT IN PROGRESS</Text>
      <Text style={styles.title}>{activeSession.name}</Text>
      <Text style={styles.subtitle}>Started {elapsedTime} ago</Text>

      <View style={styles.buttonRow}>
        <TouchableOpacity
          style={styles.resumeButton}
          onPress={() => router.push('/active-workout')}
        >
          <Text style={styles.resumeText}>RESUME</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.discardButton} onPress={handleDiscard}>
          <Text style={styles.discardText}>DISCARD</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#312e81',
    borderColor: '#6366f1',
    borderWidth: 1.5,
    borderRadius: 14,
    padding: 16,
    marginBottom: 20,
  },
  badge: {
    color: '#a5b4fc',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  title: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: '800',
    marginTop: 4,
  },
  subtitle: {
    color: '#cbd5e1',
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
    backgroundColor: '#6366f1',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  resumeText: {
    color: '#ffffff',
    fontWeight: '800',
    fontSize: 14,
  },
  discardButton: {
    backgroundColor: '#1e1b4b',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    alignItems: 'center',
  },
  discardText: {
    color: '#ef4444',
    fontWeight: '700',
    fontSize: 13,
  },
});
