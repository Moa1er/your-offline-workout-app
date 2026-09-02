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
                A 2024 landmark systematic review and meta-analysis by Pelland, Wolf, Schoenfeld et al. (Sports Med) reaffirmed the hypertrophic dose-response curve: 12 to 20 weekly sets per muscle group produce maximal muscle growth, with diminishing returns and recovery compromises observed beyond ~20-22 weekly sets.
              </Text>
              <View style={[styles.highlightBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Text style={[styles.highlightTitle, { color: colors.primary }]}>Volume Landmarks (Israetel & Schoenfeld):</Text>
                <Text style={[styles.highlightItem, { color: colors.text }]}>• Maintenance Volume (MV): ~4-6 sets/week</Text>
                <Text style={[styles.highlightItem, { color: colors.text }]}>• Minimum Effective (MEV): ~8-10 sets/week</Text>
                <Text style={[styles.highlightItem, { color: colors.text }]}>• Maximum Adaptive (MAV): ~12-20 sets/week</Text>
              </View>
              <TouchableOpacity
                style={[styles.linkBtn, { borderColor: colors.border }]}
                onPress={() => openLink('https://pubmed.ncbi.nlm.nih.gov/38289510/')}
              >
                <Text style={[styles.linkText, { color: colors.secondary }]}>
                  🔗 Pelland, Wolf, Schoenfeld et al., Sports Med (2024) - PubMed #38289510
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.linkBtn, { borderColor: colors.border, marginTop: 4 }]}
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
                Recent dose-response investigations by Robinson, Pelland et al. (2023) and Heaselgrave et al. (2019) demonstrate a clear ceiling on per-session hypertrophic signaling. Performing more than ~8-10 sets for a single muscle group in one workout generates exponential fatigue and &quot;junk volume&quot;. Dividing total weekly volume across 2 to 3 sessions yields significantly higher stimulus per set.
              </Text>
              <TouchableOpacity
                style={[styles.linkBtn, { borderColor: colors.border }]}
                onPress={() => openLink('https://pubmed.ncbi.nlm.nih.gov/37672101/')}
              >
                <Text style={[styles.linkText, { color: colors.secondary }]}>
                  🔗 Robinson, Pelland, Wolf et al., Sports Med Open (2023) - PubMed #37672101
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.linkBtn, { borderColor: colors.border, marginTop: 4 }]}
                onPress={() => openLink('https://pubmed.ncbi.nlm.nih.gov/30558493/')}
              >
                <Text style={[styles.linkText, { color: colors.secondary }]}>
                  🔗 Heaselgrave et al., Int J Sports Physiol Perform (2019) - PubMed #30558493
                </Text>
              </TouchableOpacity>
            </View>

            {/* 3. rest intervals */}
            <View style={[styles.sectionCard, { backgroundColor: colors.cardAlt, borderColor: colors.border }]}>
              <Text style={[styles.cardTag, { color: colors.accentTeal || colors.secondary }]}>3. REST INTERVALS</Text>
              <Text style={[styles.cardHeader, { color: colors.text }]}>2-3+ Min for Compounds • 1-2 Min for Isolations</Text>
              <Text style={[styles.cardBody, { color: colors.textMuted }]}>
                A meta-analysis by Longo, Schoenfeld et al. (2022) and the landmark RCT by Schoenfeld et al. (2016) demonstrated that longer rest periods (2-3+ minutes) produce significantly superior muscle thickness and strength gains compared to short rest on compound lifts by sustaining volume load and preventing premature peripheral and central fatigue.
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
                onPress={() => openLink('https://pubmed.ncbi.nlm.nih.gov/35147494/')}
              >
                <Text style={[styles.linkText, { color: colors.secondary }]}>
                  🔗 Longo, Schoenfeld et al., Eur J Sport Sci (2022) - PubMed #35147494
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.linkBtn, { borderColor: colors.border, marginTop: 4 }]}
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
                A comprehensive meta-regression by Refalo, Helms et al. (2023) established that sets performed within 1-3 RIR (reps in reserve) stimulate identical hypertrophy to sets taken to absolute muscular failure. Training shy of failure drastically reduces central fatigue and connective tissue strain, preserving performance across subsequent sets.
              </Text>
              <TouchableOpacity
                style={[styles.linkBtn, { borderColor: colors.border }]}
                onPress={() => openLink('https://pubmed.ncbi.nlm.nih.gov/36335154/')}
              >
                <Text style={[styles.linkText, { color: colors.secondary }]}>
                  🔗 Refalo, Helms et al., Sports Med (2023) - PubMed #36335154
                </Text>
              </TouchableOpacity>
            </View>

            {/* 5. stretch-mediated hypertrophy */}
            <View style={[styles.sectionCard, { backgroundColor: colors.cardAlt, borderColor: colors.border }]}>
              <Text style={[styles.cardTag, { color: colors.secondary }]}>5. STRETCH-MEDIATED HYPERTROPHY</Text>
              <Text style={[styles.cardHeader, { color: colors.text }]}>Prioritize Loaded Stretch Positions</Text>
              <Text style={[styles.cardBody, { color: colors.textMuted }]}>
                Groundbreaking meta-analyses by Wolf, Schoenfeld et al. (2023) and Kassiano et al. (2023) show that training at long muscle lengths (lengthened partials and loaded stretch positions) elicits superior hypertrophic adaptations compared to training in shortened ranges alone.
              </Text>
              <TouchableOpacity
                style={[styles.linkBtn, { borderColor: colors.border }]}
                onPress={() => openLink('https://pubmed.ncbi.nlm.nih.gov/37731777/')}
              >
                <Text style={[styles.linkText, { color: colors.secondary }]}>
                  🔗 Wolf, Schoenfeld et al., Int J Sports Sci Coach (2023) - PubMed #37731777
                </Text>
              </TouchableOpacity>
            </View>

            {/* 6. exercise ordering */}
            <View style={[styles.sectionCard, { backgroundColor: colors.cardAlt, borderColor: colors.border }]}>
              <Text style={[styles.cardTag, { color: colors.accentTeal || colors.secondary }]}>6. EXERCISE ORDERING</Text>
              <Text style={[styles.cardHeader, { color: colors.text }]}>Compounds First, Isolations Second</Text>
              <Text style={[styles.cardBody, { color: colors.textMuted }]}>
                A systematic review and meta-analysis by Nunes, Schoenfeld et al. (2021) showed that exercises performed earlier in a training session experience greater strength and volume load progression. Prioritizing multi-joint compound movements while neuromuscular readiness is peak maximizes aggregate hypertrophic tension.
              </Text>
              <TouchableOpacity
                style={[styles.linkBtn, { borderColor: colors.border }]}
                onPress={() => openLink('https://pubmed.ncbi.nlm.nih.gov/33580424/')}
              >
                <Text style={[styles.linkText, { color: colors.secondary }]}>
                  🔗 Nunes, Schoenfeld et al., Sports Med (2021) - PubMed #33580424
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
