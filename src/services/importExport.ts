// json import/export and csv export services using expo-file-system and expo-sharing

import * as SQLite from 'expo-sqlite';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import { WorkoutBackup, ExportedExercise, ExportedWorkoutTemplate, ExportedWorkoutSession } from '../types/backup';
import { validateWorkoutBackup } from './backupValidator';
import { getAllExercises } from '../database/queries/exerciseQueries';
import { getAllTemplates } from '../database/queries/templateQueries';
import { getAllCompletedSessions } from '../database/queries/sessionQueries';
import { getUserSettings, saveUserSettings } from '../database/queries/settingsQueries';
import { recalculateAllPersonalRecords } from '../database/queries/prQueries';
import { generateId as uuidv4 } from '../utils/uuid';

function writeTextFile(filename: string, content: string): File {
  const file = new File(Paths.document, filename);
  if (!file.exists) {
    file.create();
  }
  file.write(content);
  return file;
}

/**
 * serializes all app data into json backup string matching schema version 1
 */
export async function generateBackupJson(db: SQLite.SQLiteDatabase): Promise<WorkoutBackup> {
  const exercises = await getAllExercises(db, true);
  const templates = await getAllTemplates(db);
  const sessions = await getAllCompletedSessions(db);
  const settings = await getUserSettings(db);

  const exportedExercises: ExportedExercise[] = exercises.map((e) => ({
    id: e.id,
    name: e.name,
    primaryMuscle: e.primaryMuscle,
    secondaryMuscles: e.secondaryMuscles,
    equipment: e.equipment,
    category: e.category,
    trackingType: e.trackingType,
    notes: e.notes || null,
    archived: e.archived,
  }));

  const exportedTemplates: ExportedWorkoutTemplate[] = templates.map((t) => ({
    id: t.id,
    name: t.name,
    description: t.description || null,
    exercises: t.exercises.map((te) => ({
      exerciseId: te.exerciseId,
      order: te.order,
      targetSets: te.targetSets,
      targetReps: te.targetReps ?? te.repMax ?? te.repMin ?? 10,
      repMin: te.repMin ?? te.targetReps ?? 10,
      repMax: te.repMax ?? te.targetReps ?? 10,
      targetRir: te.targetRir || null,
      restBetweenSetsSeconds: te.restBetweenSetsSeconds,
      restAfterExerciseSeconds: te.restAfterExerciseSeconds,
      notes: te.notes || null,
    })),
  }));

  const exportedSessions: ExportedWorkoutSession[] = sessions.map((s) => ({
    id: s.id,
    templateId: s.templateId || null,
    name: s.name,
    startedAt: s.startedAt,
    finishedAt: s.finishedAt || null,
    notes: s.notes || null,
    exercises: s.exercises.map((se) => ({
      exerciseId: se.exerciseId,
      order: se.order,
      notes: se.notes || null,
      sets: se.sets.map((st) => ({
        id: st.id,
        setNumber: st.setNumber,
        type: st.type,
        weightKg: st.weightKg,
        reps: st.reps,
        rir: st.rir || null,
        completed: st.completed,
      })),
    })),
  }));

  return {
    schemaVersion: 1,
    exportedAt: new Date().toISOString(),
    app: {
      name: 'Progressive Workout Tracker',
      version: '1.0.0',
    },
    settings,
    exercises: exportedExercises,
    workoutTemplates: exportedTemplates,
    workoutSessions: exportedSessions,
  };
}

/**
 * exports json backup file and triggers native sharing dialog
 */
export async function exportBackupToFile(db: SQLite.SQLiteDatabase): Promise<string> {
  const backupObj = await generateBackupJson(db);
  const jsonStr = JSON.stringify(backupObj, null, 2);

  const dateStr = new Date().toISOString().split('T')[0];
  const filename = `WorkoutTracker_Backup_${dateStr}.json`;
  const file = writeTextFile(filename, jsonStr);

  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(file.uri, {
      mimeType: 'application/json',
      dialogTitle: 'Export Workout Backup',
    });
  }

  return file.uri;
}

/**
 * prompts user to pick a local json backup file and validates its contents
 */
export async function pickAndValidateBackupFile(): Promise<{
  backupObj?: WorkoutBackup;
  validation: ReturnType<typeof validateWorkoutBackup>;
}> {
  const result = await DocumentPicker.getDocumentAsync({
    type: 'application/json',
    copyToCacheDirectory: true,
  });

  if (result.canceled || !result.assets || result.assets.length === 0) {
    return {
      validation: { valid: false, errors: ['File selection was cancelled.'] },
    };
  }

  const fileUri = result.assets[0].uri;
  const content = await new File(fileUri).text();

  let parsed: any;
  try {
    parsed = JSON.parse(content);
  } catch {
    return {
      validation: { valid: false, errors: ['Selected file does not contain valid JSON text.'] },
    };
  }

  const validation = validateWorkoutBackup(parsed);
  return {
    backupObj: validation.valid ? parsed : undefined,
    validation,
  };
}

