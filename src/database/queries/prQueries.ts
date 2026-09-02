// database queries for calculating and managing personal records (prs)

import * as SQLite from 'expo-sqlite';
import { PersonalRecord, RecordType } from '../../types/workout';
import { calculateE1RM } from '../../utils/calculations';
import { generateId as uuidv4 } from '../../utils/uuid';

export async function getPersonalRecordsForExercise(
  db: SQLite.SQLiteDatabase,
  exerciseId: string
): Promise<PersonalRecord[]> {
  const rows = await db.getAllAsync<any>(
    `SELECT pr.*, e.name as exercise_name
     FROM personal_records pr
     JOIN exercises e ON pr.exercise_id = e.id
     WHERE pr.exercise_id = ?
     ORDER BY pr.achieved_at DESC;`,
    [exerciseId]
  );

  return rows.map((r) => ({
    id: r.id,
    exerciseId: r.exercise_id,
    exerciseName: r.exercise_name,
    recordType: r.record_type as RecordType,
    value: r.value,
    weightKg: r.weight_kg,
    reps: r.reps,
    setId: r.set_id,
    sessionId: r.session_id,
    achievedAt: r.achieved_at,
  }));
}

export async function getAllPersonalRecords(
  db: SQLite.SQLiteDatabase
): Promise<PersonalRecord[]> {
  const rows = await db.getAllAsync<any>(
    `SELECT pr.*, e.name as exercise_name
     FROM personal_records pr
     JOIN exercises e ON pr.exercise_id = e.id
     ORDER BY pr.achieved_at DESC;`
  );

  return rows.map((r) => ({
    id: r.id,
    exerciseId: r.exercise_id,
    exerciseName: r.exercise_name,
    recordType: r.record_type as RecordType,
    value: r.value,
    weightKg: r.weight_kg,
    reps: r.reps,
    setId: r.set_id,
    sessionId: r.session_id,
    achievedAt: r.achieved_at,
  }));
}

export async function recalculateAllPersonalRecords(
  db: SQLite.SQLiteDatabase
): Promise<void> {
  // delete existing pr records
  await db.runAsync('DELETE FROM personal_records;');

  // fetch all completed sets in finished sessions
  const sets = await db.getAllAsync<any>(
    `SELECT s.*, wse.exercise_id, ws.id as session_id,
            COALESCE(s.completed_at, ws.finished_at, ws.started_at) as achieved_at
     FROM sets s
     JOIN workout_session_exercises wse ON s.session_exercise_id = wse.id
     JOIN workout_sessions ws ON wse.session_id = ws.id
     WHERE s.completed = 1 AND ws.is_active = 0 AND s.type != 'WARMUP'
     ORDER BY ws.finished_at ASC;`
  );

  const maxWeightMap: Record<string, { val: number; set: any }> = {};
  const maxRepsAtWeightMap: Record<string, { val: number; set: any }> = {};
  const maxE1rmMap: Record<string, { val: number; set: any }> = {};
  const maxSetVolumeMap: Record<string, { val: number; set: any }> = {};

  for (const set of sets) {
    const exId = set.exercise_id;
    const weight = set.weight_kg;
    const reps = set.reps;
    const e1rm = calculateE1RM(weight, reps);
    const setVol = weight * reps;

    // 1. max weight
    if (!maxWeightMap[exId] || weight > maxWeightMap[exId].val) {
      maxWeightMap[exId] = { val: weight, set };
    }

    // 2. max reps at weight key
    const weightKey = `${exId}_${weight}`;
    if (!maxRepsAtWeightMap[weightKey] || reps > maxRepsAtWeightMap[weightKey].val) {
      maxRepsAtWeightMap[weightKey] = { val: reps, set };
    }

    // 3. max e1rm
    if (e1rm > 0 && (!maxE1rmMap[exId] || e1rm > maxE1rmMap[exId].val)) {
      maxE1rmMap[exId] = { val: e1rm, set };
    }

    // 4. max set volume
    if (setVol > 0 && (!maxSetVolumeMap[exId] || setVol > maxSetVolumeMap[exId].val)) {
      maxSetVolumeMap[exId] = { val: setVol, set };
    }
  }

  // insert computed records
  for (const exId of Object.keys(maxWeightMap)) {
    const item = maxWeightMap[exId];
    await db.runAsync(
      `INSERT INTO personal_records (id, exercise_id, record_type, value, weight_kg, reps, set_id, session_id, achieved_at)
       VALUES (?, ?, 'MAX_WEIGHT', ?, ?, ?, ?, ?, ?);`,
      [
        uuidv4(),
        exId,
        item.val,
        item.set.weight_kg,
        item.set.reps,
        item.set.id,
        item.set.session_id,
        item.set.achieved_at || new Date().toISOString(),
      ]
    );
  }

  for (const key of Object.keys(maxRepsAtWeightMap)) {
    const item = maxRepsAtWeightMap[key];
    await db.runAsync(
      `INSERT INTO personal_records (id, exercise_id, record_type, value, weight_kg, reps, set_id, session_id, achieved_at)
       VALUES (?, ?, 'MAX_REPS_AT_WEIGHT', ?, ?, ?, ?, ?, ?);`,
      [
        uuidv4(),
        item.set.exercise_id,
        item.val,
        item.set.weight_kg,
        item.set.reps,
        item.set.id,
        item.set.session_id,
        item.set.achieved_at || new Date().toISOString(),
      ]
    );
  }

  for (const exId of Object.keys(maxE1rmMap)) {
    const item = maxE1rmMap[exId];
    await db.runAsync(
      `INSERT INTO personal_records (id, exercise_id, record_type, value, weight_kg, reps, set_id, session_id, achieved_at)
       VALUES (?, ?, 'MAX_E1RM', ?, ?, ?, ?, ?, ?);`,
      [
        uuidv4(),
        exId,
        item.val,
        item.set.weight_kg,
        item.set.reps,
        item.set.id,
        item.set.session_id,
        item.set.achieved_at || new Date().toISOString(),
      ]
    );
  }

  for (const exId of Object.keys(maxSetVolumeMap)) {
    const item = maxSetVolumeMap[exId];
    await db.runAsync(
      `INSERT INTO personal_records (id, exercise_id, record_type, value, weight_kg, reps, set_id, session_id, achieved_at)
       VALUES (?, ?, 'MAX_SET_VOLUME', ?, ?, ?, ?, ?, ?);`,
      [
        uuidv4(),
        exId,
        item.val,
        item.set.weight_kg,
        item.set.reps,
        item.set.id,
        item.set.session_id,
        item.set.achieved_at || new Date().toISOString(),
      ]
    );
  }
}
