// service for parsing and importing workout history from hevy csv export files

import * as SQLite from 'expo-sqlite';
import { File, Paths } from 'expo-file-system';
import * as DocumentPicker from 'expo-document-picker';
import { MuscleGroup, MovementCategory, EquipmentType, SetType } from '../types/workout';
import { recalculateAllPersonalRecords } from '../database/queries/prQueries';
import { generateId } from '../utils/uuid';
import { DEFAULT_HEVY_CSV } from '../assets/workoutDataCsv';

export interface HevyImportResult {
  importedSessionsCount: number;
  importedSetsCount: number;
  importedExercisesCount: number;
}

interface HevyCsvRow {
  title: string;
  startTimeRaw: string;
  endTimeRaw: string;
  description: string;
  exerciseTitle: string;
  supersetId: string;
  exerciseNotes: string;
  setIndex: number;
  setType: string;
  weightKg: number;
  reps: number;
  distanceKm: number;
  durationSeconds: number;
  rpe: string;
}

/**
 * normalizes exercise name for fuzzy matching (strips parenthetical suffixes, equipment words, and punctuation)
 */
export function normalizeExerciseName(name: string): string {
  return (name || '')
    .toLowerCase()
    .replace(/\([^)]*\)/g, '')
    .replace(/\b(cable|machine|barbell|dumbbell|smith machine|bodyweight)\b/g, '')
    .replace(/[-–—]/g, ' ')
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * parses raw CSV string handling quoted strings with commas and escaped quotes
 */
export function parseCsvString(csvContent: string): string[][] {
  const lines: string[][] = [];
  let currentRow: string[] = [];
  let currentField = '';
  let inQuotes = false;

  for (let i = 0; i < csvContent.length; i++) {
    const char = csvContent[i];
    const nextChar = csvContent[i + 1];

    if (inQuotes) {
      if (char === '"' && nextChar === '"') {
        currentField += '"';
        i++; // skip escaped quote
      } else if (char === '"') {
        inQuotes = false;
      } else {
        currentField += char;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
      } else if (char === ',') {
        currentRow.push(currentField.trim());
        currentField = '';
      } else if (char === '\n' || (char === '\r' && nextChar === '\n')) {
        currentRow.push(currentField.trim());
        if (currentRow.length > 1 || currentRow[0] !== '') {
          lines.push(currentRow);
        }
        currentRow = [];
        currentField = '';
        if (char === '\r') i++; // skip \n
      } else if (char !== '\r') {
        currentField += char;
      }
    }
  }

  if (currentField.length > 0 || currentRow.length > 0) {
    currentRow.push(currentField.trim());
    if (currentRow.length > 1 || currentRow[0] !== '') {
      lines.push(currentRow);
    }
  }

  return lines;
}

/**
 * converts Hevy date format ("12 Jul 2026, 10:10") to ISO-8601 string
 */
export function parseHevyDate(dateStr: string): string {
  if (!dateStr) return new Date().toISOString();

  const str = dateStr.trim();

  const monthNames: Record<string, number> = {
    jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
    jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11,
  };

  // match "12 Jul 2026, 10:10" or "12 Jul 2026 10:10:00"
  const dayMonthYearRegex = /^(\d{1,2})\s+([A-Za-z]{3})\s+(\d{4})(?:,\s*|\s+)(\d{1,2}):(\d{2})(?::(\d{2}))?/;
  const matchDmy = str.match(dayMonthYearRegex);
  if (matchDmy) {
    const day = parseInt(matchDmy[1], 10);
    const monthStr = matchDmy[2].toLowerCase();
    const year = parseInt(matchDmy[3], 10);
    const hours = parseInt(matchDmy[4], 10);
    const minutes = parseInt(matchDmy[5], 10);
    const seconds = matchDmy[6] ? parseInt(matchDmy[6], 10) : 0;
    const month = monthNames[monthStr] !== undefined ? monthNames[monthStr] : 0;

    const d = new Date(Date.UTC(year, month, day, hours, minutes, seconds));
    return d.toISOString();
  }

  // match "2026-07-12 10:10:00" or "2026-07-12T10:10:00"
  const isoRegex = /^(\d{4})[-/](\d{1,2})[-/](\d{1,2})(?:[T\s](\d{1,2}):(\d{2})(?::(\d{2}))?)?/;
  const matchIso = str.match(isoRegex);
  if (matchIso) {
    const year = parseInt(matchIso[1], 10);
    const month = parseInt(matchIso[2], 10) - 1;
    const day = parseInt(matchIso[3], 10);
    const hours = matchIso[4] ? parseInt(matchIso[4], 10) : 0;
    const minutes = matchIso[5] ? parseInt(matchIso[5], 10) : 0;
    const seconds = matchIso[6] ? parseInt(matchIso[6], 10) : 0;

    const d = new Date(Date.UTC(year, month, day, hours, minutes, seconds));
    return d.toISOString();
  }

  // fallback to Date.parse
  const cleaned = str.replace(/,/g, '').trim();
  const parsedMs = Date.parse(cleaned);
  if (!isNaN(parsedMs)) {
    return new Date(parsedMs).toISOString();
  }

  return new Date().toISOString();
}

