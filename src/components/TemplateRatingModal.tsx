// evidence-based routine rating and recommendations modal

import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { TemplateExercise } from '../types/workout';
import { useAppTheme } from '../context/ThemeContext';
import { evaluateTemplate } from '../utils/templateEvaluator';

interface TemplateRatingModalProps {
  visible: boolean;
  onClose: () => void;
  templateName: string;
  exercises: TemplateExercise[];
  onOpenScienceGuide?: () => void;
}

export const TemplateRatingModal: React.FC<TemplateRatingModalProps> = ({
  visible,
  onClose,
  templateName,
  exercises,
  onOpenScienceGuide,
}) => {
  const { colors } = useAppTheme();

  const evaluation = useMemo(
    () => evaluateTemplate(exercises, templateName),
    [exercises, templateName]
  );

  const getGradeColor = (grade: string) => {
    switch (grade) {
      case 'S':
        return '#8b5cf6'; // vibrant purple
      case 'A':
        return '#10b981'; // green
      case 'B':
        return '#2563eb'; // blue
      case 'C':
        return '#f59e0b'; // amber
      default:
        return '#ef4444'; // red
    }
  };

  const gradeColor = getGradeColor(evaluation.letterGrade);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={[styles.modalOverlay, { backgroundColor: 'rgba(0,0,0,0.7)' }]}>
        <View style={[styles.modalContent, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {/* header */}
          <View style={[styles.headerRow, { borderBottomColor: colors.border }]}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.headerTitle, { color: colors.text }]} numberOfLines={1}>
                EVIDENCE RATING: {templateName.toUpperCase()}
              </Text>
              <Text style={[styles.headerSub, { color: colors.textMuted }]}>
                Peer-reviewed resistance training evaluation
              </Text>
            </View>
            <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
              <Text style={[styles.closeText, { color: colors.textMuted }]}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
            {/* overall score banner card */}
            <View
              style={[
                styles.scoreBanner,
                { backgroundColor: colors.cardAlt, borderColor: gradeColor },
              ]}
            >
              <View style={styles.scoreRow}>
                <View style={[styles.gradeCircle, { backgroundColor: gradeColor }]}>
                  <Text style={styles.gradeLetter}>{evaluation.letterGrade}</Text>
                </View>
                <View style={{ flex: 1, marginLeft: 14 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
                    <Text style={[styles.scoreNumber, { color: colors.text }]}>
                      {evaluation.overallScore}
                    </Text>
                    <Text style={[styles.scoreTotal, { color: colors.textMuted }]}> / 100</Text>
                  </View>
                  <Text style={[styles.gradeTitle, { color: gradeColor }]}>
                    {evaluation.gradeLabel}
                  </Text>
                </View>
              </View>

              {/* quick stats row */}
              <View style={[styles.statsRow, { borderTopColor: colors.border }]}>
                <View style={styles.statBox}>
                  <Text style={[styles.statNum, { color: colors.text }]}>{evaluation.totalSets}</Text>
                  <Text style={[styles.statLabel, { color: colors.textMuted }]}>Total Sets</Text>
                </View>
                <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
                <View style={styles.statBox}>
                  <Text style={[styles.statNum, { color: colors.text }]}>~{evaluation.estimatedMinutes}m</Text>
                  <Text style={[styles.statLabel, { color: colors.textMuted }]}>Est. Duration</Text>
                </View>
                <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
                <View style={styles.statBox}>
                  <Text style={[styles.statNum, { color: colors.text }]}>{exercises.length}</Text>
                  <Text style={[styles.statLabel, { color: colors.textMuted }]}>Exercises</Text>
                </View>
              </View>
            </View>

            {/* 4 pillars breakdown */}
            <Text style={[styles.sectionTitle, { color: colors.text }]}>SCIENTIFIC PILLARS BREAKDOWN</Text>
            <View style={styles.categoriesGrid}>
              {Object.values(evaluation.categories).map((cat, idx) => {
                const statusColor =
                  cat.status === 'OPTIMAL'
                    ? '#10b981'
                    : cat.status === 'MODERATE'
                    ? '#f59e0b'
                    : '#ef4444';
                return (
                  <View
                    key={idx}
                    style={[styles.categoryCard, { backgroundColor: colors.cardAlt, borderColor: colors.border }]}
                  >
                    <View style={styles.categoryHeader}>
                      <Text style={[styles.categoryName, { color: colors.text }]}>{cat.name}</Text>
                      <Text style={[styles.categoryScore, { color: statusColor }]}>
                        {cat.score}/{cat.maxScore}
                      </Text>
                    </View>
                    <Text style={[styles.categorySummary, { color: colors.textMuted }]} numberOfLines={2}>
                      {cat.summary}
                    </Text>
                  </View>
                );
              })}
            </View>

            {/* recommendations / improvements */}
            <Text style={[styles.sectionTitle, { color: colors.text, marginTop: 16 }]}>
              WHAT COULD BE IMPROVED ({evaluation.improvements.length})
            </Text>

            {evaluation.improvements.length === 0 ? (
              <View style={[styles.emptyCard, { backgroundColor: colors.cardAlt, borderColor: colors.border }]}>
                <Text style={{ fontSize: 24, marginBottom: 4 }}>🎉</Text>
                <Text style={[styles.emptyText, { color: colors.text }]}>
                  No major improvements needed! This routine closely aligns with optimal resistance training research.
                </Text>
              </View>
            ) : (
              evaluation.improvements.map((item) => (
                <View
                  key={item.id}
                  style={[
                    styles.recCard,
                    {
                      backgroundColor: colors.cardAlt,
                      borderColor: item.severity === 'WARNING' ? '#ef4444' : '#f59e0b',
                    },
                  ]}
                >
                  <View style={styles.recHeaderRow}>
                    <Text style={{ fontSize: 16, marginRight: 6 }}>
                      {item.severity === 'WARNING' ? '⚠️' : '💡'}
                    </Text>
                    <Text style={[styles.recTitle, { color: colors.text, flex: 1 }]}>
                      {item.title}
                    </Text>
                  </View>
                  <Text style={[styles.recMessage, { color: colors.textMuted }]}>
                    {item.message}
                  </Text>
                  {item.citation && (
                    <View style={[styles.citationBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
                      <Text style={[styles.citationText, { color: colors.secondary }]}>
                        📖 Research: {item.citation}
                      </Text>
                    </View>
                  )}
                </View>
              ))
            )}

            {/* key strengths */}
            {evaluation.strengths.length > 0 && (
              <>
                <Text style={[styles.sectionTitle, { color: colors.text, marginTop: 16 }]}>
                  EVIDENCE-BASED STRENGTHS ({evaluation.strengths.length})
                </Text>
                {evaluation.strengths.map((item) => (
                  <View
                    key={item.id}
                    style={[
                      styles.recCard,
                      { backgroundColor: colors.cardAlt, borderColor: '#10b981' },
                    ]}
                  >
                    <View style={styles.recHeaderRow}>
                      <Text style={{ fontSize: 16, marginRight: 6 }}>✅</Text>
                      <Text style={[styles.recTitle, { color: colors.text, flex: 1 }]}>
                        {item.title}
                      </Text>
                    </View>
                    <Text style={[styles.recMessage, { color: colors.textMuted }]}>
                      {item.message}
                    </Text>
                  </View>
                ))}
              </>
            )}

            {/* action link to open full science guide */}
            {onOpenScienceGuide && (
              <TouchableOpacity
                style={[styles.scienceGuideBtn, { backgroundColor: colors.primary }]}
                onPress={() => {
                  onClose();
                  onOpenScienceGuide();
                }}
                activeOpacity={0.85}
              >
                <Text style={[styles.scienceGuideBtnText, { color: colors.primaryText }]}>
                  📖 VIEW WORKOUT SCIENCE GUIDE & CITATIONS
                </Text>
              </TouchableOpacity>
            )}
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
  headerTitle: {
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  headerSub: {
    fontSize: 11,
    marginTop: 2,
  },
  closeBtn: {
    padding: 6,
    marginLeft: 8,
  },
  closeText: {
    fontSize: 20,
    fontWeight: '700',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 36,
  },
  scoreBanner: {
    borderRadius: 16,
    borderWidth: 2,
    padding: 16,
    marginBottom: 16,
  },
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  gradeCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
  },
  gradeLetter: {
    fontSize: 28,
    fontWeight: '900',
    color: '#ffffff',
  },
  scoreNumber: {
    fontSize: 32,
    fontWeight: '900',
  },
  scoreTotal: {
    fontSize: 18,
    fontWeight: '700',
  },
  gradeTitle: {
    fontSize: 13,
    fontWeight: '800',
    marginTop: 2,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
  },
  statBox: {
    alignItems: 'center',
  },
  statNum: {
    fontSize: 16,
    fontWeight: '800',
  },
  statLabel: {
    fontSize: 11,
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 24,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  categoriesGrid: {
    gap: 8,
  },
  categoryCard: {
    borderRadius: 10,
    borderWidth: 1,
    padding: 10,
  },
  categoryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  categoryName: {
    fontSize: 13,
    fontWeight: '800',
  },
  categoryScore: {
    fontSize: 13,
    fontWeight: '900',
  },
  categorySummary: {
    fontSize: 11,
    lineHeight: 15,
  },
  recCard: {
    borderRadius: 12,
    borderWidth: 1.5,
    padding: 12,
    marginBottom: 10,
  },
  recHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  recTitle: {
    fontSize: 13,
    fontWeight: '800',
  },
  recMessage: {
    fontSize: 12,
    lineHeight: 18,
  },
  citationBox: {
    marginTop: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
  },
  citationText: {
    fontSize: 11,
    fontWeight: '700',
  },
  emptyCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
    alignItems: 'center',
    marginBottom: 10,
  },
  emptyText: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
    fontWeight: '600',
  },
  scienceGuideBtn: {
    marginTop: 14,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  scienceGuideBtnText: {
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
});
