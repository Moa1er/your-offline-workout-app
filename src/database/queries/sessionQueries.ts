// database queries for active and historical workout sessions and sets

import * as SQLite from 'expo-sqlite';
import { WorkoutSession, SessionExercise, WorkoutSet, MuscleGroup, SetType } from '../../types/workout';
import { generateId as uuidv4 } from '../../utils/uuid';
import { getTemplateById } from './templateQueries';
import { recalculateAllPersonalRecords } from './prQueries';

export async function getActiveWorkoutSession(
  db: SQLite.SQLiteDatabase
): Promise<WorkoutSession | null> {
  const activeSession = await db.getFirstAsync<any>(
    'SELECT * FROM workout_sessions WHERE is_active = 1 ORDER BY started_at DESC LIMIT 1;'
  );

  if (!activeSession) return null;
  return getSessionById(db, activeSession.id);
}

export async function getPreviousPerformanceForExercise(
  db: SQLite.SQLiteDatabase,
  exerciseId: string,
  excludeSessionId?: string
): Promise<WorkoutSet[]> {
  const query = excludeSessionId
    ? `SELECT wse.id FROM workout_session_exercises wse
       JOIN workout_sessions ws ON wse.session_id = ws.id
       WHERE wse.exercise_id = ? AND ws.is_active = 0 AND ws.id != ?
       AND EXISTS (
         SELECT 1 FROM sets st
         WHERE st.session_exercise_id = wse.id AND st.completed = 1 AND st.type != 'WARMUP'
       )
       ORDER BY ws.finished_at DESC LIMIT 1;`
    : `SELECT wse.id FROM workout_session_exercises wse
       JOIN workout_sessions ws ON wse.session_id = ws.id
       WHERE wse.exercise_id = ? AND ws.is_active = 0
       AND EXISTS (
         SELECT 1 FROM sets st
         WHERE st.session_exercise_id = wse.id AND st.completed = 1 AND st.type != 'WARMUP'
       )
       ORDER BY ws.finished_at DESC LIMIT 1;`;

  const params = excludeSessionId ? [exerciseId, excludeSessionId] : [exerciseId];
  const lastSe = await db.getFirstAsync<{ id: string }>(query, params);

  if (!lastSe) return [];

  const sets = await db.getAllAsync<any>(
    `SELECT * FROM sets
     WHERE session_exercise_id = ? AND completed = 1 AND type != 'WARMUP'
     ORDER BY set_number ASC;`,
    [lastSe.id]
  );

  return sets.map((s) => ({
    id: s.id,
    sessionExerciseId: s.session_exercise_id,
    setNumber: s.set_number,
    type: s.type as SetType,
    weightKg: s.weight_kg,
    reps: s.reps,
    rir: s.rir,
    completed: Boolean(s.completed),
    completedAt: s.completed_at,
  }));
}

