// app settings and 100% local json import/export management screen

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useDatabase } from '../../src/context/DatabaseContext';
import { useSettings } from '../../src/context/SettingsContext';
import { useWorkout } from '../../src/context/WorkoutContext';
import {
  exportBackupToFile,
  pickAndValidateBackupFile,
  importBackupToDatabase,
  exportHistoryToCsv,
  exportHistoryToHevyCsv,
} from '../../src/services/importExport';
import { deleteAllApplicationData } from '../../src/database/queries/settingsQueries';

import { importHevyCsvFile } from '../../src/services/hevyImporter';

export default function SettingsScreen() {
  const { db, notifyDataChanged } = useDatabase();
  const { settings, updateSettings, reloadSettings } = useSettings();
  const { refreshActiveSession } = useWorkout();

  const [loading, setLoading] = useState(false);

  const handleExportJson = async () => {
    if (!db) return;
    setLoading(true);
    try {
      await exportBackupToFile(db);
    } catch (err: any) {
      Alert.alert('Export Error', err.message || 'Failed to export backup JSON file.');
    } finally {
      setLoading(false);
    }
  };

  const handleExportCsv = async () => {
    if (!db) return;
    try {
      setLoading(true);
      await exportHistoryToCsv(db);
    } catch (err: any) {
      Alert.alert('CSV Export Error', err.message || 'Failed to export CSV history file.');
    } finally {
      setLoading(false);
    }
  };

  const handleExportHevyCsv = async () => {
    if (!db) return;
    try {
      setLoading(true);
      await exportHistoryToHevyCsv(db);
    } catch (err: any) {
      Alert.alert('Hevy CSV Export Error', err.message || 'Failed to export Hevy CSV history file.');
    } finally {
      setLoading(false);
    }
  };

  const handleImportJson = async () => {
    if (!db) return;
    try {
      const result = await pickAndValidateBackupFile();
      if (!result.validation.valid || !result.backupObj) {
        Alert.alert(
          'Unable to Import Backup',
          `The selected file is not a valid backup.\n\n${result.validation.errors.join('\n')}`
        );
        return;
      }

      const summary = result.validation.summary;
      const summaryMsg = summary
        ? `IMPORT SUMMARY\n\nExercises: ${summary.exerciseCount}\nTemplates: ${summary.templateCount}\nWorkout Sessions: ${summary.sessionCount}\n\nProceed with import?`
        : 'Proceed with import?';

      Alert.alert('Import Backup', summaryMsg, [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Import',
          onPress: async () => {
            setLoading(true);
            try {
              await importBackupToDatabase(db, result.backupObj!);
              await reloadSettings();
              await refreshActiveSession();
              notifyDataChanged();
              Alert.alert('Import Complete', 'Your backup data was successfully restored.');
            } catch (err: any) {
              Alert.alert('Import Failed', err.message || 'Error occurred during transaction.');
            } finally {
              setLoading(false);
            }
          },
        },
      ]);
    } catch (err: any) {
      Alert.alert('Import Error', err.message || 'Failed to read file.');
    }
  };

  const handleImportHevyCsv = async () => {
    if (!db) return;
    try {
      setLoading(true);
      const res = await importHevyCsvFile(db);
      if (res) {
        await reloadSettings();
        await refreshActiveSession();
        notifyDataChanged();
        Alert.alert(
          'Hevy Import Successful!',
          `Imported ${res.importedSessionsCount} workouts, ${res.importedSetsCount} sets, and ${res.importedExercisesCount} new exercises.\n\nAll personal records and statistics updated!`
        );
      }
    } catch (err: any) {
      Alert.alert('Hevy Import Error', err.message || 'Failed to import Hevy CSV file.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAll = () => {
    Alert.alert(
      'DELETE ALL DATA',
      'This will permanently delete your workout history, templates, exercises, and settings. Consider exporting a backup first.\n\nAre you sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'DELETE EVERYTHING',
          style: 'destructive',
          onPress: async () => {
            if (!db) return;
            setLoading(true);
            try {
              await deleteAllApplicationData(db);
              await reloadSettings();
              await refreshActiveSession();
              notifyDataChanged();
              Alert.alert('Data Cleared', 'All local application data has been wiped.');
            } catch (err: any) {
              Alert.alert('Error', err.message || 'Failed to clear database.');
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  const timerOptions = [60, 90, 120, 180, 300];

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {loading && (
        <View style={styles.loadingBanner}>
          <ActivityIndicator size="small" color="#6366f1" />
          <Text style={styles.loadingText}>Processing data...</Text>
        </View>
      )}

      {/* unit preferences */}
      <Text style={styles.sectionTitle}>WEIGHT UNIT</Text>
      <View style={styles.card}>
        <View style={styles.toggleRow}>
          <Text style={styles.rowLabel}>Primary Unit</Text>
          <View style={styles.segmentedControl}>
            <TouchableOpacity
              style={[styles.segBtn, settings.weightUnit === 'kg' && styles.segBtnActive]}
              onPress={() => updateSettings({ weightUnit: 'kg' })}
            >
              <Text style={[styles.segText, settings.weightUnit === 'kg' && styles.segTextActive]}>
                KG
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.segBtn, settings.weightUnit === 'lb' && styles.segBtnActive]}
              onPress={() => updateSettings({ weightUnit: 'lb' })}
            >
              <Text style={[styles.segText, settings.weightUnit === 'lb' && styles.segTextActive]}>
                LB
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* automatic rest timer defaults */}
      <Text style={styles.sectionTitle}>AUTOMATIC REST TIMERS</Text>
      <View style={styles.card}>
        <Text style={styles.timerPickerTitle}>Rest Between Sets (Seconds)</Text>
        <View style={styles.segmentedControl}>
          {timerOptions.map((opt) => (
            <TouchableOpacity
              key={`set_${opt}`}
              style={[styles.segBtn, settings.defaultSetRestSeconds === opt && styles.segBtnActive]}
              onPress={() => updateSettings({ defaultSetRestSeconds: opt })}
            >
              <Text
                style={[
                  styles.segText,
                  settings.defaultSetRestSeconds === opt && styles.segTextActive,
                ]}
              >
                {opt}s
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.divider} />

        <Text style={styles.timerPickerTitle}>Rest After Exercise (Seconds)</Text>
        <View style={styles.segmentedControl}>
          {timerOptions.map((opt) => (
            <TouchableOpacity
              key={`ex_${opt}`}
              style={[
                styles.segBtn,
                settings.defaultExerciseRestSeconds === opt && styles.segBtnActive,
              ]}
              onPress={() => updateSettings({ defaultExerciseRestSeconds: opt })}
            >
              <Text
                style={[
                  styles.segText,
                  settings.defaultExerciseRestSeconds === opt && styles.segTextActive,
                ]}
              >
                {opt}s
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* workout preferences */}
      <Text style={styles.sectionTitle}>WORKOUT PREFERENCES</Text>
      <View style={styles.card}>
        <View style={styles.toggleRow}>
          <Text style={styles.rowLabel}>Keep Screen Awake During Workout</Text>
          <Switch
            value={settings.keepScreenAwake}
            onValueChange={(val) => updateSettings({ keepScreenAwake: val })}
            trackColor={{ false: '#334155', true: '#6366f1' }}
          />
        </View>

        <View style={styles.divider} />

        <View style={styles.toggleRow}>
          <Text style={styles.rowLabel}>Haptic Feedback</Text>
          <Switch
            value={settings.hapticFeedback}
            onValueChange={(val) => updateSettings({ hapticFeedback: val })}
            trackColor={{ false: '#334155', true: '#6366f1' }}
          />
        </View>

        <View style={styles.divider} />

        <View style={styles.toggleRow}>
          <Text style={styles.rowLabel}>Show RIR Column</Text>
          <Switch
            value={settings.showRir}
            onValueChange={(val) => updateSettings({ showRir: val })}
            trackColor={{ false: '#334155', true: '#6366f1' }}
          />
        </View>
      </View>

      {/* data import & export */}
      <Text style={styles.sectionTitle}>DATA BACKUP & INTERCHANGE</Text>
      <View style={styles.card}>
        <TouchableOpacity style={styles.actionRow} onPress={handleImportHevyCsv}>
          <Text style={styles.actionLabel}>Import Data from Hevy (CSV)</Text>
          <Text style={styles.actionIcon}>🏋️</Text>
        </TouchableOpacity>

        <View style={styles.divider} />

        <TouchableOpacity style={styles.actionRow} onPress={handleExportHevyCsv}>
          <Text style={styles.actionLabel}>Export Data to Hevy (CSV)</Text>
          <Text style={styles.actionIcon}>📤</Text>
        </TouchableOpacity>

        <View style={styles.divider} />

        <TouchableOpacity style={styles.actionRow} onPress={handleExportJson}>
          <Text style={styles.actionLabel}>Export Everything to JSON</Text>
          <Text style={styles.actionIcon}>📦</Text>
        </TouchableOpacity>

        <View style={styles.divider} />

        <TouchableOpacity style={styles.actionRow} onPress={handleImportJson}>
          <Text style={styles.actionLabel}>Import Workouts / History from JSON</Text>
          <Text style={styles.actionIcon}>📥</Text>
        </TouchableOpacity>

        <View style={styles.divider} />

        <TouchableOpacity style={styles.actionRow} onPress={handleExportCsv}>
          <Text style={styles.actionLabel}>Export History to CSV</Text>
          <Text style={styles.actionIcon}>📊</Text>
        </TouchableOpacity>

        <View style={styles.divider} />

        <TouchableOpacity style={styles.actionRow} onPress={handleDeleteAll}>
          <Text style={[styles.actionLabel, { color: '#ef4444' }]}>Delete All Data</Text>
          <Text style={styles.actionIcon}>🗑️</Text>
        </TouchableOpacity>
      </View>

      {/* app & architecture info */}
      <Text style={styles.sectionTitle}>ABOUT APP</Text>
      <View style={styles.card}>
        <View style={styles.infoRow}>
          <Text style={styles.infoKey}>App Name</Text>
          <Text style={styles.infoVal}>Progressive Workout Tracker</Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.infoRow}>
          <Text style={styles.infoKey}>Architecture</Text>
          <Text style={styles.infoVal}>100% Local & Offline</Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.infoRow}>
          <Text style={styles.infoKey}>Database</Text>
          <Text style={styles.infoVal}>SQLite (expo-sqlite)</Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.infoRow}>
          <Text style={styles.infoKey}>Backup Schema</Text>
          <Text style={styles.infoVal}>Version 1 (JSON)</Text>
        </View>
      </View>
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
  loadingBanner: {
    backgroundColor: '#312e81',
    borderRadius: 10,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 10,
  },
  loadingText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
  timerPickerTitle: {
    color: '#94a3b8',
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 8,
    marginTop: 4,
  },
  sectionTitle: {
    color: '#64748b',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.5,
    marginBottom: 8,
    marginTop: 10,
  },
  card: {
    backgroundColor: '#1e293b',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#334155',
  },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  rowLabel: {
    color: '#f8fafc',
    fontSize: 15,
    fontWeight: '600',
    flex: 1,
  },
  segmentedControl: {
    flexDirection: 'row',
    backgroundColor: '#0f172a',
    borderRadius: 8,
    padding: 2,
  },
  segBtn: {
    paddingVertical: 6,
    paddingHorizontal: 16,
    borderRadius: 6,
  },
  segBtnActive: {
    backgroundColor: '#6366f1',
  },
  segText: {
    color: '#64748b',
    fontSize: 13,
    fontWeight: '800',
  },
  segTextActive: {
    color: '#ffffff',
  },
  divider: {
    height: 1,
    backgroundColor: '#334155',
    marginVertical: 4,
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  actionLabel: {
    color: '#f8fafc',
    fontSize: 15,
    fontWeight: '600',
  },
  actionIcon: {
    fontSize: 16,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
  },
  infoKey: {
    color: '#94a3b8',
    fontSize: 14,
  },
  infoVal: {
    color: '#f8fafc',
    fontSize: 14,
    fontWeight: '700',
  },
});
