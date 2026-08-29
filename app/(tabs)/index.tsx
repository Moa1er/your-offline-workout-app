// workout home screen for fast template execution and session recovery

import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { useDatabase } from '../../src/context/DatabaseContext';
import { useWorkout } from '../../src/context/WorkoutContext';
import { useAppTheme } from '../../src/context/ThemeContext';
import { WorkoutTemplate } from '../../src/types/workout';
import { getAllTemplates } from '../../src/database/queries/templateQueries';
import { getTemplateLastPerformedStats } from '../../src/database/queries/sessionQueries';
import { installExampleUpperBodyTemplate } from '../../src/database/seed';
import { ActiveWorkoutCard } from '../../src/components/ActiveWorkoutCard';

export default function WorkoutHomeScreen() {
  const { db, isReady } = useDatabase();
  const { activeSession, startWorkout } = useWorkout();
  const { colors } = useAppTheme();
  const router = useRouter();

  const [templates, setTemplates] = useState<WorkoutTemplate[]>([]);
  const [templateLastPerformed, setTemplateLastPerformed] = useState<
    Record<string, { date: string; duration: string }>
  >({});
  const [loading, setLoading] = useState(true);
  const [showSeedPrompt, setShowSeedPrompt] = useState(false);

  const loadHomeData = useCallback(async (): Promise<{
    tmpls: WorkoutTemplate[];
    lastStats: Record<string, { date: string; duration: string }>;
  } | null> => {
    if (!db) return null;
    const tmpls = await getAllTemplates(db);
    const lastStats = await getTemplateLastPerformedStats(db);
    return { tmpls, lastStats };
  }, [db]);

  const applyHomeData = (
    tmpls: WorkoutTemplate[],
    lastStats: Record<string, { date: string; duration: string }>
  ) => {
    setTemplates(tmpls);
    setShowSeedPrompt(tmpls.length === 0);
    setTemplateLastPerformed(lastStats);
  };

  useFocusEffect(
    useCallback(() => {
      if (!isReady || !db) return;
      let cancelled = false;
      (async () => {
        try {
          const data = await loadHomeData();
          if (!cancelled && data) {
            applyHomeData(data.tmpls, data.lastStats);
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
    }, [isReady, db, loadHomeData])
  );

  const handleInstallExample = async () => {
    if (!db) return;
    setLoading(true);
    await installExampleUpperBodyTemplate(db);
    const data = await loadHomeData();
    if (data) {
      applyHomeData(data.tmpls, data.lastStats);
    }
    setLoading(false);
  };

  const handleStartTemplate = async (templateId: string) => {
    const sess = await startWorkout(templateId);
    if (sess) {
      router.push('/active-workout');
    }
  };

  const handleStartCustom = async () => {
    const sess = await startWorkout();
    if (sess) {
      router.push('/active-workout');
    }
  };

  if (loading) {
    return (
      <View style={[styles.centerContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]} contentContainerStyle={styles.content}>
      {/* active workout recovery card */}
      <ActiveWorkoutCard />

      {/* first launch example workout installation prompt */}
      {showSeedPrompt && (
        <View style={[styles.seedCard, { backgroundColor: colors.card, borderColor: colors.primary }]}>
          <Text style={[styles.seedTitle, { color: colors.text }]}>Welcome to Workout Tracker</Text>
          <Text style={[styles.seedSub, { color: colors.textMuted }]}>
            Would you like to install the default &quot;Full Upper Body&quot; resistance training routine?
          </Text>
          <View style={styles.seedButtonRow}>
            <TouchableOpacity
              style={[styles.seedYesBtn, { backgroundColor: colors.primary }]}
              onPress={handleInstallExample}
            >
              <Text style={[styles.seedYesText, { color: colors.primaryText }]}>YES, INSTALL</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.seedNoBtn} onPress={() => setShowSeedPrompt(false)}>
              <Text style={[styles.seedNoText, { color: colors.textMuted }]}>NO</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* header title */}
      <View style={styles.header}>
        <Text style={[styles.sectionHeader, { color: colors.textMuted }]}>WORKOUT ROUTINES</Text>
        <TouchableOpacity onPress={handleStartCustom}>
          <Text style={[styles.customBtnText, { color: colors.primary }]}>+ Quick Start</Text>
        </TouchableOpacity>
      </View>

      {/* template list */}
      {templates.map((template) => {
        const lastStat = templateLastPerformed[template.id];
        return (
          <View key={template.id} style={[styles.templateCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.templateHeader}>
              <Text style={[styles.templateName, { color: colors.text }]}>{template.name}</Text>
              <Text style={[styles.exerciseCount, { color: colors.secondary }]}>
                {template.exercises.length} exercises
              </Text>
            </View>

            {template.description ? (
              <Text style={[styles.templateDesc, { color: colors.textMuted }]}>{template.description}</Text>
            ) : null}

            {lastStat && (
              <View style={[styles.lastPerfRow, { backgroundColor: colors.cardAlt }]}>
                <View style={styles.statBox}>
                  <Text style={[styles.statLabel, { color: colors.textMuted }]}>Last performed</Text>
                  <Text style={[styles.statValue, { color: colors.text }]}>{lastStat.date}</Text>
                </View>
                <View style={styles.statBox}>
                  <Text style={[styles.statLabel, { color: colors.textMuted }]}>Last duration</Text>
                  <Text style={[styles.statValue, { color: colors.text }]}>{lastStat.duration}</Text>
                </View>
              </View>
            )}

            <TouchableOpacity
              style={[styles.startButton, { backgroundColor: colors.primary }]}
              onPress={() => handleStartTemplate(template.id)}
            >
              <Text style={[styles.startText, { color: colors.primaryText }]}>START WORKOUT</Text>
            </TouchableOpacity>
          </View>
        );
      })}

      {templates.length === 0 && !showSeedPrompt && (
        <View style={[styles.emptyCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.emptyTitle, { color: colors.text }]}>NO WORKOUTS YET</Text>
          <Text style={[styles.emptySub, { color: colors.textMuted }]}>
            Create your first workout template to get started.
          </Text>
          <TouchableOpacity
            style={[styles.createBtn, { backgroundColor: colors.primary }]}
            onPress={() => router.push('/template-editor')}
          >
            <Text style={[styles.createBtnText, { color: colors.primaryText }]}>CREATE WORKOUT</Text>
          </TouchableOpacity>
        </View>
      )}
    </ScrollView>
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
    marginTop: 6,
  },
  sectionHeader: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  customBtnText: {
    fontSize: 13,
    fontWeight: '700',
  },
  templateCard: {
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
  },
  templateHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  templateName: {
    fontSize: 18,
    fontWeight: '800',
  },
  exerciseCount: {
    fontSize: 12,
    fontWeight: '700',
  },
  templateDesc: {
    fontSize: 13,
    marginBottom: 12,
  },
  lastPerfRow: {
    flexDirection: 'row',
    borderRadius: 10,
    padding: 10,
    marginBottom: 14,
  },
  statBox: {
    flex: 1,
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '600',
  },
  statValue: {
    fontSize: 14,
    fontWeight: '700',
    marginTop: 2,
  },
  startButton: {
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  startText: {
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  seedCard: {
    borderWidth: 1.5,
    borderRadius: 14,
    padding: 16,
    marginBottom: 20,
  },
  seedTitle: {
    fontSize: 18,
    fontWeight: '800',
  },
  seedSub: {
    fontSize: 13,
    marginTop: 4,
    marginBottom: 14,
  },
  seedButtonRow: {
    flexDirection: 'row',
    gap: 10,
  },
  seedYesBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  seedYesText: {
    fontWeight: '800',
    fontSize: 13,
  },
  seedNoBtn: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  seedNoText: {
    fontWeight: '700',
    fontSize: 13,
  },
  emptyCard: {
    borderRadius: 14,
    padding: 24,
    alignItems: 'center',
    marginTop: 20,
    borderWidth: 1,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  emptySub: {
    fontSize: 13,
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 16,
  },
  createBtn: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  createBtnText: {
    fontWeight: '800',
    fontSize: 13,
  },
  brandHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 16,
    gap: 12,
  },
  brandLogo: {
    width: 44,
    height: 44,
    borderRadius: 10,
  },
  brandTextContainer: {
    flex: 1,
  },
  brandTitle: {
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: 1,
  },
  brandSubtitle: {
    fontSize: 11,
    fontWeight: '700',
    marginTop: 1,
  },
});