export async function createActiveWorkoutFromTemplate(
  db: SQLite.SQLiteDatabase,
  templateId?: string
): Promise<WorkoutSession> {
  // never silently abandon an existing active session
  const existingActive = await db.getFirstAsync<{ id: string }>(
    'SELECT id FROM workout_sessions WHERE is_active = 1 LIMIT 1;'
  );
  if (existingActive) {
    throw new Error('An active workout is already in progress. Discard it before starting a new one.');
  }

  const sessionId = `session_${uuidv4()}`;
  const now = new Date().toISOString();
  let sessionName = 'Custom Workout';
  let validTemplateId: string | null = null;
  let exercisesData: {
    exerciseId: string;
    exerciseName: string;
    primaryMuscle: MuscleGroup;
    order: number;
    targetSets: number;
    targetReps?: number;
    repMin: number;
    repMax: number;
    includeInVolume?: boolean;
    notes?: string | null;
    restBetweenSetsSeconds?: number;
    restAfterExerciseSeconds?: number;
  }[] = [];

  if (templateId) {
    // verify template exists in DB before using as FK
    const tmplCheck = await db.getFirstAsync<{ id: string }>(
      'SELECT id FROM workout_templates WHERE id = ?;',
      [templateId]
    );
    if (tmplCheck) {
      validTemplateId = templateId;
      const template = await getTemplateById(db, templateId);
      if (template) {
        sessionName = template.name;
        exercisesData = template.exercises.map((te) => ({
          exerciseId: te.exerciseId,
          exerciseName: te.exerciseName || 'Exercise',
          primaryMuscle: 'CHEST' as MuscleGroup, // will resolve below
          order: te.order,
          targetSets: te.targetSets,
          targetReps: te.targetReps ?? te.repMax ?? te.repMin ?? 10,
          repMin: te.repMin ?? te.targetReps ?? 10,
          repMax: te.repMax ?? te.targetReps ?? 10,
          includeInVolume: te.includeInVolume !== false,
          notes: te.notes,
          restBetweenSetsSeconds: te.restBetweenSetsSeconds ?? 120,
          restAfterExerciseSeconds: te.restAfterExerciseSeconds ?? 120,
        }));
      }
    }
  }

  // insert workout session record
  await db.runAsync(
    `INSERT INTO workout_sessions (id, template_id, name, started_at, is_active)
     VALUES (?, ?, ?, ?, 1);`,
    [sessionId, validTemplateId, sessionName, now]
  );

  const sessionExercises: SessionExercise[] = [];

  for (let i = 0; i < exercisesData.length; i++) {
    const ed = exercisesData[i];
    const seId = `se_${uuidv4()}`;

    // fetch exercise details
    let exDetail = await db.getFirstAsync<any>(
      'SELECT name, primary_muscle FROM exercises WHERE id = ?;',
      [ed.exerciseId]
    );

    if (!exDetail) {
      // insert missing exercise to ensure FK integrity
      await db.runAsync(
        `INSERT OR IGNORE INTO exercises (id, name, primary_muscle, secondary_muscles_json, equipment, category, tracking_type, notes, archived, created_at, updated_at)
         VALUES (?, ?, 'CHEST', NULL, 'OTHER', 'OTHER', 'WEIGHT_REPS', NULL, 0, ?, ?);`,
        [ed.exerciseId, ed.exerciseName || 'Exercise', now, now]
      );
      exDetail = { name: ed.exerciseName || 'Exercise', primary_muscle: 'CHEST' };
    }

    const exerciseName = exDetail?.name || ed.exerciseName;
    const primaryMuscle = (exDetail?.primary_muscle as MuscleGroup) || 'CHEST';

    // inherit rest times defined in the template
    await db.runAsync(
      `INSERT INTO workout_session_exercises (id, session_id, exercise_id, exercise_order, include_in_volume, notes, rest_between_sets_seconds, rest_after_exercise_seconds)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?);`,
      [
        seId,
        sessionId,
        ed.exerciseId,
        i + 1,
        ed.includeInVolume !== false ? 1 : 0,
        ed.notes || null,
        ed.restBetweenSetsSeconds ?? 120,
        ed.restAfterExerciseSeconds ?? 120,
      ]
    );

    // fetch previous performance for pre-filling!
    const previousSets = await getPreviousPerformanceForExercise(db, ed.exerciseId);

    const sets: WorkoutSet[] = [];
    const setTargetCount = Math.max(1, ed.targetSets || 3);

    for (let s = 1; s <= setTargetCount; s++) {
      const prevSet = previousSets[s - 1] || previousSets[previousSets.length - 1];
      const initialWeight = prevSet ? prevSet.weightKg : 0;
      const initialReps = prevSet ? prevSet.reps : 10;
      const setId = `set_${uuidv4()}`;

      await db.runAsync(
        `INSERT INTO sets (id, session_exercise_id, set_number, type, weight_kg, reps, rir, completed)
         VALUES (?, ?, ?, 'WORKING', ?, ?, 2, 0);`,
        [setId, seId, s, initialWeight, initialReps]
      );

      sets.push({
        id: setId,
        sessionExerciseId: seId,
        setNumber: s,
        type: 'WORKING',
        weightKg: initialWeight,
        reps: initialReps,
        rir: 2,
        completed: false,
      });
    }

    sessionExercises.push({
      id: seId,
      sessionId,
      exerciseId: ed.exerciseId,
      exerciseName,
      primaryMuscle,
      order: i + 1,
      notes: ed.notes,
      restBetweenSetsSeconds: ed.restBetweenSetsSeconds ?? 120,
      restAfterExerciseSeconds: ed.restAfterExerciseSeconds ?? 120,
      includeInVolume: ed.includeInVolume !== false,
      sets,
      previousPerformance: previousSets,
    });
  }

  return {
    id: sessionId,
    templateId: validTemplateId,
    name: sessionName,
    startedAt: now,
    isActive: true,
    exercises: sessionExercises,
  };
}

