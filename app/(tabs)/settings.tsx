// app settings and local json import/export management screen with theme selection

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
import { useAppTheme } from '../../src/context/ThemeContext';
import {
  exportBackupToFile,
  pickAndValidateBackupFile,
  importBackupToDatabase,
  exportHistoryToCsv,
  exportHistoryToHevyCsv,
} from '../../src/services/importExport';
import { deleteAllApplicationData } from '../../src/database/queries/settingsQueries';
import { importHevyCsvFile } from '../../src/services/hevyImporter';

import { useAppAlert } from '../../src/context/AlertContext';

export default function SettingsScreen() {
  const { db, notifyDataChanged } = useDatabase();
  const { settings, updateSettings, reloadSettings } = useSettings();
  const { refreshActiveSession } = useWorkout();
  const { colors, themeMode, themePalette, setThemeMode, setThemePalette } = useAppTheme();
  const { showAlert, showConfirm } = useAppAlert();

  const [loading, setLoading] = useState(false);

  const handleExportJson = async () => {
    if (!db) return;
    setLoading(true);
    try {
      await exportBackupToFile(db);
    } catch (err: any) {
      showAlert({
        title: 'Export Error',
        message: err.message || 'Failed to export backup JSON file.',
        icon: '⚠️',
      });
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
      showAlert({
        title: 'CSV Export Error',
        message: err.message || 'Failed to export CSV history file.',
        icon: '⚠️',
      });
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
      showAlert({
        title: 'Hevy CSV Export Error',
        message: err.message || 'Failed to export Hevy CSV history file.',
        icon: '⚠️',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleImportJson = async () => {
    if (!db) return;
    try {
      const result = await pickAndValidateBackupFile();
      if (!result.validation.valid || !result.backupObj) {
        showAlert({
          title: 'Unable to Import Backup',
          message: `The selected file is not a valid backup.\n\n${result.validation.errors.join('\n')}`,
          icon: '⚠️',
        });
        return;
      }

      const summary = result.validation.summary;
      const summaryMsg = summary
        ? `Exercises: ${summary.exerciseCount}\nTemplates: ${summary.templateCount}\nWorkout Sessions: ${summary.sessionCount}\n\nProceed with restoring this backup?`
        : 'Proceed with restoring this backup?';

      showAlert({
        title: 'Import Backup Summary',
        message: summaryMsg,
        icon: '📦',
        buttons: [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Restore Backup',
            style: 'default',
            onPress: async () => {
              setLoading(true);
              try {
                await importBackupToDatabase(db, result.backupObj!);
                await reloadSettings();
                await refreshActiveSession();
                notifyDataChanged();
                showAlert({
                  title: 'Import Complete',
                  message: 'Your workout backup data was successfully restored.',
                  icon: '✅',
                });
              } catch (err: any) {
                showAlert({
                  title: 'Import Failed',
                  message: err.message || 'Error occurred during transaction.',
                  icon: '⚠️',
                });
              } finally {
                setLoading(false);
              }
            },
          },
        ],
      });
    } catch (err: any) {
      showAlert({
        title: 'Import Error',
        message: err.message || 'Failed to read backup file.',
        icon: '⚠️',
      });
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
        showAlert({
          title: 'Hevy Import Successful!',
          message: `Imported ${res.importedSessionsCount} workouts, ${res.importedSetsCount} sets, and ${res.importedExercisesCount} new exercises.\n\nAll personal records and statistics have been refreshed!`,
          icon: '🏋️',
        });
      }
    } catch (err: any) {
      showAlert({
        title: 'Hevy Import Error',
        message: err.message || 'Failed to import Hevy CSV file.',
        icon: '⚠️',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAll = () => {
    showConfirm(
      'DELETE ALL APP DATA',
      'This will permanently delete all your workout history, custom routines, exercises, and preferences. This action is irreversible.\n\nAre you sure?',
      async () => {
        if (!db) return;
        setLoading(true);
        try {
          await deleteAllApplicationData(db);
          await reloadSettings();
          await refreshActiveSession();
          notifyDataChanged();
          showAlert({
            title: 'Data Cleared',
            message: 'All local application data has been wiped.',
            icon: '✅',
          });
        } catch (err: any) {
          showAlert({
            title: 'Error',
            message: err.message || 'Failed to clear database.',
            icon: '⚠️',
          });
        } finally {
          setLoading(false);
        }
      },
      {
        confirmText: 'Wipe Everything',
        isDestructive: true,
        icon: '🗑️',
      }
    );
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]} contentContainerStyle={styles.content}>
      {loading && (
        <View style={[styles.loadingBanner, { backgroundColor: colors.cardAlt }]}>
          <ActivityIndicator size="small" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.text }]}>Processing data...</Text>
        </View>
      )}

      {/* appearance & theme preferences */}
      <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>APPEARANCE & THEME</Text>
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.toggleRow}>
          <Text style={[styles.rowLabel, { color: colors.text }]}>Theme Mode</Text>
          <View style={[styles.segmentedControl, { backgroundColor: colors.cardAlt }]}>
            <TouchableOpacity
              style={[styles.segBtn, themeMode === 'light' && { backgroundColor: colors.primary }]}
              onPress={() => setThemeMode('light')}
            >
              <Text
                style={[
                  styles.segText,
                  { color: colors.textMuted },
                  themeMode === 'light' && { color: colors.primaryText, fontWeight: '800' },
                ]}
              >
                LIGHT
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.segBtn, themeMode === 'dark' && { backgroundColor: colors.primary }]}
              onPress={() => setThemeMode('dark')}
            >
              <Text
                style={[
                  styles.segText,
                  { color: colors.textMuted },
                  themeMode === 'dark' && { color: colors.primaryText, fontWeight: '800' },
                ]}
              >
                DARK
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.segBtn, themeMode === 'system' && { backgroundColor: colors.primary }]}
              onPress={() => setThemeMode('system')}
            >
              <Text
                style={[
                  styles.segText,
                  { color: colors.textMuted },
                  themeMode === 'system' && { color: colors.primaryText, fontWeight: '800' },
                ]}
              >
                AUTO
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={[styles.divider, { backgroundColor: colors.border }]} />

        <View style={styles.toggleRow}>
          <Text style={[styles.rowLabel, { color: colors.text }]}>Color Palette</Text>
          <View style={[styles.segmentedControl, { backgroundColor: colors.cardAlt }]}>
            <TouchableOpacity
              style={[styles.segBtn, themePalette === 'cyber' && { backgroundColor: colors.primary }]}
              onPress={() => setThemePalette('cyber')}
            >
              <Text
                style={[
                  styles.segText,
                  { color: colors.textMuted },
                  themePalette === 'cyber' && { color: colors.primaryText, fontWeight: '800' },
                ]}
              >
                CYBER (PINK/TEAL)
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.segBtn, themePalette === 'neutral' && { backgroundColor: colors.primary }]}
              onPress={() => setThemePalette('neutral')}
            >
              <Text
                style={[
                  styles.segText,
                  { color: colors.textMuted },
                  themePalette === 'neutral' && { color: colors.primaryText, fontWeight: '800' },
                ]}
              >
                MINIMAL
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* unit preferences */}
      <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>WEIGHT UNIT</Text>
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.toggleRow}>
          <Text style={[styles.rowLabel, { color: colors.text }]}>Primary Unit</Text>
          <View style={[styles.segmentedControl, { backgroundColor: colors.cardAlt }]}>
            <TouchableOpacity
              style={[styles.segBtn, settings.weightUnit === 'kg' && { backgroundColor: colors.primary }]}
              onPress={() => updateSettings({ weightUnit: 'kg' })}
            >
              <Text
                style={[
                  styles.segText,
                  { color: colors.textMuted },
                  settings.weightUnit === 'kg' && { color: colors.primaryText, fontWeight: '800' },
                ]}
              >
                KG
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.segBtn, settings.weightUnit === 'lb' && { backgroundColor: colors.primary }]}
              onPress={() => updateSettings({ weightUnit: 'lb' })}
            >
              <Text
                style={[
                  styles.segText,
                  { color: colors.textMuted },
                  settings.weightUnit === 'lb' && { color: colors.primaryText, fontWeight: '800' },
                ]}
              >
                LB
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* workout preferences */}
      <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>WORKOUT PREFERENCES</Text>
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.toggleRow}>
          <Text style={[styles.rowLabel, { color: colors.text }]}>Keep Screen Awake During Workout</Text>
          <Switch
            value={settings.keepScreenAwake}
            onValueChange={(val) => updateSettings({ keepScreenAwake: val })}
            trackColor={{ false: colors.cardAlt, true: colors.primary }}
          />
        </View>

        <View style={[styles.divider, { backgroundColor: colors.border }]} />

        <View style={styles.toggleRow}>
          <Text style={[styles.rowLabel, { color: colors.text }]}>Haptic Feedback</Text>
          <Switch
            value={settings.hapticFeedback}
            onValueChange={(val) => updateSettings({ hapticFeedback: val })}
            trackColor={{ false: colors.cardAlt, true: colors.primary }}
          />
        </View>
      </View>

      {/* data import & export */}
      <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>DATA BACKUP & INTERCHANGE</Text>
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <TouchableOpacity style={styles.actionRow} onPress={handleImportHevyCsv}>
          <Text style={[styles.actionLabel, { color: colors.text }]}>Import Data from Hevy (CSV)</Text>
          <Text style={styles.actionIcon}>🏋️</Text>
        </TouchableOpacity>

        <View style={[styles.divider, { backgroundColor: colors.border }]} />

        <TouchableOpacity style={styles.actionRow} onPress={handleExportHevyCsv}>
          <Text style={[styles.actionLabel, { color: colors.text }]}>Export Data to Hevy (CSV)</Text>
          <Text style={styles.actionIcon}>📤</Text>
        </TouchableOpacity>

        <View style={[styles.divider, { backgroundColor: colors.border }]} />

        <TouchableOpacity style={styles.actionRow} onPress={handleExportJson}>
          <Text style={[styles.actionLabel, { color: colors.text }]}>Export Everything to JSON</Text>
          <Text style={styles.actionIcon}>📦</Text>
        </TouchableOpacity>

        <View style={[styles.divider, { backgroundColor: colors.border }]} />

        <TouchableOpacity style={styles.actionRow} onPress={handleImportJson}>
          <Text style={[styles.actionLabel, { color: colors.text }]}>Import Workouts / History from JSON</Text>
          <Text style={styles.actionIcon}>📥</Text>
        </TouchableOpacity>

        <View style={[styles.divider, { backgroundColor: colors.border }]} />

        <TouchableOpacity style={styles.actionRow} onPress={handleExportCsv}>
          <Text style={[styles.actionLabel, { color: colors.text }]}>Export History to CSV</Text>
          <Text style={styles.actionIcon}>📊</Text>
        </TouchableOpacity>

        <View style={[styles.divider, { backgroundColor: colors.border }]} />

        <TouchableOpacity style={styles.actionRow} onPress={handleDeleteAll}>
          <Text style={[styles.actionLabel, { color: colors.danger }]}>Delete All Data</Text>
          <Text style={styles.actionIcon}>🗑️</Text>
        </TouchableOpacity>
      </View>
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
  loadingBanner: {
    borderRadius: 10,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 10,
  },
  loadingText: {
    fontSize: 13,
    fontWeight: '700',
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.5,
    marginBottom: 8,
    marginTop: 10,
  },
  card: {
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 16,
    borderWidth: 1,
  },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  rowLabel: {
    fontSize: 15,
    fontWeight: '600',
    flex: 1,
  },
  segmentedControl: {
    flexDirection: 'row',
    borderRadius: 8,
    padding: 2,
  },
  segBtn: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 6,
  },
  segText: {
    fontSize: 12,
    fontWeight: '700',
  },
  divider: {
    height: 1,
    marginVertical: 4,
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  actionLabel: {
    fontSize: 15,
    fontWeight: '600',
  },
  actionIcon: {
    fontSize: 16,
  },
});
