// template comparison modal for weekly muscle set volume analysis

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { WorkoutTemplate, MuscleGroup } from '../types/workout';
import { useAppTheme } from '../context/ThemeContext';

interface TemplateCompareModalProps {
  visible: boolean;
  onClose: () => void;
  templates: WorkoutTemplate[];
}

const ALL_MUSCLES: MuscleGroup[] = [
  'CHEST',
  'BACK',
  'LATS',
  'FRONT_DELTS',
  'SIDE_DELTS',
  'REAR_DELTS',
  'BICEPS',
  'TRICEPS',
  'QUADS',
  'HAMSTRINGS',
  'GLUTES',
  'CALVES',
  'CORE',
];

export const TemplateCompareModal: React.FC<TemplateCompareModalProps> = ({
  visible,
  onClose,
  templates,
}) => {
  const { colors } = useAppTheme();

  const [tmplAId, setTmplAId] = useState<string>(templates[0]?.id || '');
  const [tmplBId, setTmplBId] = useState<string>(templates[1]?.id || templates[0]?.id || '');
  const [freqA, setFreqA] = useState<number>(2);
  const [freqB, setFreqB] = useState<number>(2);

  const tmplA = templates.find((t) => t.id === tmplAId) || templates[0];
  const tmplB = templates.find((t) => t.id === tmplBId) || templates[1] || templates[0];

  const calculateMuscleSets = (tmpl?: WorkoutTemplate, frequency: number = 1) => {
    const counts: Record<string, number> = {};
    ALL_MUSCLES.forEach((m) => {
      counts[m] = 0;
    });

    if (!tmpl) return counts;

    for (const ex of tmpl.exercises) {
      const muscle = (ex as any).primaryMuscle || 'OTHER';
      // fallback matching by exercise name heuristics if primaryMuscle isn't populated on templateExercise directly
      let matchedMuscle = muscle;
      if (!matchedMuscle || matchedMuscle === 'OTHER') {
        const nameLower = (ex.exerciseName || '').toLowerCase();
        if (nameLower.includes('chest') || nameLower.includes('bench') || nameLower.includes('press') && !nameLower.includes('shoulder')) matchedMuscle = 'CHEST';
        else if (nameLower.includes('lat') || nameLower.includes('pull')) matchedMuscle = 'LATS';
        else if (nameLower.includes('row') || nameLower.includes('deadlift')) matchedMuscle = 'BACK';
        else if (nameLower.includes('shoulder') || nameLower.includes('overhead')) matchedMuscle = 'FRONT_DELTS';
        else if (nameLower.includes('lateral') || nameLower.includes('side')) matchedMuscle = 'SIDE_DELTS';
        else if (nameLower.includes('curl') || nameLower.includes('bicep')) matchedMuscle = 'BICEPS';
        else if (nameLower.includes('tricep') || nameLower.includes('dip') || nameLower.includes('extension')) matchedMuscle = 'TRICEPS';
        else if (nameLower.includes('squat') || nameLower.includes('quad') || nameLower.includes('leg press')) matchedMuscle = 'QUADS';
        else if (nameLower.includes('hamstring') || nameLower.includes('curl') && nameLower.includes('leg')) matchedMuscle = 'HAMSTRINGS';
        else if (nameLower.includes('calf') || nameLower.includes('calves')) matchedMuscle = 'CALVES';
        else if (nameLower.includes('abs') || nameLower.includes('core') || nameLower.includes('crunch')) matchedMuscle = 'CORE';
      }

      if (counts[matchedMuscle] !== undefined) {
        counts[matchedMuscle] += (ex.targetSets || 3) * frequency;
      }
    }
    return counts;
  };

  const setsA = calculateMuscleSets(tmplA, freqA);
  const setsB = calculateMuscleSets(tmplB, freqB);

  const totalWeeklySetsA = tmplA ? tmplA.exercises.reduce((sum, e) => sum + (e.targetSets || 3), 0) * freqA : 0;
  const totalWeeklySetsB = tmplB ? tmplB.exercises.reduce((sum, e) => sum + (e.targetSets || 3), 0) * freqB : 0;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={[styles.modalOverlay, { backgroundColor: 'rgba(0,0,0,0.7)' }]}>
        <View style={[styles.modalContent, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {/* modal header */}
          <View style={[styles.headerRow, { borderBottomColor: colors.border }]}>
            <View>
              <Text style={[styles.modalTitle, { color: colors.text }]}>COMPARE TEMPLATES</Text>
              <Text style={[styles.modalSub, { color: colors.textMuted }]}>
                Weekly sets per muscle group side-by-side
              </Text>
            </View>
            <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
              <Text style={[styles.closeText, { color: colors.textMuted }]}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
            {/* template selectors and frequency */}
            <View style={styles.selectorsRow}>
              {/* template a selector */}
              <View style={[styles.selectorCard, { backgroundColor: colors.cardAlt, borderColor: colors.primary }]}>
                <Text style={[styles.cardTag, { color: colors.primary }]}>TEMPLATE A</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabScroll}>
                  {templates.map((t) => (
                    <TouchableOpacity
                      key={`a_${t.id}`}
                      style={[
                        styles.selectPill,
                        { borderColor: colors.border, backgroundColor: colors.card },
                        tmplAId === t.id && { backgroundColor: colors.primary, borderColor: colors.primary },
                      ]}
                      onPress={() => setTmplAId(t.id)}
                    >
                      <Text
                        style={[
                          styles.selectPillText,
                          { color: colors.textMuted },
                          tmplAId === t.id && { color: colors.primaryText, fontWeight: '800' },
                        ]}
                      >
                        {t.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>

                <View style={styles.freqRow}>
                  <Text style={[styles.freqLabel, { color: colors.textMuted }]}>Workouts / week:</Text>
                  <View style={styles.stepperBox}>
                    <TouchableOpacity
                      style={[styles.stepBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
                      onPress={() => setFreqA(Math.max(1, freqA - 1))}
                    >
                      <Text style={[styles.stepBtnText, { color: colors.text }]}>-</Text>
                    </TouchableOpacity>
                    <Text style={[styles.freqVal, { color: colors.primary }]}>{freqA}x</Text>
                    <TouchableOpacity
                      style={[styles.stepBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
                      onPress={() => setFreqA(Math.min(7, freqA + 1))}
                    >
                      <Text style={[styles.stepBtnText, { color: colors.text }]}>+</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>

              {/* template b selector */}
              <View style={[styles.selectorCard, { backgroundColor: colors.cardAlt, borderColor: colors.secondary }]}>
                <Text style={[styles.cardTag, { color: colors.secondary }]}>TEMPLATE B</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabScroll}>
                  {templates.map((t) => (
                    <TouchableOpacity
                      key={`b_${t.id}`}
                      style={[
                        styles.selectPill,
                        { borderColor: colors.border, backgroundColor: colors.card },
                        tmplBId === t.id && { backgroundColor: colors.secondary, borderColor: colors.secondary },
                      ]}
                      onPress={() => setTmplBId(t.id)}
                    >
                      <Text
                        style={[
                          styles.selectPillText,
                          { color: colors.textMuted },
                          tmplBId === t.id && { color: '#ffffff', fontWeight: '800' },
                        ]}
                      >
                        {t.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>

                <View style={styles.freqRow}>
                  <Text style={[styles.freqLabel, { color: colors.textMuted }]}>Workouts / week:</Text>
                  <View style={styles.stepperBox}>
                    <TouchableOpacity
                      style={[styles.stepBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
                      onPress={() => setFreqB(Math.max(1, freqB - 1))}
                    >
                      <Text style={[styles.stepBtnText, { color: colors.text }]}>-</Text>
                    </TouchableOpacity>
                    <Text style={[styles.freqVal, { color: colors.secondary }]}>{freqB}x</Text>
                    <TouchableOpacity
                      style={[styles.stepBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
                      onPress={() => setFreqB(Math.min(7, freqB + 1))}
                    >
                      <Text style={[styles.stepBtnText, { color: colors.text }]}>+</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            </View>

            {/* summary stats cards */}
            <View style={[styles.summaryBox, { backgroundColor: colors.cardAlt, borderColor: colors.border }]}>
              <View style={styles.sumCol}>
                <Text style={[styles.sumLabel, { color: colors.primary }]}>{tmplA?.name || 'Template A'}</Text>
                <Text style={[styles.sumNumber, { color: colors.text }]}>{totalWeeklySetsA} weekly sets</Text>
                <Text style={[styles.sumDetail, { color: colors.textMuted }]}>
                  {tmplA?.exercises.length || 0} exercises • {freqA} sessions/wk
                </Text>
              </View>
              <View style={[styles.sumDivider, { backgroundColor: colors.border }]} />
              <View style={styles.sumCol}>
                <Text style={[styles.sumLabel, { color: colors.secondary }]}>{tmplB?.name || 'Template B'}</Text>
                <Text style={[styles.sumNumber, { color: colors.text }]}>{totalWeeklySetsB} weekly sets</Text>
                <Text style={[styles.sumDetail, { color: colors.textMuted }]}>
                  {tmplB?.exercises.length || 0} exercises • {freqB} sessions/wk
                </Text>
              </View>
            </View>

            {/* muscle comparison breakdown */}
            <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>WEEKLY SETS PER MUSCLE GROUP</Text>

            {ALL_MUSCLES.map((muscle) => {
              const valA = setsA[muscle] || 0;
              const valB = setsB[muscle] || 0;
              if (valA === 0 && valB === 0) return null;

              const maxVal = Math.max(valA, valB, 20);
              const pctA = Math.min(100, (valA / maxVal) * 100);
              const pctB = Math.min(100, (valB / maxVal) * 100);

              return (
                <View key={muscle} style={[styles.muscleRow, { borderColor: colors.border, backgroundColor: colors.cardAlt }]}>
                  <View style={styles.muscleHeaderRow}>
                    <Text style={[styles.muscleName, { color: colors.text }]}>{muscle.replace('_', ' ')}</Text>
                    <View style={styles.muscleValuesRow}>
                      <Text style={[styles.valA, { color: colors.primary }]}>{valA} sets</Text>
                      <Text style={[styles.valVs, { color: colors.textSubtle }]}>vs</Text>
                      <Text style={[styles.valB, { color: colors.secondary }]}>{valB} sets</Text>
                    </View>
                  </View>

                  {/* bar a */}
                  <View style={[styles.barTrack, { backgroundColor: colors.card }]}>
                    <View style={[styles.barFill, { width: `${pctA}%`, backgroundColor: colors.primary }]} />
                  </View>

                  {/* bar b */}
                  <View style={[styles.barTrack, { backgroundColor: colors.card, marginTop: 4 }]}>
                    <View style={[styles.barFill, { width: `${pctB}%`, backgroundColor: colors.secondary }]} />
                  </View>
                </View>
              );
            })}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalContent: {
    maxHeight: '90%',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderWidth: 1,
    overflow: 'hidden',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  modalSub: {
    fontSize: 12,
    marginTop: 2,
  },
  closeBtn: {
    padding: 6,
  },
  closeText: {
    fontSize: 20,
    fontWeight: '700',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  selectorsRow: {
    gap: 12,
    marginBottom: 14,
  },
  selectorCard: {
    borderRadius: 12,
    borderWidth: 1.5,
    padding: 12,
  },
  cardTag: {
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  tabScroll: {
    marginBottom: 8,
  },
  selectPill: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    marginRight: 8,
  },
  selectPillText: {
    fontSize: 13,
    fontWeight: '600',
  },
  freqRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  freqLabel: {
    fontSize: 12,
    fontWeight: '700',
  },
  stepperBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  stepBtn: {
    width: 28,
    height: 28,
    borderRadius: 6,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepBtnText: {
    fontSize: 15,
    fontWeight: '800',
  },
  freqVal: {
    fontSize: 14,
    fontWeight: '800',
    minWidth: 24,
    textAlign: 'center',
  },
  summaryBox: {
    flexDirection: 'row',
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    marginBottom: 16,
  },
  sumCol: {
    flex: 1,
    alignItems: 'center',
  },
  sumDivider: {
    width: 1,
    marginHorizontal: 8,
  },
  sumLabel: {
    fontSize: 12,
    fontWeight: '800',
    marginBottom: 2,
  },
  sumNumber: {
    fontSize: 16,
    fontWeight: '900',
  },
  sumDetail: {
    fontSize: 11,
    marginTop: 2,
    textAlign: 'center',
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  muscleRow: {
    borderRadius: 10,
    borderWidth: 1,
    padding: 12,
    marginBottom: 10,
  },
  muscleHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  muscleName: {
    fontSize: 13,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  muscleValuesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  valA: {
    fontSize: 13,
    fontWeight: '800',
  },
  valVs: {
    fontSize: 11,
    fontWeight: '600',
  },
  valB: {
    fontSize: 13,
    fontWeight: '800',
  },
  barTrack: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 4,
  },
});
