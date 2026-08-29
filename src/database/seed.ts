// default database seeder for exercises and example upper body template

import * as SQLite from 'expo-sqlite';
import { autoImportBundledHevyCsv } from '../services/hevyImporter';

export const DEFAULT_EXERCISES = [
  {
    id: 'exercise_chest_press_machine',
    name: 'Chest Press - Machine',
    primaryMuscle: 'CHEST',
    secondaryMuscles: ['TRICEPS', 'FRONT_DELTS'],
    equipment: 'MACHINE',
    category: 'HORIZONTAL_PUSH',
    trackingType: 'WEIGHT_REPS',
    notes: 'Adjust seat height so handles align with chest level.',
  },
  {
    id: 'exercise_lat_pulldown',
    name: 'Lat Pulldown - Cable',
    primaryMuscle: 'LATS',
    secondaryMuscles: ['BICEPS', 'BACK'],
    equipment: 'CABLE',
    category: 'VERTICAL_PULL',
    trackingType: 'WEIGHT_REPS',
    notes: 'Keep chest high and pull elbow down to sides.',
  },
  {
    id: 'exercise_shoulder_press',
    name: 'Shoulder Press',
    primaryMuscle: 'FRONT_DELTS',
    secondaryMuscles: ['TRICEPS', 'SIDE_DELTS'],
    equipment: 'DUMBBELL',
    category: 'VERTICAL_PUSH',
    trackingType: 'WEIGHT_REPS',
    notes: 'Press directly overhead without arching lower back.',
  },
  {
    id: 'exercise_seated_cable_row',
    name: 'Seated Cable Row - V Grip',
    primaryMuscle: 'BACK',
    secondaryMuscles: ['BICEPS', 'LATS'],
    equipment: 'CABLE',
    category: 'HORIZONTAL_PULL',
    trackingType: 'WEIGHT_REPS',
    notes: 'Squeeze shoulder blades together at end of row.',
  },
  {
    id: 'exercise_dips',
    name: 'Dips',
    primaryMuscle: 'TRICEPS',
    secondaryMuscles: ['CHEST', 'FRONT_DELTS'],
    equipment: 'BODYWEIGHT',
    category: 'VERTICAL_PUSH',
    trackingType: 'BODYWEIGHT_REPS',
    notes: 'Control lowering phase until elbows reach 90 degrees.',
  },
  {
    id: 'exercise_bicep_curl',
    name: 'Bicep Curl',
    primaryMuscle: 'BICEPS',
    secondaryMuscles: ['FOREARMS'],
    equipment: 'DUMBBELL',
    category: 'ELBOW_FLEXION',
    trackingType: 'WEIGHT_REPS',
    notes: 'Avoid swinging momentum.',
  },
  {
    id: 'exercise_lateral_raise',
    name: 'Lateral Raise',
    primaryMuscle: 'SIDE_DELTS',
    secondaryMuscles: ['TRAPS'],
    equipment: 'DUMBBELL',
    category: 'SHOULDER_ISOLATION',
    trackingType: 'WEIGHT_REPS',
    notes: 'Raise arms out to sides with slight forward angle.',
  },
  {
    id: 'exercise_barbell_squat',
    name: 'Barbell Back Squat',
    primaryMuscle: 'QUADS',
    secondaryMuscles: ['GLUTES', 'HAMSTRINGS'],
    equipment: 'BARBELL',
    category: 'KNEE_EXTENSION',
    trackingType: 'WEIGHT_REPS',
    notes: 'Keep heels grounded and depth to parallel.',
  },
  {
    id: 'exercise_deadlift',
    name: 'Barbell Deadlift',
    primaryMuscle: 'BACK',
    secondaryMuscles: ['HAMSTRINGS', 'GLUTES'],
    equipment: 'BARBELL',
    category: 'HIP_DOMINANT',
    trackingType: 'WEIGHT_REPS',
    notes: 'Keep bar path close to shins and lock out hips.',
  },
  {
    id: 'exercise_leg_press',
    name: 'Leg Press - Machine',
    primaryMuscle: 'QUADS',
    secondaryMuscles: ['GLUTES'],
    equipment: 'MACHINE',
    category: 'KNEE_EXTENSION',
    trackingType: 'WEIGHT_REPS',
    notes: 'Do not lock out knees aggressively at top.',
  },
];

