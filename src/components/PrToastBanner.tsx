// non-intrusive pr toast notification banner

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useWorkout } from '../context/WorkoutContext';
import { useAppTheme } from '../context/ThemeContext';

export const PrToastBanner: React.FC = () => {
  const { prToasts, clearPrToast } = useWorkout();
  const { colors } = useAppTheme();

  if (prToasts.length === 0) return null;

  return (
    <View style={styles.container}>
      {prToasts.map((toast) => (
        <View
          key={toast.id}
          style={[styles.toastCard, { backgroundColor: colors.card, borderColor: colors.secondary }]}
        >
          <Text style={styles.trophy}>🏆</Text>
          <View style={styles.textContainer}>
            <Text style={[styles.prHeader, { color: colors.secondary }]}>NEW PR - {toast.exerciseName}</Text>
            <Text style={[styles.prDesc, { color: colors.text }]}>{toast.description}</Text>
          </View>
          <TouchableOpacity onPress={() => clearPrToast(toast.id)}>
            <Text style={[styles.closeBtn, { color: colors.textMuted }]}>×</Text>
          </TouchableOpacity>
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 50,
    left: 16,
    right: 16,
    zIndex: 999,
    gap: 8,
  },
  toastCard: {
    borderWidth: 1.5,
    borderRadius: 12,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  trophy: {
    fontSize: 22,
    marginRight: 10,
  },
  textContainer: {
    flex: 1,
  },
  prHeader: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  prDesc: {
    fontSize: 14,
    fontWeight: '700',
  },
  closeBtn: {
    fontSize: 20,
    fontWeight: '700',
    paddingLeft: 8,
  },
});
