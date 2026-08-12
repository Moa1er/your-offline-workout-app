// saved workout templates management screen

import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useDatabase } from '../../src/context/DatabaseContext';
import { WorkoutTemplate } from '../../src/types/workout';
import {
  getAllTemplates,
  deleteTemplate,
  duplicateTemplate,
} from '../../src/database/queries/templateQueries';

export default function TemplatesScreen() {
  const { db, isReady } = useDatabase();
  const router = useRouter();

  const [templates, setTemplates] = useState<WorkoutTemplate[]>([]);
  const [loading, setLoading] = useState(true);

  const loadTemplates = useCallback(async (): Promise<WorkoutTemplate[]> => {
    if (!db) return [];
    return getAllTemplates(db);
  }, [db]);

  useEffect(() => {
    if (!isReady || !db) return;
    let cancelled = false;
    (async () => {
      try {
        const tmpls = await loadTemplates();
        if (!cancelled) setTemplates(tmpls);
      } catch (err) {
        console.error('error loading templates:', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isReady, db, loadTemplates]);

  const handleDelete = (id: string, name: string) => {
    Alert.alert('Delete Template', `Are you sure you want to delete "${name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          if (!db) return;
          await deleteTemplate(db, id);
          setTemplates(await loadTemplates());
        },
      },
    ]);
  };

  const handleDuplicate = async (id: string) => {
    if (!db) return;
    await duplicateTemplate(db, id);
    setTemplates(await loadTemplates());
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
      <View style={styles.headerRow}>
        <Text style={styles.sectionHeader}>SAVED ROUTINES</Text>
        <TouchableOpacity
          style={styles.newBtn}
          onPress={() => router.push('/template-editor')}
        >
          <Text style={styles.newBtnText}>+ NEW TEMPLATE</Text>
        </TouchableOpacity>
      </View>

      {templates.map((tmpl) => (
        <View key={tmpl.id} style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.templateTitle}>{tmpl.name}</Text>
            <Text style={styles.exBadge}>{tmpl.exercises.length} exercises</Text>
          </View>

          {tmpl.description && <Text style={styles.descText}>{tmpl.description}</Text>}

          <View style={styles.exList}>
            {tmpl.exercises.map((te, idx) => (
              <Text key={te.id || idx} style={styles.exItemText}>
                {idx + 1}. {te.exerciseName} ({te.targetSets} sets × {te.repMin}-{te.repMax} reps)
              </Text>
            ))}
          </View>

          <View style={styles.actionRow}>
            <TouchableOpacity
              style={styles.editBtn}
              onPress={() => router.push({ pathname: '/template-editor', params: { id: tmpl.id } })}
            >
              <Text style={styles.editBtnText}>EDIT</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.dupBtn}
              onPress={() => handleDuplicate(tmpl.id)}
            >
              <Text style={styles.dupBtnText}>DUPLICATE</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.delBtn}
              onPress={() => handleDelete(tmpl.id, tmpl.name)}
            >
              <Text style={styles.delBtnText}>DELETE</Text>
            </TouchableOpacity>
          </View>
        </View>
      ))}
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
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  sectionHeader: {
    color: '#64748b',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  newBtn: {
    backgroundColor: '#6366f1',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  newBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '800',
  },
  card: {
    backgroundColor: '#1e293b',
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#334155',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  templateTitle: {
    color: '#f8fafc',
    fontSize: 18,
    fontWeight: '800',
  },
  exBadge: {
    color: '#38bdf8',
    fontSize: 12,
    fontWeight: '700',
  },
  descText: {
    color: '#94a3b8',
    fontSize: 13,
    marginBottom: 10,
  },
  exList: {
    backgroundColor: '#0f172a',
    borderRadius: 10,
    padding: 12,
    marginBottom: 14,
    gap: 6,
  },
  exItemText: {
    color: '#cbd5e1',
    fontSize: 13,
    fontWeight: '600',
  },
  actionRow: {
    flexDirection: 'row',
    gap: 8,
  },
  editBtn: {
    flex: 1,
    backgroundColor: '#312e81',
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
  },
  editBtnText: {
    color: '#a5b4fc',
    fontWeight: '700',
    fontSize: 12,
  },
  dupBtn: {
    backgroundColor: '#334155',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  dupBtnText: {
    color: '#f8fafc',
    fontWeight: '700',
    fontSize: 12,
  },
  delBtn: {
    backgroundColor: '#7f1d1d',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  delBtnText: {
    color: '#fca5a5',
    fontWeight: '700',
    fontSize: 12,
  },
});