export async function saveSetUpdate(
  db: SQLite.SQLiteDatabase,
  set: WorkoutSet
): Promise<void> {
  const completedAt = set.completed ? new Date().toISOString() : null;
  await db.runAsync(
    `UPDATE sets
     SET type = ?, weight_kg = ?, reps = ?, rir = ?, completed = ?, completed_at = ?
     WHERE id = ?;`,
    [
      set.type,
      set.weightKg,
      set.reps,
      set.rir ?? null,
      set.completed ? 1 : 0,
      completedAt,
      set.id,
    ]
  );
}

export async function addSetToSessionExercise(
  db: SQLite.SQLiteDatabase,
  sessionExerciseId: string,
  setNumber: number,
  defaultWeight: number = 0,
  defaultReps: number = 10,
  type: SetType = 'WORKING'
): Promise<WorkoutSet> {
  const setId = `set_${uuidv4()}`;
  await db.runAsync(
    `INSERT INTO sets (id, session_exercise_id, set_number, type, weight_kg, reps, rir, completed)
     VALUES (?, ?, ?, ?, ?, ?, 2, 0);`,
    [setId, sessionExerciseId, setNumber, type, defaultWeight, defaultReps]
  );

  return {
    id: setId,
    sessionExerciseId,
    setNumber,
    type,
    weightKg: defaultWeight,
    reps: defaultReps,
    rir: 2,
    completed: false,
  };
}

export async function deleteSetFromSessionExercise(
  db: SQLite.SQLiteDatabase,
  setId: string
): Promise<void> {
  await db.runAsync('DELETE FROM sets WHERE id = ?;', [setId]);
}

export async function finishWorkoutSession(
  db: SQLite.SQLiteDatabase,
  sessionId: string,
  notes?: string
): Promise<void> {
  const now = new Date().toISOString();
  await db.runAsync(
    'UPDATE workout_sessions SET is_active = 0, finished_at = ?, notes = ? WHERE id = ?;',
    [now, notes || null, sessionId]
  );

  // recalculate PRs across all sessions
  await recalculateAllPersonalRecords(db);
}

export async function discardActiveWorkout(
  db: SQLite.SQLiteDatabase,
  sessionId: string
): Promise<void> {
  await db.runAsync('DELETE FROM workout_sessions WHERE id = ?;', [sessionId]);
}

export interface PaginatedSessionsResult {
  sessions: WorkoutSession[];
  hasMore: boolean;
  totalCount: number;
}

function chunkArray<T>(arr: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
}

function mapSetRow(st: any): WorkoutSet {
  return {
    id: st.id,
    sessionExerciseId: st.session_exercise_id,
    setNumber: st.set_number,
    type: st.type as SetType,
    weightKg: st.weight_kg,
    reps: st.reps,
    rir: st.rir,
    completed: Boolean(st.completed),
    completedAt: st.completed_at,
  };
}

function buildSessionFromRows(
  s: any,
  ses: any[],
  setsBySe: Map<string, any[]>
): WorkoutSession {
  const exercises: SessionExercise[] = ses.map((se) => {
    const sets = (setsBySe.get(se.id) || [])
      .slice()
      .sort((a, b) => a.set_number - b.set_number)
      .map(mapSetRow);

    return {
      id: se.id,
      sessionId: s.id,
      exerciseId: se.exercise_id,
      exerciseName: se.exercise_name,
      primaryMuscle: se.primary_muscle as MuscleGroup,
      order: se.exercise_order,
      notes: se.notes,
      restBetweenSetsSeconds: se.rest_between_sets_seconds ?? 120,
      restAfterExerciseSeconds: se.rest_after_exercise_seconds ?? 120,
      includeInVolume: se.include_in_volume !== 0,
      sets,
      previousPerformance: [],
    };
  });

  return {
    id: s.id,
    templateId: s.template_id,
    name: s.name,
    startedAt: s.started_at,
    finishedAt: s.finished_at,
    notes: s.notes,
    isActive: Boolean(s.is_active),
    exercises,
  };
}

