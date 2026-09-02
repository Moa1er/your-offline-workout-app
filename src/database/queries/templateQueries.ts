// database queries for workout templates and template exercises

import * as SQLite from 'expo-sqlite';
import { WorkoutTemplate } from '../../types/workout';
import { generateId as uuidv4 } from '../../utils/uuid';

export async function getAllTemplates(db: SQLite.SQLiteDatabase): Promise<WorkoutTemplate[]> {
  const templates = await db.getAllAsync<any>(
    'SELECT * FROM workout_templates ORDER BY name ASC;'
  );

  if (templates.length === 0) return [];

  const placeholders = templates.map(() => '?').join(', ');
  const exercises = await db.getAllAsync<any>(
    `SELECT te.*, e.name as exercise_name, e.primary_muscle, e.category, e.equipment
     FROM workout_template_exercises te
     LEFT JOIN exercises e ON te.exercise_id = e.id
     WHERE te.template_id IN (${placeholders})
     ORDER BY te.exercise_order ASC;`,
    templates.map((t) => t.id)
  );

  const exercisesByTemplate = new Map<string, any[]>();
  for (const e of exercises) {
    if (!exercisesByTemplate.has(e.template_id)) {
      exercisesByTemplate.set(e.template_id, []);
    }
    exercisesByTemplate.get(e.template_id)!.push(e);
  }

  return templates.map((t) => ({
    id: t.id,
    name: t.name,
    description: t.description,
    createdAt: t.created_at,
    updatedAt: t.updated_at,
    exercises: (exercisesByTemplate.get(t.id) || []).map((e) => ({
      id: e.id,
      templateId: e.template_id,
      exerciseId: e.exercise_id,
      exerciseName: e.exercise_name || 'Exercise',
      primaryMuscle: e.primary_muscle,
      category: e.category,
      equipment: e.equipment,
      order: e.exercise_order,
      targetSets: e.target_sets,
      targetReps: e.target_reps ?? e.rep_max ?? e.rep_min ?? 10,
      repMin: e.rep_min ?? e.target_reps ?? 10,
      repMax: e.rep_max ?? e.target_reps ?? 10,
      targetRir: e.target_rir,
      restBetweenSetsSeconds: e.rest_between_sets_seconds ?? 120,
      restAfterExerciseSeconds: e.rest_after_exercise_seconds ?? 120,
      includeInVolume: e.include_in_volume !== 0,
      notes: e.notes,
    })),
  }));
}

export async function getTemplateById(
  db: SQLite.SQLiteDatabase,
  id: string
): Promise<WorkoutTemplate | null> {
  const t = await db.getFirstAsync<any>(
    'SELECT * FROM workout_templates WHERE id = ?;',
    [id]
  );
  if (!t) return null;

  const exercises = await db.getAllAsync<any>(
    `SELECT te.*, e.name as exercise_name, e.primary_muscle, e.category, e.equipment
     FROM workout_template_exercises te
     LEFT JOIN exercises e ON te.exercise_id = e.id
     WHERE te.template_id = ?
     ORDER BY te.exercise_order ASC;`,
    [t.id]
  );

  return {
    id: t.id,
    name: t.name,
    description: t.description,
    createdAt: t.created_at,
    updatedAt: t.updated_at,
    exercises: exercises.map((e) => ({
      id: e.id,
      templateId: e.template_id,
      exerciseId: e.exercise_id,
      exerciseName: e.exercise_name,
      primaryMuscle: e.primary_muscle,
      category: e.category,
      equipment: e.equipment,
      order: e.exercise_order,
      targetSets: e.target_sets,
      targetReps: e.target_reps ?? e.rep_max ?? e.rep_min ?? 10,
      repMin: e.rep_min ?? e.target_reps ?? 10,
      repMax: e.rep_max ?? e.target_reps ?? 10,
      targetRir: e.target_rir,
      restBetweenSetsSeconds: e.rest_between_sets_seconds ?? 120,
      restAfterExerciseSeconds: e.rest_after_exercise_seconds ?? 120,
      includeInVolume: e.include_in_volume !== 0,
      notes: e.notes,
    })),
  };
}

export async function saveTemplate(
  db: SQLite.SQLiteDatabase,
  template: WorkoutTemplate
): Promise<void> {
  const now = new Date().toISOString();
  const existing = await getTemplateById(db, template.id);

  await db.withTransactionAsync(async () => {
    if (existing) {
      await db.runAsync(
        'UPDATE workout_templates SET name = ?, description = ?, updated_at = ? WHERE id = ?;',
        [template.name, template.description || null, now, template.id]
      );
      // delete previous template exercises and reinsert
      await db.runAsync('DELETE FROM workout_template_exercises WHERE template_id = ?;', [
        template.id,
      ]);
    } else {
      await db.runAsync(
        'INSERT INTO workout_templates (id, name, description, created_at, updated_at) VALUES (?, ?, ?, ?, ?);',
        [template.id, template.name, template.description || null, template.createdAt || now, now]
      );
    }

    // insert exercises
    for (let i = 0; i < template.exercises.length; i++) {
      const te = template.exercises[i];
      const repsVal = te.targetReps ?? te.repMax ?? te.repMin ?? 10;
      await db.runAsync(
        `INSERT INTO workout_template_exercises (id, template_id, exercise_id, exercise_order, target_sets, target_reps, rep_min, rep_max, target_rir, rest_between_sets_seconds, rest_after_exercise_seconds, include_in_volume, notes)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
        [
          te.id || uuidv4(),
          template.id,
          te.exerciseId,
          i + 1,
          te.targetSets,
          repsVal,
          repsVal,
          repsVal,
          te.targetRir ?? 2,
          te.restBetweenSetsSeconds ?? 120,
          te.restAfterExerciseSeconds ?? 120,
          te.includeInVolume !== false ? 1 : 0,
          te.notes || null,
        ]
      );
    }
  });
}

export async function deleteTemplate(
  db: SQLite.SQLiteDatabase,
  id: string
): Promise<void> {
  await db.runAsync('DELETE FROM workout_templates WHERE id = ?;', [id]);
}

export async function duplicateTemplate(
  db: SQLite.SQLiteDatabase,
  id: string
): Promise<WorkoutTemplate | null> {
  const source = await getTemplateById(db, id);
  if (!source) return null;

  const newId = `template_${uuidv4()}`;
  const newTemplate: WorkoutTemplate = {
    ...source,
    id: newId,
    name: `${source.name} (Copy)`,
    exercises: source.exercises.map((e) => ({
      ...e,
      id: uuidv4(),
      templateId: newId,
    })),
  };

  await saveTemplate(db, newTemplate);
  return newTemplate;
}
