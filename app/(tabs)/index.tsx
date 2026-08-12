// workout home screen for fast template execution and session recovery

import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useDatabase } from '../../src/context/DatabaseContext';
import { useWorkout } from '../../src/context/WorkoutContext';
import { WorkoutTemplate } from '../../src/types/workout';
import { getAllTemplates } from '../../src/database/queries/templateQueries';
import { getTemplateLastPerformedStats } from '../../src/database/queries/sessionQueries';
import { installExampleUpperBodyTemplate } from '../../src/database/seed';
import { ActiveWorkoutCard } from '../../src/components/ActiveWorkoutCard';

export default function WorkoutHomeScreen() {
  const { db, isReady } = useDatabase();
  const { activeSession, startWorkout } = useWorkout();
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
    // calculate last performed stats for each template via fast single-query lookup
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

  useEffect(() => {
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
  }, [isReady, db, activeSession, loadHomeData]);

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
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#6366f1" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* active workout recovery card */}
      <ActiveWorkoutCard />

      {/* first launch example workout installation prompt */}
      {showSeedPrompt && (
        <View style={styles.seedCard}>
          <Text style={styles.seedTitle}>Welcome to Workout Tracker</Text>
          <Text style={styles.seedSub}>
            Would you like to install the default &quot;Full Upper Body&quot; resistance training routine?
          </Text>
          <View style={styles.seedButtonRow}>
            <TouchableOpacity style={styles.seedYesBtn} onPress={handleInstallExample}>
              <Text style={styles.seedYesText}>YES, INSTALL</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.seedNoBtn} onPress={() => setShowSeedPrompt(false)}>
              <Text style={styles.seedNoText}>NO</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* header title */}
      <View style={styles.header}>
        <Text style={styles.sectionHeader}>WORKOUT ROUTINES</Text>
        <TouchableOpacity onPress={handleStartCustom}>
          <Text style={styles.customBtnText}>+ Quick Start</Text>
        </TouchableOpacity>
      </View>

      {/* template list */}
      {templates.map((template) => {
        const lastStat = templateLastPerformed[template.id];
        return (
          <View key={template.id} style={styles.templateCard}>
            <View style={styles.templateHeader}>
              <Text style={styles.templateName}>{template.name}</Text>
              <Text style={styles.exerciseCount}>{template.exercises.length} exercises</Text>
            </View>

            {template.description && (
              <Text style={styles.templateDesc}>{template.description}</Text>
            )}

            {lastStat && (
              <View style={styles.lastPerfRow}>
                <View style={styles.statBox}>
                  <Text style={styles.statLabel}>Last performed</Text>
                  <Text style={styles.statValue}>{lastStat.date}</Text>
                </View>
                <View style={styles.statBox}>
                  <Text style={styles.statLabel}>Last duration</Text>
                  <Text style={styles.statValue}>{lastStat.duration}</Text>
                </View>
              </View>
            )}

            <TouchableOpacity
              style={styles.startButton}
              onPress={() => handleStartTemplate(template.id)}
            >
              <Text style={styles.startText}>START WORKOUT</Text>
            </TouchableOpacity>
          </View>
        );
      })}

      {templates.length === 0 && !showSeedPrompt && (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyTitle}>NO WORKOUTS YET</Text>
          <Text style={styles.emptySub}>Create your first workout template to get started.</Text>
          <TouchableOpacity
            style={styles.createBtn}
            onPress={() => router.push('/template-editor')}
          >
            <Text style={styles.createBtnText}>CREATE WORKOUT</Text>
          </TouchableOpacity>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0f172a',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
    marginTop: 6,
  },
  sectionHeader: {
    color: '#64748b',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  customBtnText: {
    color: '#38bdf8',
    fontSize: 13,
    fontWeight: '700',
  },
  templateCard: {
    backgroundColor: '#1e293b',
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#334155',
  },
  templateHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  templateName: {
    color: '#f8fafc',
    fontSize: 18,
    fontWeight: '800',
  },
  exerciseCount: {
    color: '#38bdf8',
    fontSize: 12,
    fontWeight: '700',
  },
  templateDesc: {
    color: '#94a3b8',
    fontSize: 13,
    marginBottom: 12,
  },
  lastPerfRow: {
    flexDirection: 'row',
    backgroundColor: '#0f172a',
    borderRadius: 10,
    padding: 10,
    marginBottom: 14,
  },
  statBox: {
    flex: 1,
  },
  statLabel: {
    color: '#64748b',
    fontSize: 11,
    fontWeight: '600',
  },
  statValue: {
    color: '#f8fafc',
    fontSize: 14,
    fontWeight: '700',
    marginTop: 2,
  },
  startButton: {
    backgroundColor: '#6366f1',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  startText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  seedCard: {
    backgroundColor: '#1e1b4b',
    borderColor: '#6366f1',
    borderWidth: 1,
    borderRadius: 14,
    padding: 16,
    marginBottom: 20,
  },
  seedTitle: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '800',
  },
  seedSub: {
    color: '#cbd5e1',
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
    backgroundColor: '#6366f1',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  seedYesText: {
    color: '#ffffff',
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
    color: '#94a3b8',
    fontWeight: '700',
    fontSize: 13,
  },
  emptyCard: {
    backgroundColor: '#1e293b',
    borderRadius: 14,
    padding: 24,
    alignItems: 'center',
    marginTop: 20,
  },
  emptyTitle: {
    color: '#f8fafc',
    fontSize: 16,
    fontWeight: '800',
  },
  emptySub: {
    color: '#94a3b8',
    fontSize: 13,
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 16,
  },
  createBtn: {
    backgroundColor: '#6366f1',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  createBtnText: {
    color: '#ffffff',
    fontWeight: '800',
    fontSize: 13,
  },
});