async function getSessionExercisesForIds(
  db: SQLite.SQLiteDatabase,
  sessionIds: string[]
): Promise<any[]> {
  if (sessionIds.length === 0) return [];
  const placeholders = sessionIds.map(() => '?').join(', ');
  return db.getAllAsync<any>(
    `SELECT wse.*, e.name as exercise_name, e.primary_muscle
     FROM workout_session_exercises wse
     LEFT JOIN exercises e ON wse.exercise_id = e.id
     WHERE wse.session_id IN (${placeholders})
     ORDER BY wse.exercise_order ASC;`,
    sessionIds
  );
}

async function getSetsForSessionExerciseIds(
  db: SQLite.SQLiteDatabase,
  sessionExerciseIds: string[]
): Promise<Map<string, any[]>> {
  const setsBySe = new Map<string, any[]>();
  if (sessionExerciseIds.length === 0) return setsBySe;

  for (const chunk of chunkArray(sessionExerciseIds, 400)) {
    const placeholders = chunk.map(() => '?').join(', ');
    const rows = await db.getAllAsync<any>(
      `SELECT * FROM sets WHERE session_exercise_id IN (${placeholders});`,
      chunk
    );
    for (const r of rows) {
      if (!setsBySe.has(r.session_exercise_id)) {
        setsBySe.set(r.session_exercise_id, []);
      }
      setsBySe.get(r.session_exercise_id)!.push(r);
    }
  }
  return setsBySe;
}

async function getSessionsByIds(
  db: SQLite.SQLiteDatabase,
  ids: string[]
): Promise<WorkoutSession[]> {
  const result: WorkoutSession[] = [];

  for (const chunk of chunkArray(ids, 400)) {
    const placeholders = chunk.map(() => '?').join(', ');
    const sessionRows = await db.getAllAsync<any>(
      `SELECT * FROM workout_sessions WHERE id IN (${placeholders});`,
      chunk
    );

    const order = new Map(chunk.map((id, i) => [id, i]));
    sessionRows.sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0));

    const ses = await getSessionExercisesForIds(db, chunk);
    const sesBySession = new Map<string, any[]>();
    for (const se of ses) {
      if (!sesBySession.has(se.session_id)) {
        sesBySession.set(se.session_id, []);
      }
      sesBySession.get(se.session_id)!.push(se);
    }

    const setsBySe = await getSetsForSessionExerciseIds(
      db,
      ses.map((x) => x.id)
    );

    result.push(
      ...sessionRows.map((s) => buildSessionFromRows(s, sesBySession.get(s.id) || [], setsBySe))
    );
  }

  return result;
}

export async function getPaginatedCompletedSessions(
  db: SQLite.SQLiteDatabase,
  limit: number = 10,
  offset: number = 0
): Promise<PaginatedSessionsResult> {
  const countRow = await db.getFirstAsync<{ count: number }>(
    'SELECT COUNT(*) as count FROM workout_sessions WHERE is_active = 0;'
  );
  const totalCount = countRow ? countRow.count : 0;

  const rows = await db.getAllAsync<any>(
    'SELECT * FROM workout_sessions WHERE is_active = 0 ORDER BY started_at DESC LIMIT ? OFFSET ?;',
    [limit, offset]
  );

  const result = await getSessionsByIds(
    db,
    rows.map((r) => r.id)
  );

  const hasMore = offset + result.length < totalCount;
  return { sessions: result, hasMore, totalCount };
}

export async function getAllCompletedSessions(
  db: SQLite.SQLiteDatabase
): Promise<WorkoutSession[]> {
  const rows = await db.getAllAsync<{ id: string }>(
    'SELECT id FROM workout_sessions WHERE is_active = 0 ORDER BY started_at DESC;'
  );
  return getSessionsByIds(
    db,
    rows.map((r) => r.id)
  );
}

export async function getTemplateLastPerformedStats(
  db: SQLite.SQLiteDatabase
): Promise<Record<string, { date: string; duration: string }>> {
  const rows = await db.getAllAsync<{ template_id: string; started_at: string; finished_at: string }>(
    `SELECT template_id, started_at, finished_at
     FROM workout_sessions
     WHERE is_active = 0 AND template_id IS NOT NULL AND finished_at IS NOT NULL
     ORDER BY started_at DESC;`
  );

  const lastStats: Record<string, { date: string; duration: string }> = {};
  for (const r of rows) {
    if (!lastStats[r.template_id]) {
      const date = new Date(r.started_at).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      });
      const startMs = new Date(r.started_at).getTime();
      const endMs = new Date(r.finished_at).getTime();
      const mins = Math.max(1, Math.round((endMs - startMs) / 60000));
      const hours = Math.floor(mins / 60);
      const remMins = mins % 60;
      const durationStr =
        hours > 0 ? `${hours}h ${remMins.toString().padStart(2, '0')}m` : `${mins} min`;

      lastStats[r.template_id] = { date, duration: durationStr };
    }
  }

  return lastStats;
}