/**
 * infers muscle group from exercise title
 */
function inferMuscleGroup(title: string): MuscleGroup {
  const lower = title.toLowerCase();
  if (lower.includes('chest') || lower.includes('bench') || lower.includes('fly') || lower.includes('push up') || lower.includes('dip')) {
    return 'CHEST';
  }
  if (lower.includes('lat') || lower.includes('pull') || lower.includes('row') || lower.includes('chin') || lower.includes('back')) {
    return 'BACK';
  }
  if (lower.includes('squat') || lower.includes('quad') || lower.includes('lunge') || lower.includes('press')) {
    return 'QUADS';
  }
  if (lower.includes('deadlift') || lower.includes('hamstring') || lower.includes('leg curl')) {
    return 'HAMSTRINGS';
  }
  if (lower.includes('glute') || lower.includes('hip thrust')) {
    return 'GLUTES';
  }
  if (lower.includes('calf') || lower.includes('calves')) {
    return 'CALVES';
  }
  if (lower.includes('shoulder') || lower.includes('delt') || lower.includes('raise')) {
    return 'SIDE_DELTS';
  }
  if (lower.includes('bicep') || lower.includes('curl')) {
    return 'BICEPS';
  }
  if (lower.includes('tricep') || lower.includes('extension') || lower.includes('skullcrusher') || lower.includes('pushdown')) {
    return 'TRICEPS';
  }
  if (lower.includes('abs') || lower.includes('crunch') || lower.includes('plank') || lower.includes('core')) {
    return 'CORE';
  }
  return 'OTHER';
}

/**
 * infers equipment type from exercise title
 */
function inferEquipment(title: string): EquipmentType {
  const lower = title.toLowerCase();
  if (lower.includes('cable')) return 'CABLE';
  if (lower.includes('machine')) return 'MACHINE';
  if (lower.includes('barbell') || lower.includes('smith')) return 'BARBELL';
  if (lower.includes('dumbbell') || lower.includes('db')) return 'DUMBBELL';
  if (lower.includes('kettlebell')) return 'KETTLEBELL';
  if (lower.includes('bodyweight') || lower.includes('push up') || lower.includes('pull up') || lower.includes('dip')) return 'BODYWEIGHT';
  return 'OTHER';
}

/**
 * infers movement category from exercise title and muscle
 */
function inferCategory(title: string, muscle: MuscleGroup): MovementCategory {
  const lower = title.toLowerCase();
  if (lower.includes('push up') || lower.includes('bench') || lower.includes('chest press')) return 'HORIZONTAL_PUSH';
  if (lower.includes('overhead') || lower.includes('shoulder press') || lower.includes('dip')) return 'VERTICAL_PUSH';
  if (lower.includes('row')) return 'HORIZONTAL_PULL';
  if (lower.includes('pulldown') || lower.includes('pull up') || lower.includes('chin up')) return 'VERTICAL_PULL';
  if (lower.includes('curl')) return 'ELBOW_FLEXION';
  if (lower.includes('extension') || lower.includes('skullcrusher') || lower.includes('pushdown')) return 'ELBOW_EXTENSION';
  if (lower.includes('squat') || lower.includes('leg press')) return 'KNEE_EXTENSION';
  if (lower.includes('deadlift') || lower.includes('hip thrust') || lower.includes('leg curl')) return 'HIP_DOMINANT';
  if (lower.includes('raise')) return 'SHOULDER_ISOLATION';
  if (lower.includes('abs') || lower.includes('crunch') || lower.includes('plank')) return 'CORE';
  return 'OTHER';
}

/**
 * maps hevy set type to app set type
 */
function mapSetType(hevySetType: string): SetType {
  const lower = (hevySetType || '').toLowerCase();
  if (lower === 'warmup') return 'WARMUP';
  if (lower === 'failure') return 'FAILURE';
  if (lower === 'drop_set' || lower === 'dropset') return 'DROP_SET';
  return 'WORKING';
}

/**
 * parses and imports Hevy CSV string into database inside transaction
 */
