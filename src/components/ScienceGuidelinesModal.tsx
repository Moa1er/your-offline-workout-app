// evidence-based resistance training recommendations modal with peer-reviewed literature citations

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  Linking,
} from 'react-native';
import { useAppTheme } from '../context/ThemeContext';

interface ScienceGuidelinesModalProps {
  visible: boolean;
  onClose: () => void;
}

export const ScienceGuidelinesModal: React.FC<ScienceGuidelinesModalProps> = ({
  visible,
  onClose,
}) => {
  const { colors } = useAppTheme();

  const openLink = async (url: string) => {
    try {
      await Linking.openURL(url);
    } catch (err) {
      console.log('could not open url:', url);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={[styles.modalOverlay, { backgroundColor: 'rgba(0,0,0,0.7)' }]}>
        <View style={[styles.modalContent, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {/* header */}
          <View style={[styles.headerRow, { borderBottomColor: colors.border }]}>
            <View>
              <Text style={[styles.title, { color: colors.text }]}>WORKOUT SCIENCE & RECOMMENDATIONS</Text>
              <Text style={[styles.subtitle, { color: colors.textMuted }]}>
                Optimal volume, sets, and rest backed by peer-reviewed research
              </Text>
            </View>
            <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
              <Text style={[styles.closeText, { color: colors.textMuted }]}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
            {/* 1. weekly volume */}
            <View style={[styles.sectionCard, { backgroundColor: colors.cardAlt, borderColor: colors.border }]}>
              <Text style={[styles.cardTag, { color: colors.primary }]}>1. WEEKLY VOLUME (SETS PER MUSCLE)</Text>
              <Text style={[styles.cardHeader, { color: colors.text }]}>10 to 20 Hard Sets per Week</Text>
              <Text style={[styles.cardBody, { color: colors.textMuted }]}>
                A landmark meta-analysis by Dr. Brad Schoenfeld et al. (2017) demonstrated a clear dose-response relationship between weekly training volume and muscle hypertrophy. Performing 10+ sets per muscle group per week produced significantly superior muscle growth compared to lower volumes.
              </Text>
              <View style={[styles.highlightBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Text style={[styles.highlightTitle, { color: colors.primary }]}>Volume Landmarks (Israetel & Schoenfeld):</Text>
                <Text style={[styles.highlightItem, { color: colors.text }]}>• Maintenance Volume (MV): ~4-6 sets/week</Text>
                <Text style={[styles.highlightItem, { color: colors.text }]}>• Minimum Effective (MEV): ~8-10 sets/week</Text>
                <Text style={[styles.highlightItem, { color: colors.text }]}>• Maximum Adaptive (MAV): ~12-20 sets/week</Text>
              </View>
              <TouchableOpacity
                style={[styles.linkBtn, { borderColor: colors.border }]}
                onPress={() => openLink('https://pubmed.ncbi.nlm.nih.gov/27433992/')}
              >
                <Text style={[styles.linkText, { color: colors.secondary }]}>
                  🔗 Schoenfeld et al., J Sports Sci (2017) - PubMed #27433992
                </Text>
              </TouchableOpacity>
            </View>

            {/* 2. per session volume caps */}
            <View style={[styles.sectionCard, { backgroundColor: colors.cardAlt, borderColor: colors.border }]}>
              <Text style={[styles.cardTag, { color: colors.secondary }]}>2. PER-SESSION VOLUME LIMITS</Text>
              <Text style={[styles.cardHeader, { color: colors.text }]}>6 to 10 Sets per Muscle per Session</Text>
              <Text style={[styles.cardBody, { color: colors.textMuted }]}>
                Research on muscle protein synthesis and intra-session fatigue indicates diminishing returns beyond ~6-10 sets for a single muscle group in one workout (&quot;junk volume&quot;). Dividing total weekly volume across 2 to 3 sessions per week maximizes hypertrophic stimulus and quality.
              </Text>
              <TouchableOpacity
                style={[styles.linkBtn, { borderColor: colors.border }]}
                onPress={() => openLink('https://pubmed.ncbi.nlm.nih.gov/30558493/')}
              >
                <Text style={[styles.linkText, { color: colors.secondary }]}>
                  🔗 Heaselgrave et al., Int J Sports Physiol Perform (2019)
                </Text>
              </TouchableOpacity>
            </View>

            {/* 3. rest intervals */}
            <View style={[styles.sectionCard, { backgroundColor: colors.cardAlt, borderColor: colors.border }]}>
              <Text style={[styles.cardTag, { color: colors.accentTeal || colors.secondary }]}>3. REST INTERVALS</Text>
              <Text style={[styles.cardHeader, { color: colors.text }]}>2-3+ Min for Compounds • 1-2 Min for Isolations</Text>
              <Text style={[styles.cardBody, { color: colors.textMuted }]}>
                In a rigorous randomized trial, Schoenfeld et al. (2016) showed that 3-minute rest periods resulted in significantly greater muscle thickness and maximal 1RM strength gains compared to 1-minute rest. Longer rest preserves volume load by preventing premature nervous and metabolic fatigue.
              </Text>
              <View style={[styles.highlightBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Text style={[styles.highlightItem, { color: colors.text }]}>
                  • Multi-joint compound lifts (Squat, Bench, Deadlift, Rows): 2 to 3+ minutes
                </Text>
                <Text style={[styles.highlightItem, { color: colors.text }]}>
                  • Single-joint isolation (Curls, Lateral Raises, Extensions): 60 to 90 seconds
                </Text>
              </View>
              <TouchableOpacity
                style={[styles.linkBtn, { borderColor: colors.border }]}
                onPress={() => openLink('https://pubmed.ncbi.nlm.nih.gov/26605807/')}
              >
                <Text style={[styles.linkText, { color: colors.secondary }]}>
                  🔗 Schoenfeld et al., J Strength Cond Res (2016) - PubMed #26605807
                </Text>
              </TouchableOpacity>
            </View>

            {/* 4. rep ranges & proximity to failure */}
            <View style={[styles.sectionCard, { backgroundColor: colors.cardAlt, borderColor: colors.border }]}>
              <Text style={[styles.cardTag, { color: colors.primary }]}>4. REPS & INTENSITY (RIR)</Text>
              <Text style={[styles.cardHeader, { color: colors.text }]}>6 to 20 Reps at 1-3 Reps in Reserve</Text>
              <Text style={[styles.cardBody, { color: colors.textMuted }]}>
                Hypertrophy is comparable across rep spectrums (6 to 30 reps) provided sets are performed with high effort (within 1-3 RIR / reps from muscular failure). Training to complete failure on every set increases fatigue and injury risk without proportional hypertrophy benefit.
              </Text>
              <TouchableOpacity
                style={[styles.linkBtn, { borderColor: colors.border }]}
                onPress={() => openLink('https://pubmed.ncbi.nlm.nih.gov/33497853/')}
              >
                <Text style={[styles.linkText, { color: colors.secondary }]}>
                  🔗 Refalo et al., Sports Med (2022) - RIR and Failure
                </Text>
              </TouchableOpacity>
            </View>
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
  title: {
    fontSize: 15,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  subtitle: {
    fontSize: 11,
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
    paddingBottom: 36,
    gap: 14,
  },
  sectionCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
  },
  cardTag: {
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  cardHeader: {
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 6,
  },
  cardBody: {
    fontSize: 13,
    lineHeight: 19,
    marginBottom: 8,
  },
  highlightBox: {
    borderRadius: 8,
    borderWidth: 1,
    padding: 10,
    marginVertical: 6,
    gap: 3,
  },
  highlightTitle: {
    fontSize: 12,
    fontWeight: '800',
    marginBottom: 2,
  },
  highlightItem: {
    fontSize: 12,
    fontWeight: '600',
    lineHeight: 17,
  },
  linkBtn: {
    marginTop: 6,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 6,
    borderWidth: 1,
  },
  linkText: {
    fontSize: 12,
    fontWeight: '700',
  },
});