export async function getSessionById(
  db: SQLite.SQLiteDatabase,
  id: string
): Promise<WorkoutSession | null> {
  const s = await db.getFirstAsync<any>(
    'SELECT * FROM workout_sessions WHERE id = ?;',
    [id]
  );
  if (!s) return null;

  const ses = await getSessionExercisesForIds(db, [s.id]);
  const setsBySe = await getSetsForSessionExerciseIds(
    db,
    ses.map((x) => x.id)
  );
  const session = buildSessionFromRows(s, ses, setsBySe);

  // previous-performance prefills are only needed while logging an active workout
  if (session.isActive) {
    for (const se of session.exercises) {
      se.previousPerformance = await getPreviousPerformanceForExercise(db, se.exerciseId, session.id);
    }
  }

  return session;
}

export async function saveSessionExerciseUpdate(
  db: SQLite.SQLiteDatabase,
  sessionExerciseId: string,
  updates: {
    notes?: string | null;
    restBetweenSetsSeconds?: number;
    restAfterExerciseSeconds?: number;
    includeInVolume?: boolean;
  }
): Promise<void> {
  const fields: string[] = [];
  const params: any[] = [];

  if (updates.notes !== undefined) {
    fields.push('notes = ?');
    params.push(updates.notes);
  }
  if (updates.restBetweenSetsSeconds !== undefined) {
    fields.push('rest_between_sets_seconds = ?');
    params.push(updates.restBetweenSetsSeconds);
  }
  if (updates.restAfterExerciseSeconds !== undefined) {
    fields.push('rest_after_exercise_seconds = ?');
    params.push(updates.restAfterExerciseSeconds);
  }
  if (updates.includeInVolume !== undefined) {
    fields.push('include_in_volume = ?');
    params.push(updates.includeInVolume ? 1 : 0);
  }

  if (fields.length === 0) return;
  params.push(sessionExerciseId);

  await db.runAsync(
    `UPDATE workout_session_exercises SET ${fields.join(', ')} WHERE id = ?;`,
    params
  );

  // automatically propagate rest time and volume inclusion customizations back to template
  try {
    const seInfo = await db.getFirstAsync<{ session_id: string; exercise_id: string }>(
      'SELECT session_id, exercise_id FROM workout_session_exercises WHERE id = ?;',
      [sessionExerciseId]
    );
    if (seInfo) {
      const sess = await db.getFirstAsync<{ template_id: string | null }>(
        'SELECT template_id FROM workout_sessions WHERE id = ?;',
        [seInfo.session_id]
      );
      if (sess?.template_id) {
        const tmplFields: string[] = [];
        const tmplParams: any[] = [];
        if (updates.restBetweenSetsSeconds !== undefined) {
          tmplFields.push('rest_between_sets_seconds = ?');
          tmplParams.push(updates.restBetweenSetsSeconds);
        }
        if (updates.restAfterExerciseSeconds !== undefined) {
          tmplFields.push('rest_after_exercise_seconds = ?');
          tmplParams.push(updates.restAfterExerciseSeconds);
        }
        if (updates.includeInVolume !== undefined) {
          tmplFields.push('include_in_volume = ?');
          tmplParams.push(updates.includeInVolume ? 1 : 0);
        }
        if (tmplFields.length > 0) {
          tmplParams.push(sess.template_id, seInfo.exercise_id);
          await db.runAsync(
            `UPDATE workout_template_exercises SET ${tmplFields.join(', ')} WHERE template_id = ? AND exercise_id = ?;`,
            tmplParams
          );
        }
      }
    }
  } catch (err) {
    console.error('error updating template exercise defaults:', err);
  }
}

export async function deleteSession(
  db: SQLite.SQLiteDatabase,
  id: string
): Promise<void> {
  await db.runAsync('DELETE FROM workout_sessions WHERE id = ?;', [id]);
  await recalculateAllPersonalRecords(db);
}