export async function importHevyCsvContent(
  db: SQLite.SQLiteDatabase,
  csvText: string
): Promise<HevyImportResult> {
  const rows = parseCsvString(csvText);
  if (rows.length < 2) {
    throw new Error('CSV file contains no data rows.');
  }

  // locate column header indices
  const header = rows[0].map((h) => h.toLowerCase().replace(/['"]/g, ''));
  const colIndex = {
    title: header.indexOf('title'),
    startTime: header.indexOf('start_time'),
    endTime: header.indexOf('end_time'),
    description: header.indexOf('description'),
    exerciseTitle: header.indexOf('exercise_title'),
    supersetId: header.indexOf('superset_id'),
    exerciseNotes: header.indexOf('exercise_notes'),
    setIndex: header.indexOf('set_index'),
    setType: header.indexOf('set_type'),
    weightKg: header.indexOf('weight_kg'),
    reps: header.indexOf('reps'),
  };

  if (colIndex.startTime === -1 || colIndex.exerciseTitle === -1) {
    throw new Error('Invalid Hevy CSV format: missing required columns (start_time, exercise_title).');
  }

  const parsedDataRows: HevyCsvRow[] = [];

  for (let i = 1; i < rows.length; i++) {
    const r = rows[i];
    if (r.length <= colIndex.exerciseTitle) continue;

    const title = colIndex.title !== -1 ? r[colIndex.title] || 'Workout' : 'Workout';
    const startTimeRaw = r[colIndex.startTime] || '';
    const endTimeRaw = colIndex.endTime !== -1 ? r[colIndex.endTime] || '' : '';
    const description = colIndex.description !== -1 ? r[colIndex.description] || '' : '';
    const exerciseTitle = r[colIndex.exerciseTitle] || 'Exercise';
    const supersetId = colIndex.supersetId !== -1 ? r[colIndex.supersetId] || '' : '';
    const exerciseNotes = colIndex.exerciseNotes !== -1 ? r[colIndex.exerciseNotes] || '' : '';
    const setIndex = colIndex.setIndex !== -1 ? parseInt(r[colIndex.setIndex] || '0', 10) : 0;
    const setType = colIndex.setType !== -1 ? r[colIndex.setType] || 'normal' : 'normal';
    const weightKg = colIndex.weightKg !== -1 ? parseFloat(r[colIndex.weightKg] || '0') || 0 : 0;
    const reps = colIndex.reps !== -1 ? parseInt(r[colIndex.reps] || '0', 10) || 0 : 0;

    if (!startTimeRaw || !exerciseTitle) continue;

    parsedDataRows.push({
      title,
      startTimeRaw,
      endTimeRaw,
      description,
      exerciseTitle,
      supersetId,
      exerciseNotes,
      setIndex,
      setType,
      weightKg,
      reps,
      distanceKm: 0,
      durationSeconds: 0,
      rpe: '',
    });
  }

  // fetch existing exercises
  const existingExercises = await db.getAllAsync<{ id: string; name: string }>(
    'SELECT id, name FROM exercises;'
  );
  const exerciseMap = new Map<string, string>(); // normalized name -> id
  existingExercises.forEach((e) => {
    exerciseMap.set(normalizeExerciseName(e.name), e.id);
  });

  let importedExercisesCount = 0;
  let importedSessionsCount = 0;
  let importedSetsCount = 0;

  // group rows by session (startTimeRaw + "___" + title)
  const sessionMap = new Map<string, HevyCsvRow[]>();
  for (const row of parsedDataRows) {
    const key = `${row.startTimeRaw}___${row.title}___${row.endTimeRaw || ''}`;
    if (!sessionMap.has(key)) {
      sessionMap.set(key, []);
    }
    sessionMap.get(key)!.push(row);
  }

  const nowIso = new Date().toISOString();

  await db.withTransactionAsync(async () => {
    // 1. ensure all exercises exist in database
    for (const row of parsedDataRows) {
      const normName = normalizeExerciseName(row.exerciseTitle);
      if (!exerciseMap.has(normName)) {
        const exId = `ex_${generateId()}`;
        const primaryMuscle = inferMuscleGroup(row.exerciseTitle);
        const equipment = inferEquipment(row.exerciseTitle);
        const category = inferCategory(row.exerciseTitle, primaryMuscle);
        await db.runAsync(
          `INSERT INTO exercises (id, name, primary_muscle, equipment, category, tracking_type, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, 'WEIGHT_REPS', ?, ?);`,
          [exId, row.exerciseTitle, primaryMuscle, equipment, category, nowIso, nowIso]
        );
        exerciseMap.set(normName, exId);
        importedExercisesCount++;
      }
    }

    // 2. insert workout sessions and sets
    for (const sessionRows of sessionMap.values()) {
      if (sessionRows.length === 0) continue;

      const firstRow = sessionRows[0];
      const startedAtIso = parseHevyDate(firstRow.startTimeRaw);
      const finishedAtIso = firstRow.endTimeRaw
        ? parseHevyDate(firstRow.endTimeRaw)
        : startedAtIso;
      const sessionId = `session_${generateId()}`;

      await db.runAsync(
        `INSERT INTO workout_sessions (id, template_id, name, started_at, finished_at, notes, is_active)
         VALUES (?, NULL, ?, ?, ?, ?, 0);`,
        [sessionId, firstRow.title || 'Workout', startedAtIso, finishedAtIso, firstRow.description || null]
      );
      importedSessionsCount++;

      // create one session exercise per distinct exercise, in first-appearance order
      const seByTitle = new Map<string, string>();
      let exerciseOrder = 1;
      for (const r of sessionRows) {
        if (seByTitle.has(r.exerciseTitle)) continue;
        const normTitle = normalizeExerciseName(r.exerciseTitle);
        const exerciseId = exerciseMap.get(normTitle);
        if (!exerciseId) continue;

        const seId = `se_${generateId()}`;
        await db.runAsync(
          `INSERT INTO workout_session_exercises (id, session_id, exercise_id, exercise_order, notes)
           VALUES (?, ?, ?, ?, ?);`,
          [seId, sessionId, exerciseId, exerciseOrder++, r.exerciseNotes || null]
        );
        seByTitle.set(r.exerciseTitle, seId);
      }

      // insert sets in original row order to preserve superset execution order
      const setNumberBySe = new Map<string, number>();
      for (const setRow of sessionRows) {
        const seId = seByTitle.get(setRow.exerciseTitle);
        if (!seId) continue;

        const setNumber = (setNumberBySe.get(seId) || 0) + 1;
        setNumberBySe.set(seId, setNumber);

        const setId = `set_${generateId()}`;
        const stType = mapSetType(setRow.setType);

        await db.runAsync(
          `INSERT INTO sets (id, session_exercise_id, set_number, type, weight_kg, reps, rir, completed, completed_at)
           VALUES (?, ?, ?, ?, ?, ?, 2, 1, ?);`,
          [setId, seId, setNumber, stType, setRow.weightKg, setRow.reps, finishedAtIso]
        );
        importedSetsCount++;
      }
    }

    // 3. recalculate PRs across all sessions
    await recalculateAllPersonalRecords(db);
  });

  return {
    importedSessionsCount,
    importedSetsCount,
    importedExercisesCount,
  };
}

/**
 * auto-imports bundled workout_data.csv asset if no workout sessions exist and initial seed has not run
 */
export function autoImportBundledHevyCsv(
  db: SQLite.SQLiteDatabase
): Promise<HevyImportResult | null> {
  return (async () => {
    const seedCheck = await db.getFirstAsync<{ value: string }>(
      "SELECT value FROM settings WHERE key = 'has_completed_initial_seed';"
    );
    if (seedCheck && seedCheck.value === 'true') {
      return null;
    }

    const sessionCheck = await db.getFirstAsync<{ count: number }>(
      'SELECT COUNT(*) as count FROM workout_sessions;'
    );
    if (sessionCheck && sessionCheck.count > 0) {
      await db.runAsync(
        `INSERT INTO settings (key, value) VALUES ('has_completed_initial_seed', 'true')
         ON CONFLICT(key) DO UPDATE SET value = 'true';`
      );
      return null;
    }

    try {
      const res = await importHevyCsvContent(db, DEFAULT_HEVY_CSV);
      await db.runAsync(
        `INSERT INTO settings (key, value) VALUES ('has_completed_initial_seed', 'true')
         ON CONFLICT(key) DO UPDATE SET value = 'true';`
      );
      return res;
    } catch (err) {
      console.error('auto-import bundled hevy csv error:', err);
      return null;
    }
  })();
}

/**
 * opens document picker for Hevy CSV file and imports data
 */
export async function importHevyCsvFile(
  db: SQLite.SQLiteDatabase
): Promise<HevyImportResult | null> {
  let fileUri = '';
  try {
    const result = await DocumentPicker.getDocumentAsync({
      type: ['text/csv', 'text/comma-separated-values', 'application/csv', '*/*'],
      copyToCacheDirectory: true,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      fileUri = result.assets[0].uri;
    }
  } catch (pickerErr) {
    console.error('document picker error or headless fallback:', pickerErr);
  }

  if (!fileUri) {
    const candidates = [
      new File(Paths.cache, 'hevy_import.csv'),
      new File(Paths.cache, 'workout_data.csv'),
      new File(Paths.document, 'workout_data.csv'),
    ];
    for (const cand of candidates) {
      try {
        if (cand.exists) {
          fileUri = cand.uri;
          break;
        }
      } catch {
        // try next candidate
      }
    }
  }

  if (!fileUri) {
    return autoImportBundledHevyCsv(db);
  }

  const csvText = await new File(fileUri).text();
  return importHevyCsvContent(db, csvText);
}
