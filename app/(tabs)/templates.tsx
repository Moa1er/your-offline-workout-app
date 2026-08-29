// saved workout templates management screen with comparison, research info, and json import

import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { useDatabase } from '../../src/context/DatabaseContext';
import { useAppTheme } from '../../src/context/ThemeContext';
import { WorkoutTemplate } from '../../src/types/workout';
import {
  getAllTemplates,
  deleteTemplate,
  duplicateTemplate,
} from '../../src/database/queries/templateQueries';
import { importTemplatesFromJsonFile } from '../../src/services/importExport';
import { TemplateCompareModal } from '../../src/components/TemplateCompareModal';
import { ScienceGuidelinesModal } from '../../src/components/ScienceGuidelinesModal';
import { useAppAlert } from '../../src/context/AlertContext';

export default function TemplatesScreen() {
  const { db, isReady } = useDatabase();
  const { colors } = useAppTheme();
  const { showAlert, showConfirm } = useAppAlert();
  const router = useRouter();

  const [templates, setTemplates] = useState<WorkoutTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const [compareModalVisible, setCompareModalVisible] = useState(false);
  const [scienceModalVisible, setScienceModalVisible] = useState(false);

  const loadTemplates = useCallback(async (): Promise<WorkoutTemplate[]> => {
    if (!db) return [];
    return getAllTemplates(db);
  }, [db]);

  // refresh automatically whenever this screen comes into focus
  useFocusEffect(
    useCallback(() => {
      if (!isReady || !db) return;
      let cancelled = false;
      (async () => {
        try {
          const tmpls = await loadTemplates();
          if (!cancelled) {
            setTemplates(tmpls);
          }
        } catch (err) {
          console.error('error loading templates:', err);
        } finally {
          if (!cancelled) setLoading(false);
        }
      })();
      return () => {
        cancelled = true;
      };
    }, [isReady, db, loadTemplates])
  );

  const handleDelete = (id: string, name: string) => {
    showConfirm(
      'Delete Routine Template',
      `Are you sure you want to delete "${name}"? This routine template will be permanently removed.`,
      async () => {
        if (!db) return;
        await deleteTemplate(db, id);
        setTemplates(await loadTemplates());
      },
      {
        confirmText: 'Delete Routine',
        isDestructive: true,
        icon: '🗑️',
      }
    );
  };

  const handleDuplicate = async (id: string) => {
    if (!db) return;
    await duplicateTemplate(db, id);
    setTemplates(await loadTemplates());
  };

  const handleImportJson = async () => {
    if (!db) return;
    setImporting(true);
    try {
      const res = await importTemplatesFromJsonFile(db);
      if (res && res.count > 0) {
        const reloaded = await loadTemplates();
        setTemplates(reloaded);
        showAlert({
          title: 'Import Successful',
          message: `Successfully imported ${res.count} routine template(s):\n\n${res.templateNames.join('\n')}`,
          icon: '✅',
        });
      }
    } catch (err: any) {
      showAlert({
        title: 'Import Failed',
        message: err.message || 'Could not import routine template JSON.',
        icon: '⚠️',
      });
    } finally {
      setImporting(false);
    }
  };

  const formatTimestamp = (isoStr?: string) => {
    if (!isoStr) return null;
    const d = new Date(isoStr);
    if (isNaN(d.getTime())) return null;
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  if (loading) {
    return (
      <View style={[styles.centerContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.content}>
        {/* prominent science & workout design guide banner */}
        <TouchableOpacity
          style={[styles.guideBanner, { backgroundColor: colors.card, borderColor: colors.secondary }]}
          onPress={() => setScienceModalVisible(true)}
          activeOpacity={0.8}
        >
          <View style={styles.guideIconCircle}>
            <Text style={styles.guideEmoji}>💡</Text>
          </View>
          <View style={styles.guideBannerTextContainer}>
            <Text style={[styles.guideBannerTitle, { color: colors.secondary }]}>
              EVIDENCE-BASED WORKOUT GUIDE
            </Text>
            <Text style={[styles.guideBannerSub, { color: colors.textMuted }]}>
              Optimal weekly volume, sets, reps & rest intervals backed by science
            </Text>
          </View>
          <Text style={[styles.guideArrow, { color: colors.secondary }]}>→</Text>
        </TouchableOpacity>

        {/* top toolbar: new template, compare, import */}
        <View style={styles.topBar}>
          <Text style={[styles.sectionHeader, { color: colors.textMuted }]}>SAVED ROUTINES</Text>

          <View style={styles.toolbarActions}>
            {templates.length >= 2 && (
              <TouchableOpacity
                style={[styles.actionChip, { backgroundColor: colors.cardAlt, borderColor: colors.border }]}
                onPress={() => setCompareModalVisible(true)}
              >
                <Text style={[styles.actionChipText, { color: colors.secondary }]}>⚖️ COMPARE</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={[styles.actionChip, { backgroundColor: colors.cardAlt, borderColor: colors.border }]}
              onPress={handleImportJson}
              disabled={importing}
            >
              {importing ? (
                <ActivityIndicator size="small" color={colors.primary} />
              ) : (
                <Text style={[styles.actionChipText, { color: colors.accentTeal || colors.secondary }]}>
                  📥 IMPORT JSON
                </Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.newBtn, { backgroundColor: colors.primary }]}
              onPress={() => router.push('/template-editor')}
            >
              <Text style={[styles.newBtnText, { color: colors.primaryText }]}>+ NEW</Text>
            </TouchableOpacity>
          </View>
        </View>

        {templates.map((tmpl) => {
          const createdStr = formatTimestamp(tmpl.createdAt);
          const updatedStr = formatTimestamp(tmpl.updatedAt);

          return (
            <View
              key={tmpl.id}
              style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
            >
              <View style={styles.cardHeader}>
                <Text style={[styles.templateTitle, { color: colors.text }]}>{tmpl.name}</Text>
                <Text style={[styles.exBadge, { color: colors.secondary }]}>
                  {tmpl.exercises.length} exercises
                </Text>
              </View>

              {tmpl.description ? (
                <Text style={[styles.descText, { color: colors.textMuted }]}>{tmpl.description}</Text>
              ) : null}

              {/* creation & modification dates display */}
              {(createdStr || updatedStr) && (
                <View style={styles.datesRow}>
                  {createdStr && (
                    <Text style={[styles.dateText, { color: colors.textSubtle }]}>
                      Created: {createdStr}
                    </Text>
                  )}
                  {createdStr && updatedStr && (
                    <Text style={[styles.dateDivider, { color: colors.textSubtle }]}>•</Text>
                  )}
                  {updatedStr && (
                    <Text style={[styles.dateText, { color: colors.textSubtle }]}>
                      Updated: {updatedStr}
                    </Text>
                  )}
                </View>
              )}

              {/* exercise preview list with single target reps */}
              <View style={[styles.exList, { backgroundColor: colors.cardAlt }]}>
                {tmpl.exercises.map((te, idx) => {
                  const repsVal = te.targetReps ?? te.repMax ?? te.repMin ?? 10;
                  return (
                    <Text key={te.id || idx} style={[styles.exItemText, { color: colors.text }]}>
                      {idx + 1}. {te.exerciseName} ({te.targetSets} sets × {repsVal} reps)
                    </Text>
                  );
                })}
              </View>

              <View style={styles.actionRow}>
                <TouchableOpacity
                  style={[styles.editBtn, { backgroundColor: colors.cardAlt, borderColor: colors.border }]}
                  onPress={() => router.push({ pathname: '/template-editor', params: { id: tmpl.id } })}
                >
                  <Text style={[styles.editBtnText, { color: colors.primary }]}>EDIT</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.dupBtn, { backgroundColor: colors.cardAlt, borderColor: colors.border }]}
                  onPress={() => handleDuplicate(tmpl.id)}
                >
                  <Text style={[styles.dupBtnText, { color: colors.text }]}>DUPLICATE</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.delBtn, { backgroundColor: colors.cardAlt, borderColor: colors.danger }]}
                  onPress={() => handleDelete(tmpl.id, tmpl.name)}
                >
                  <Text style={[styles.delBtnText, { color: colors.danger }]}>DELETE</Text>
                </TouchableOpacity>
              </View>
            </View>
          );
        })}

        {templates.length === 0 && (
          <View style={[styles.emptyCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.emptyTitle, { color: colors.text }]}>NO TEMPLATES YET</Text>
            <Text style={[styles.emptySub, { color: colors.textMuted }]}>
              Create a custom template or import one from JSON to start tracking.
            </Text>
            <View style={styles.emptyButtonsRow}>
              <TouchableOpacity
                style={[styles.emptyActionBtn, { backgroundColor: colors.primary }]}
                onPress={() => router.push('/template-editor')}
              >
                <Text style={[styles.emptyActionText, { color: colors.primaryText }]}>+ CREATE TEMPLATE</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.emptyActionBtn, { backgroundColor: colors.cardAlt, borderColor: colors.border, borderWidth: 1 }]}
                onPress={handleImportJson}
              >
                <Text style={[styles.emptyActionText, { color: colors.secondary }]}>📥 IMPORT JSON</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </ScrollView>

      {/* template comparison modal */}
      <TemplateCompareModal
        visible={compareModalVisible}
        onClose={() => setCompareModalVisible(false)}
        templates={templates}
      />

      {/* science guidelines modal */}
      <ScienceGuidelinesModal
        visible={scienceModalVisible}
        onClose={() => setScienceModalVisible(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
    flexWrap: 'wrap',
    gap: 8,
  },
  titleWithHelp: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionHeader: {
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  guideBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1.5,
    marginBottom: 16,
    gap: 12,
  },
  guideIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  guideEmoji: {
    fontSize: 20,
  },
  guideBannerTextContainer: {
    flex: 1,
  },
  guideBannerTitle: {
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  guideBannerSub: {
    fontSize: 11,
    marginTop: 2,
    lineHeight: 15,
  },
  guideArrow: {
    fontSize: 18,
    fontWeight: '800',
    paddingRight: 4,
  },
  toolbarActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  actionChip: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
  },
  actionChipText: {
    fontSize: 11,
    fontWeight: '800',
  },
  newBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  newBtnText: {
    fontSize: 12,
    fontWeight: '800',
  },
  card: {
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  templateTitle: {
    fontSize: 17,
    fontWeight: '800',
    flex: 1,
  },
  exBadge: {
    fontSize: 12,
    fontWeight: '700',
    marginLeft: 8,
  },
  descText: {
    fontSize: 13,
    marginBottom: 6,
  },
  datesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
  },
  dateText: {
    fontSize: 11,
    fontWeight: '600',
  },
  dateDivider: {
    fontSize: 11,
  },
  exList: {
    borderRadius: 10,
    padding: 12,
    marginBottom: 14,
    gap: 6,
  },
  exItemText: {
    fontSize: 13,
    fontWeight: '600',
  },
  actionRow: {
    flexDirection: 'row',
    gap: 8,
  },
  editBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
  },
  editBtnText: {
    fontWeight: '800',
    fontSize: 12,
  },
  dupBtn: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
  },
  dupBtnText: {
    fontWeight: '700',
    fontSize: 12,
  },
  delBtn: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
  },
  delBtnText: {
    fontWeight: '700',
    fontSize: 12,
  },
  emptyCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 24,
    alignItems: 'center',
    marginTop: 20,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 6,
  },
  emptySub: {
    fontSize: 13,
    textAlign: 'center',
    marginBottom: 16,
  },
  emptyButtonsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  emptyActionBtn: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  emptyActionText: {
    fontSize: 13,
    fontWeight: '800',
  },
});
