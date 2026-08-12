// database queries for exercises CRUD and archive management

import * as SQLite from 'expo-sqlite';
import { Exercise, MuscleGroup, EquipmentType, MovementCategory, TrackingType } from '../../types/workout';

export async function getAllExercises(
  db: SQLite.SQLiteDatabase,
  includeArchived: boolean = false
): Promise<Exercise[]> {
  const query = includeArchived
    ? 'SELECT * FROM exercises ORDER BY name ASC;'
    : 'SELECT * FROM exercises WHERE archived = 0 ORDER BY name ASC;';

  const rows = await db.getAllAsync<any>(query);
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    primaryMuscle: r.primary_muscle as MuscleGroup,
    secondaryMuscles: r.secondary_muscles_json ? JSON.parse(r.secondary_muscles_json) : [],
    equipment: r.equipment as EquipmentType,
    category: r.category as MovementCategory,
    trackingType: r.tracking_type as TrackingType,
    notes: r.notes,
    archived: Boolean(r.archived),
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  }));
}

export async function getExerciseById(
  db: SQLite.SQLiteDatabase,
  id: string
): Promise<Exercise | null> {
  const row = await db.getFirstAsync<any>('SELECT * FROM exercises WHERE id = ?;', [id]);
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    primaryMuscle: row.primary_muscle as MuscleGroup,
    secondaryMuscles: row.secondary_muscles_json ? JSON.parse(row.secondary_muscles_json) : [],
    equipment: row.equipment as EquipmentType,
    category: row.category as MovementCategory,
    trackingType: row.tracking_type as TrackingType,
    notes: row.notes,
    archived: Boolean(row.archived),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function saveExercise(
  db: SQLite.SQLiteDatabase,
  exercise: Partial<Exercise> & { id: string; name: string; primaryMuscle: MuscleGroup }
): Promise<void> {
  const now = new Date().toISOString();
  const existing = await getExerciseById(db, exercise.id);

  if (existing) {
    await db.runAsync(
      `UPDATE exercises
       SET name = ?, primary_muscle = ?, secondary_muscles_json = ?, equipment = ?, category = ?, tracking_type = ?, notes = ?, archived = ?, updated_at = ?
       WHERE id = ?;`,
      [
        exercise.name,
        exercise.primaryMuscle,
        JSON.stringify(exercise.secondaryMuscles || []),
        exercise.equipment || 'MACHINE',
        exercise.category || 'OTHER',
        exercise.trackingType || 'WEIGHT_REPS',
        exercise.notes || null,
        exercise.archived ? 1 : 0,
        now,
        exercise.id,
      ]
    );
  } else {
    await db.runAsync(
      `INSERT INTO exercises (id, name, primary_muscle, secondary_muscles_json, equipment, category, tracking_type, notes, archived, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
      [
        exercise.id,
        exercise.name,
        exercise.primaryMuscle,
        JSON.stringify(exercise.secondaryMuscles || []),
        exercise.equipment || 'MACHINE',
        exercise.category || 'OTHER',
        exercise.trackingType || 'WEIGHT_REPS',
        exercise.notes || null,
        exercise.archived ? 1 : 0,
        now,
        now,
      ]
    );
  }
}

export async function toggleArchiveExercise(
  db: SQLite.SQLiteDatabase,
  id: string,
  archived: boolean
): Promise<void> {
  const now = new Date().toISOString();
  await db.runAsync(
    'UPDATE exercises SET archived = ?, updated_at = ? WHERE id = ?;',
    [archived ? 1 : 0, now, id]
  );
}