/**
 * executes database import transactionally. rolls back if any error occurs
 */
export async function importBackupToDatabase(
  db: SQLite.SQLiteDatabase,
  backup: WorkoutBackup
): Promise<void> {
  const validation = validateWorkoutBackup(backup);
  if (!validation.valid) {
    throw new Error(`Invalid backup data: ${validation.errors.join('; ')}`);
  }

  const now = new Date().toISOString();

  // execute transaction block
  await db.withTransactionAsync(async () => {
    // 1. import settings
    if (backup.settings) {
      await saveUserSettings(db, backup.settings);
    }

    // 2. import exercises
    for (const ex of backup.exercises) {
      await db.runAsync(
        `INSERT INTO exercises (id, name, primary_muscle, secondary_muscles_json, equipment, category, tracking_type, notes, archived, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET
           name = excluded.name,
           primary_muscle = excluded.primary_muscle,
           secondary_muscles_json = excluded.secondary_muscles_json,
           equipment = excluded.equipment,
           category = excluded.category,
           tracking_type = excluded.tracking_type,
           notes = excluded.notes,
           archived = excluded.archived,
           updated_at = excluded.updated_at;`,
        [
          ex.id,
          ex.name,
          ex.primaryMuscle,
          JSON.stringify(ex.secondaryMuscles || []),
          ex.equipment || 'MACHINE',
          ex.category || 'OTHER',
          ex.trackingType || 'WEIGHT_REPS',
          ex.notes || null,
          ex.archived ? 1 : 0,
          now,
          now,
        ]
      );
    }

    // 3. import workout templates
    for (const tmpl of backup.workoutTemplates) {
      await db.runAsync(
        `INSERT INTO workout_templates (id, name, description, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET
           name = excluded.name,
           description = excluded.description,
           updated_at = excluded.updated_at;`,
        [tmpl.id, tmpl.name, tmpl.description || null, now, now]
      );

      // clear existing template exercises
      await db.runAsync('DELETE FROM workout_template_exercises WHERE template_id = ?;', [
        tmpl.id,
      ]);

      for (let i = 0; i < tmpl.exercises.length; i++) {
        const te = tmpl.exercises[i];
        const repsVal = te.targetReps ?? te.repMax ?? te.repMin ?? te.reps ?? 10;
        await db.runAsync(
          `INSERT INTO workout_template_exercises (id, template_id, exercise_id, exercise_order, target_sets, target_reps, rep_min, rep_max, target_rir, rest_between_sets_seconds, rest_after_exercise_seconds, include_in_volume, notes)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
          [
            uuidv4(),
            tmpl.id,
            te.exerciseId,
            te.order || i + 1,
            te.targetSets,
            repsVal,
            repsVal,
            repsVal,
            te.targetRir ?? 2,
            te.restBetweenSetsSeconds ?? 120,
            te.restAfterExerciseSeconds ?? 120,
            1,
            te.notes || null,
          ]
        );
      }
    }

    // 4. import workout sessions
    for (const sess of backup.workoutSessions) {
      // check if session id already exists (skip duplicates as per spec)
      const existingSess = await db.getFirstAsync<{ id: string }>(
        'SELECT id FROM workout_sessions WHERE id = ?;',
        [sess.id]
      );
      if (existingSess) {
        continue;
      }

      await db.runAsync(
        `INSERT INTO workout_sessions (id, template_id, name, started_at, finished_at, notes, is_active)
         VALUES (?, ?, ?, ?, ?, ?, 0);`,
        [
          sess.id,
          sess.templateId || null,
          sess.name,
          sess.startedAt,
          sess.finishedAt || now,
          sess.notes || null,
        ]
      );

      for (let i = 0; i < sess.exercises.length; i++) {
        const se = sess.exercises[i];
        const seId = `se_${uuidv4()}`;

        await db.runAsync(
          `INSERT INTO workout_session_exercises (id, session_id, exercise_id, exercise_order, notes)
           VALUES (?, ?, ?, ?, ?);`,
          [seId, sess.id, se.exerciseId, se.order || i + 1, se.notes || null]
        );

        for (let s = 0; s < se.sets.length; s++) {
          const st = se.sets[s];
          await db.runAsync(
            `INSERT INTO sets (id, session_exercise_id, set_number, type, weight_kg, reps, rir, completed)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?);`,
            [
              st.id || `set_${uuidv4()}`,
              seId,
              st.setNumber || s + 1,
              st.type || 'WORKING',
              st.weightKg || 0,
              st.reps || 0,
              st.rir ?? null,
              st.completed ? 1 : 0,
            ]
          );
        }
      }
    }
  });

  // recalculate PRs after import
  await recalculateAllPersonalRecords(db);
}

/**
 * exports workout history to csv format
 */
export async function exportHistoryToCsv(db: SQLite.SQLiteDatabase): Promise<string> {
  const sessions = await getAllCompletedSessions(db);
  const rows: string[] = [
    'sessionId,date,workoutName,exerciseId,exerciseName,setNumber,setType,weightKg,reps,rir',
  ];

  for (const s of sessions) {
    const dateStr = s.startedAt ? s.startedAt.split('T')[0] : '';
    for (const se of s.exercises) {
      for (const st of se.sets) {
        if (st.completed) {
          rows.push(
            `"${s.id}","${dateStr}","${s.name.replace(/"/g, '""')}","${se.exerciseId}","${(se.exerciseName || '').replace(/"/g, '""')}",${st.setNumber},"${st.type}",${st.weightKg},${st.reps},${st.rir ?? ''}`
          );
        }
      }
    }
  }

  const csvContent = rows.join('\n');
  const dateStr = new Date().toISOString().split('T')[0];
  const filename = `WorkoutTracker_History_${dateStr}.csv`;
  const file = writeTextFile(filename, csvContent);

  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(file.uri, {
      mimeType: 'text/csv',
      dialogTitle: 'Export CSV History',
    });
  }

  return file.uri;
}

function formatHevyDateTime(isoStr?: string): string {
  if (!isoStr) return '';
  const d = new Date(isoStr);
  if (isNaN(d.getTime())) return '';
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const day = d.getDate();
  const month = months[d.getMonth()];
  const year = d.getFullYear();
  const hours = d.getHours().toString().padStart(2, '0');
  const minutes = d.getMinutes().toString().padStart(2, '0');
  return `"${day} ${month} ${year}, ${hours}:${minutes}"`;
}

/**
 * exports workout history in exact Hevy CSV format
 */
export async function exportHistoryToHevyCsv(db: SQLite.SQLiteDatabase): Promise<string> {
  const sessions = await getAllCompletedSessions(db);
  const rows: string[] = [
    '"title","start_time","end_time","description","exercise_title","superset_id","exercise_notes","set_index","set_type","weight_kg","reps","distance_km","duration_seconds","rpe"',
  ];

  for (const s of sessions) {
    const startTimeFormatted = formatHevyDateTime(s.startedAt);
    const endTimeFormatted = formatHevyDateTime(s.finishedAt || s.startedAt);
    const sessionTitle = `"${(s.name || 'Workout').replace(/"/g, '""')}"`;
    const sessionNotes = `"${(s.notes || '').replace(/"/g, '""')}"`;

    for (const se of s.exercises) {
      const exerciseTitle = `"${(se.exerciseName || 'Exercise').replace(/"/g, '""')}"`;
      const exerciseNotes = `"${(se.notes || '').replace(/"/g, '""')}"`;

      let setIdx = 0;
      for (const st of se.sets) {
        if (st.completed) {
          let hevySetType = 'normal';
          if (st.type === 'WARMUP') hevySetType = 'warmup';
          if (st.type === 'DROP_SET') hevySetType = 'drop_set';
          if (st.type === 'FAILURE') hevySetType = 'failure';

          const rpeVal = st.rir !== null && st.rir !== undefined ? (10 - st.rir).toString() : '';

          rows.push(
            `${sessionTitle},${startTimeFormatted},${endTimeFormatted},${sessionNotes},${exerciseTitle},"","${exerciseNotes}",${setIdx},"${hevySetType}",${st.weightKg || 0},${st.reps || 0},"","","${rpeVal}"`
          );
          setIdx++;
        }
      }
    }
  }

  const csvContent = rows.join('\n');
  const dateStr = new Date().toISOString().split('T')[0];
  const filename = `Hevy_Workout_Export_${dateStr}.csv`;
  const file = writeTextFile(filename, csvContent);

  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(file.uri, {
      mimeType: 'text/csv',
      dialogTitle: 'Export History to Hevy CSV',
    });
  }

  return file.uri;
}

