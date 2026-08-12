// database queries for key-value settings storage

import * as SQLite from 'expo-sqlite';
import { UserSettings } from '../../types/workout';

export const DEFAULT_SETTINGS: UserSettings = {
  weightUnit: 'kg',
  theme: 'dark',
  defaultSetRestSeconds: 120,
  defaultExerciseRestSeconds: 120,
  keepScreenAwake: true,
  hapticFeedback: true,
  timerVibration: true,
  timerSound: true,
  showRir: true,
};

export async function getUserSettings(
  db: SQLite.SQLiteDatabase
): Promise<UserSettings> {
  const rows = await db.getAllAsync<{ key: string; value: string }>(
    'SELECT key, value FROM settings;'
  );

  const settings: UserSettings = { ...DEFAULT_SETTINGS };

  for (const r of rows) {
    if (r.key === 'weightUnit') settings.weightUnit = r.value as any;
    if (r.key === 'theme') settings.theme = r.value as any;
    if (r.key === 'defaultSetRestSeconds') settings.defaultSetRestSeconds = parseInt(r.value, 10);
    if (r.key === 'defaultExerciseRestSeconds')
      settings.defaultExerciseRestSeconds = parseInt(r.value, 10);
    if (r.key === 'keepScreenAwake') settings.keepScreenAwake = r.value === 'true';
    if (r.key === 'hapticFeedback') settings.hapticFeedback = r.value === 'true';
    if (r.key === 'timerVibration') settings.timerVibration = r.value === 'true';
    if (r.key === 'timerSound') settings.timerSound = r.value === 'true';
    if (r.key === 'showRir') settings.showRir = r.value === 'true';
  }

  return settings;
}

export async function saveUserSettings(
  db: SQLite.SQLiteDatabase,
  settings: Partial<UserSettings>
): Promise<void> {
  const entries = Object.entries(settings);
  for (const [key, value] of entries) {
    const valStr = typeof value === 'boolean' ? (value ? 'true' : 'false') : String(value);
    await db.runAsync(
      `INSERT INTO settings (key, value) VALUES (?, ?)
       ON CONFLICT(key) DO UPDATE SET value = excluded.value;`,
      [key, valStr]
    );
  }
}

export async function deleteAllApplicationData(db: SQLite.SQLiteDatabase): Promise<void> {
  await db.execAsync(`
    DELETE FROM sets;
    DELETE FROM workout_session_exercises;
    DELETE FROM workout_sessions;
    DELETE FROM workout_template_exercises;
    DELETE FROM workout_templates;
    DELETE FROM personal_records;
    DELETE FROM exercises;
    DELETE FROM settings;
    INSERT INTO settings (key, value) VALUES ('has_completed_initial_seed', 'true');
  `);
}
