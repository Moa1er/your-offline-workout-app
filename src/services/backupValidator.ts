// json schema validator for import backups

import { ImportValidationResult } from '../types/backup';

/**
 * strictly validates imported JSON data structure against schema version 1
 */
export function validateWorkoutBackup(data: any): ImportValidationResult {
  const errors: string[] = [];

  if (!data || typeof data !== 'object') {
    return { valid: false, errors: ['Selected file does not contain valid JSON object.'] };
  }

  // 1. validate schema version
  if (typeof data.schemaVersion !== 'number') {
    errors.push('Missing required numeric field "schemaVersion".');
  } else if (data.schemaVersion !== 1) {
    errors.push(
      `Unsupported schema version ${data.schemaVersion}. This app supports schema version 1.`
    );
  }

  // 2. validate required root properties
  if (!Array.isArray(data.exercises)) {
    errors.push('Missing or invalid "exercises" array.');
  }

  if (!Array.isArray(data.workoutTemplates)) {
    errors.push('Missing or invalid "workoutTemplates" array.');
  }

  if (!Array.isArray(data.workoutSessions)) {
    errors.push('Missing or invalid "workoutSessions" array.');
  }

  if (errors.length > 0) {
    return { valid: false, errors };
  }

  // 3. validate exercises structure
  data.exercises.forEach((ex: any, idx: number) => {
    if (!ex.id || typeof ex.id !== 'string') {
      errors.push(`Exercise at index ${idx} is missing required string "id".`);
    }
    if (!ex.name || typeof ex.name !== 'string') {
      errors.push(`Exercise "${ex.id || idx}" is missing required string "name".`);
    }
    if (!ex.primaryMuscle || typeof ex.primaryMuscle !== 'string') {
      errors.push(`Exercise "${ex.name || idx}" is missing required "primaryMuscle".`);
    }
    for (const field of ['equipment', 'category', 'trackingType']) {
      if (ex[field] !== undefined && typeof ex[field] !== 'string') {
        errors.push(`Exercise "${ex.name || ex.id || idx}" field "${field}" must be a string.`);
      }
    }
  });

  // 4. validate workout templates structure
  data.workoutTemplates.forEach((tmpl: any, idx: number) => {
    if (!tmpl.id || typeof tmpl.id !== 'string') {
      errors.push(`Workout template at index ${idx} is missing required "id".`);
    }
    if (!tmpl.name || typeof tmpl.name !== 'string') {
      errors.push(`Workout template "${tmpl.id || idx}" is missing required "name".`);
    }
    if (!Array.isArray(tmpl.exercises)) {
      errors.push(`Workout template "${tmpl.name || idx}" exercises field must be an array.`);
    } else {
      tmpl.exercises.forEach((te: any, j: number) => {
        if (!te || typeof te !== 'object') {
          errors.push(`Workout template "${tmpl.name || tmpl.id || idx}" exercise at index ${j} must be an object.`);
          return;
        }
        if (!te.exerciseId || typeof te.exerciseId !== 'string') {
          errors.push(
            `Workout template "${tmpl.name || tmpl.id || idx}" exercise at index ${j} is missing required string "exerciseId".`
          );
        }
        for (const field of ['targetSets', 'repMin', 'repMax', 'restBetweenSetsSeconds', 'restAfterExerciseSeconds']) {
          if (typeof te[field] !== 'number' || !Number.isFinite(te[field])) {
            errors.push(
              `Workout template "${tmpl.name || tmpl.id || idx}" exercise at index ${j} field "${field}" must be a finite number.`
            );
          }
        }
        if (
          te.targetRir !== undefined &&
          te.targetRir !== null &&
          (typeof te.targetRir !== 'number' || !Number.isFinite(te.targetRir))
        ) {
          errors.push(
            `Workout template "${tmpl.name || tmpl.id || idx}" exercise at index ${j} field "targetRir" must be a finite number.`
          );
        }
      });
    }
  });

  // 5. validate workout sessions structure
  data.workoutSessions.forEach((sess: any, idx: number) => {
    if (!sess.id || typeof sess.id !== 'string') {
      errors.push(`Workout session at index ${idx} is missing required "id".`);
    }
    if (!sess.startedAt || typeof sess.startedAt !== 'string') {
      errors.push(`Workout session "${sess.id || idx}" is missing required "startedAt" timestamp.`);
    }
    if (!Array.isArray(sess.exercises)) {
      errors.push(`Workout session "${sess.id || idx}" exercises field must be an array.`);
    } else {
      sess.exercises.forEach((se: any, j: number) => {
        if (!se || typeof se !== 'object') {
          errors.push(`Workout session "${sess.id || idx}" exercise at index ${j} must be an object.`);
          return;
        }
        if (!se.exerciseId || typeof se.exerciseId !== 'string') {
          errors.push(
            `Workout session "${sess.id || idx}" exercise at index ${j} is missing required string "exerciseId".`
          );
        }
        if (!Array.isArray(se.sets)) {
          errors.push(`Workout session "${sess.id || idx}" exercise at index ${j} "sets" field must be an array.`);
          return;
        }
        se.sets.forEach((st: any, k: number) => {
          if (!st || typeof st !== 'object') {
            errors.push(`Workout session "${sess.id || idx}" exercise at index ${j} set at index ${k} must be an object.`);
            return;
          }
          for (const field of ['setNumber', 'weightKg', 'reps']) {
            if (st[field] !== undefined && (typeof st[field] !== 'number' || !Number.isFinite(st[field]))) {
              errors.push(
                `Workout session "${sess.id || idx}" exercise at index ${j} set at index ${k} field "${field}" must be a finite number.`
              );
            }
          }
          if (st.completed !== undefined && typeof st.completed !== 'boolean') {
            errors.push(
              `Workout session "${sess.id || idx}" exercise at index ${j} set at index ${k} field "completed" must be a boolean.`
            );
          }
        });
      });
    }
  });

  const valid = errors.length === 0;
  return {
    valid,
    errors,
    summary: valid
      ? {
          exerciseCount: data.exercises.length,
          templateCount: data.workoutTemplates.length,
          sessionCount: data.workoutSessions.length,
        }
      : undefined,
  };
}