/**
 * imports one or more templates from a selected json file directly into database
 */
export async function importTemplatesFromJsonFile(
  db: SQLite.SQLiteDatabase
): Promise<{ count: number; templateNames: string[] } | null> {
  const result = await DocumentPicker.getDocumentAsync({
    type: 'application/json',
    copyToCacheDirectory: true,
  });

  if (result.canceled || !result.assets || result.assets.length === 0) {
    return null;
  }

  const fileUri = result.assets[0].uri;
  const content = await new File(fileUri).text();

  let parsed: any;
  try {
    parsed = JSON.parse(content);
  } catch {
    throw new Error('Selected file is not valid JSON.');
  }

  const now = new Date().toISOString();
  const importedNames: string[] = [];

  // extract template list: could be a full backup, an array of templates, or a single template object
  let templatesToProcess: any[] = [];

  if (Array.isArray(parsed)) {
    templatesToProcess = parsed;
  } else if (parsed.workoutTemplates && Array.isArray(parsed.workoutTemplates)) {
    // full backup format
    if (parsed.exercises && Array.isArray(parsed.exercises)) {
      // import exercises first so foreign keys and names resolve
      for (const ex of parsed.exercises) {
        await db.runAsync(
          `INSERT INTO exercises (id, name, primary_muscle, secondary_muscles_json, equipment, category, tracking_type, notes, archived, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
           ON CONFLICT(id) DO UPDATE SET
             name = excluded.name,
             primary_muscle = excluded.primary_muscle,
             secondary_muscles_json = excluded.secondary_muscles_json,
             equipment = excluded.equipment,
             category = excluded.category,
             tracking_type = excluded.tracking_type,
             notes = excluded.notes,
             archived = excluded.archived,
             updated_at = excluded.updated_at;`,
          [
            ex.id,
            ex.name,
            ex.primaryMuscle || 'OTHER',
            JSON.stringify(ex.secondaryMuscles || []),
            ex.equipment || 'MACHINE',
            ex.category || 'OTHER',
            ex.trackingType || 'WEIGHT_REPS',
            ex.notes || null,
            ex.archived ? 1 : 0,
            now,
            now,
          ]
        );
      }
    }
    templatesToProcess = parsed.workoutTemplates;
  } else if (parsed.name && (parsed.exercises || parsed.templateExercises)) {
    // single template format
    templatesToProcess = [parsed];
  } else {
    throw new Error('JSON file does not contain a recognizable template structure.');
  }

  await db.withTransactionAsync(async () => {
    for (const tmpl of templatesToProcess) {
      if (!tmpl.name) continue;
      const templateId = tmpl.id || `template_${uuidv4()}`;
      const templateName = tmpl.name;
      importedNames.push(templateName);

      await db.runAsync(
        `INSERT INTO workout_templates (id, name, description, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET
           name = excluded.name,
           description = excluded.description,
           updated_at = excluded.updated_at;`,
        [templateId, templateName, tmpl.description || null, tmpl.createdAt || now, now]
      );

      await db.runAsync('DELETE FROM workout_template_exercises WHERE template_id = ?;', [
        templateId,
      ]);

      const exercises = tmpl.exercises || tmpl.templateExercises || [];
      for (let i = 0; i < exercises.length; i++) {
        const ex = exercises[i];
        let exerciseId = ex.exerciseId;

        // if exerciseId is missing or exercise doesn't exist, check or create it by name
        if (!exerciseId && ex.exerciseName) {
          const existingEx = await db.getFirstAsync<{ id: string }>(
            'SELECT id FROM exercises WHERE name = ? COLLATE NOCASE;',
            [ex.exerciseName]
          );
          if (existingEx) {
            exerciseId = existingEx.id;
          } else {
            exerciseId = `exercise_${uuidv4()}`;
            await db.runAsync(
              `INSERT INTO exercises (id, name, primary_muscle, equipment, category, tracking_type, created_at, updated_at)
               VALUES (?, ?, 'OTHER', 'MACHINE', 'OTHER', 'WEIGHT_REPS', ?, ?);`,
              [exerciseId, ex.exerciseName, now, now]
            );
          }
        }

        if (!exerciseId) continue;

        const setsVal = ex.targetSets || 3;
        const repsVal = ex.targetReps ?? ex.repMax ?? ex.repMin ?? ex.reps ?? 10;
        const rirVal = ex.targetRir ?? 2;
        const restSet = ex.restBetweenSetsSeconds ?? 120;
        const restEx = ex.restAfterExerciseSeconds ?? 120;

        await db.runAsync(
          `INSERT INTO workout_template_exercises (id, template_id, exercise_id, exercise_order, target_sets, target_reps, rep_min, rep_max, target_rir, rest_between_sets_seconds, rest_after_exercise_seconds, include_in_volume, notes)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
          [
            uuidv4(),
            templateId,
            exerciseId,
            ex.order || i + 1,
            setsVal,
            repsVal,
            repsVal,
            repsVal,
            rirVal,
            restSet,
            restEx,
            1,
            ex.notes || null,
          ]
        );
      }
    }
  });

  return {
    count: importedNames.length,
    templateNames: importedNames,
  };
}
