// hevy-style celebratory record modal for volume records and prs

import React from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TouchableWithoutFeedback,
  ScrollView,
} from 'react-native';
import { useAppTheme } from '../context/ThemeContext';
import { HitRecordInfo } from '../utils/recordDetector';
import { useSettings } from '../context/SettingsContext';
import { formatWeight } from '../utils/calculations';

interface RecordDetailModalProps {
  visible: boolean;
  onClose: () => void;
  record: HitRecordInfo | null;
}

export const RecordDetailModal: React.FC<RecordDetailModalProps> = ({
  visible,
  onClose,
  record,
}) => {
  const { colors } = useAppTheme();
  const { settings } = useSettings();

  if (!record) return null;

  const isVolume = record.type === 'EXERCISE_VOLUME' || record.type === 'SET_VOLUME' || record.type === 'SESSION_VOLUME';
  const unit = record.unit || (isVolume ? settings.weightUnit.toUpperCase() : 'KG');

  const formattedCurrent = isVolume
    ? formatWeight(Math.round(record.currentValue), settings.weightUnit)
    : `${record.currentValue} ${unit}`;

  const formattedPrev = record.previousBest > 0
    ? (isVolume
        ? formatWeight(Math.round(record.previousBest), settings.weightUnit)
        : `${record.previousBest} ${unit}`)
    : 'None (First time)';

  const formattedImp = record.previousBest > 0
    ? `+${isVolume ? formatWeight(Math.round(record.improvement), settings.weightUnit) : `${record.improvement} ${unit}`} (+${record.improvementPercent.toFixed(1)}%)`
    : 'First baseline record set!';

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.backdrop}>
          <TouchableWithoutFeedback onPress={(e) => e.stopPropagation()}>
            <View style={[styles.card, { backgroundColor: colors.card, borderColor: '#FFD700' }]}>
              {/* trophy halo */}
              <View style={[styles.trophyCircle, { backgroundColor: colors.cardAlt, borderColor: '#FFD700' }]}>
                <Text style={styles.trophyEmoji}>🏆</Text>
              </View>

              <Text style={[styles.superTitle, { color: '#FFD700' }]}>NEW RECORD BROKEN!</Text>
              <Text style={[styles.title, { color: colors.text }]}>{record.title}</Text>
              {record.exerciseName ? (
                <Text style={[styles.subtitle, { color: colors.secondary }]}>
                  {record.exerciseName}
                </Text>
              ) : null}

              {/* stats comparison box */}
              <View style={[styles.statsBox, { backgroundColor: colors.cardAlt, borderColor: colors.border }]}>
                <View style={styles.statRow}>
                  <Text style={[styles.statKey, { color: colors.textMuted }]}>New Record</Text>
                  <Text style={[styles.statVal, { color: colors.primary }]}>{formattedCurrent}</Text>
                </View>
                <View style={[styles.divider, { backgroundColor: colors.border }]} />
                <View style={styles.statRow}>
                  <Text style={[styles.statKey, { color: colors.textMuted }]}>Previous Best</Text>
                  <Text style={[styles.statValMuted, { color: colors.textMuted }]}>{formattedPrev}</Text>
                </View>
                <View style={[styles.divider, { backgroundColor: colors.border }]} />
                <View style={styles.statRow}>
                  <Text style={[styles.statKey, { color: colors.textMuted }]}>Progress</Text>
                  <Text style={[styles.statValSuccess, { color: colors.secondary }]}>{formattedImp}</Text>
                </View>
              </View>

              <Text style={[styles.praiseText, { color: colors.textMuted }]}>
                {record.type === 'EXERCISE_VOLUME'
                  ? 'Incredible work! You accumulated the highest total volume for this exercise in a single session.'
                  : record.type === 'SESSION_VOLUME'
                  ? 'All-time milestone! This workout session reached your highest total volume recorded.'
                  : 'Great lift! You set a brand new personal milestone.'}
              </Text>

              <TouchableOpacity
                style={[styles.closeBtn, { backgroundColor: colors.primary }]}
                onPress={onClose}
                activeOpacity={0.85}
              >
                <Text style={[styles.closeBtnText, { color: colors.primaryText }]}>{"LET'S GO! 🔥"}</Text>
              </TouchableOpacity>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  card: {
    width: '100%',
    maxWidth: 380,
    borderRadius: 22,
    borderWidth: 2,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 12,
  },
  trophyCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  trophyEmoji: {
    fontSize: 34,
  },
  superTitle: {
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 1.5,
    marginBottom: 4,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 2,
  },
  subtitle: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 16,
  },
  statsBox: {
    width: '100%',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    marginBottom: 16,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
  },
  statKey: {
    fontSize: 13,
    fontWeight: '600',
  },
  statVal: {
    fontSize: 16,
    fontWeight: '900',
  },
  statValMuted: {
    fontSize: 14,
    fontWeight: '600',
  },
  statValSuccess: {
    fontSize: 14,
    fontWeight: '800',
  },
  divider: {
    height: 1,
    marginVertical: 4,
  },
  praiseText: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 20,
    paddingHorizontal: 8,
  },
  closeBtn: {
    width: '100%',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtnText: {
    fontSize: 15,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
});