export async function seedDefaultData(db: SQLite.SQLiteDatabase): Promise<void> {
  // check if exercises exist
  const exerciseCheck = await db.getFirstAsync<{ count: number }>(
    'SELECT COUNT(*) as count FROM exercises;'
  );

  const now = new Date().toISOString();

  if (exerciseCheck && exerciseCheck.count === 0) {
    // seed default exercises
    for (const ex of DEFAULT_EXERCISES) {
      await db.runAsync(
        `INSERT INTO exercises (id, name, primary_muscle, secondary_muscles_json, equipment, category, tracking_type, notes, archived, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?);`,
        [
          ex.id,
          ex.name,
          ex.primaryMuscle,
          JSON.stringify(ex.secondaryMuscles),
          ex.equipment,
          ex.category,
          ex.trackingType,
          ex.notes,
          now,
          now,
        ]
      );
    }
  }

  // auto-import bundled hevy data on initial app launch if database has no sessions
  try {
    await autoImportBundledHevyCsv(db);
  } catch (err) {
    console.error('auto-import error during database seeding:', err);
  }
}

export async function installExampleUpperBodyTemplate(db: SQLite.SQLiteDatabase): Promise<string> {
  const templateId = 'template_full_upper_body';
  const now = new Date().toISOString();

  // check if template already installed
  const existing = await db.getFirstAsync<{ id: string }>(
    'SELECT id FROM workout_templates WHERE id = ?;',
    [templateId]
  );

  if (existing) {
    return templateId;
  }

  await db.runAsync(
    `INSERT INTO workout_templates (id, name, description, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?);`,
    [
      templateId,
      'Full Upper Body',
      'Balanced upper body Hypertrophy template',
      now,
      now,
    ]
  );

  const templateExercises = [
    {
      id: 'tmpl_ex_1',
      exerciseId: 'exercise_chest_press_machine',
      order: 1,
      targetSets: 3,
      repMin: 6,
      repMax: 10,
      targetRir: 2,
      restBetweenSetsSeconds: 150,
      restAfterExerciseSeconds: 120,
    },
    {
      id: 'tmpl_ex_2',
      exerciseId: 'exercise_lat_pulldown',
      order: 2,
      targetSets: 3,
      repMin: 6,
      repMax: 10,
      targetRir: 2,
      restBetweenSetsSeconds: 150,
      restAfterExerciseSeconds: 120,
    },
    {
      id: 'tmpl_ex_3',
      exerciseId: 'exercise_shoulder_press',
      order: 3,
      targetSets: 3,
      repMin: 6,
      repMax: 10,
      targetRir: 2,
      restBetweenSetsSeconds: 120,
      restAfterExerciseSeconds: 120,
    },
    {
      id: 'tmpl_ex_4',
      exerciseId: 'exercise_seated_cable_row',
      order: 4,
      targetSets: 3,
      repMin: 8,
      repMax: 12,
      targetRir: 2,
      restBetweenSetsSeconds: 120,
      restAfterExerciseSeconds: 120,
    },
    {
      id: 'tmpl_ex_5',
      exerciseId: 'exercise_dips',
      order: 5,
      targetSets: 2,
      repMin: 6,
      repMax: 12,
      targetRir: 2,
      restBetweenSetsSeconds: 120,
      restAfterExerciseSeconds: 90,
    },
    {
      id: 'tmpl_ex_6',
      exerciseId: 'exercise_bicep_curl',
      order: 6,
      targetSets: 2,
      repMin: 8,
      repMax: 12,
      targetRir: 2,
      restBetweenSetsSeconds: 90,
      restAfterExerciseSeconds: 75,
    },
    {
      id: 'tmpl_ex_7',
      exerciseId: 'exercise_lateral_raise',
      order: 7,
      targetSets: 2,
      repMin: 10,
      repMax: 15,
      targetRir: 2,
      restBetweenSetsSeconds: 75,
      restAfterExerciseSeconds: 60,
    },
  ];

  for (const te of templateExercises) {
    await db.runAsync(
      `INSERT INTO workout_template_exercises (id, template_id, exercise_id, exercise_order, target_sets, target_reps, rep_min, rep_max, target_rir, rest_between_sets_seconds, rest_after_exercise_seconds, include_in_volume)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
      [
        te.id,
        templateId,
        te.exerciseId,
        te.order,
        te.targetSets,
        te.repMax,
        te.repMin,
        te.repMax,
        te.targetRir,
        te.restBetweenSetsSeconds,
        te.restAfterExerciseSeconds,
        1,
      ]
    );
  }

  return templateId;
}
