// typescript interface definitions for core workout entity objects

export type MuscleGroup =
  | 'CHEST'
  | 'BACK'
  | 'LATS'
  | 'TRAPS'
  | 'FRONT_DELTS'
  | 'SIDE_DELTS'
  | 'REAR_DELTS'
  | 'BICEPS'
  | 'TRICEPS'
  | 'FOREARMS'
  | 'QUADS'
  | 'HAMSTRINGS'
  | 'GLUTES'
  | 'CALVES'
  | 'CORE'
  | 'OTHER';

export type EquipmentType =
  | 'BARBELL'
  | 'DUMBBELL'
  | 'CABLE'
  | 'MACHINE'
  | 'BODYWEIGHT'
  | 'SMITH_MACHINE'
  | 'KETTLEBELL'
  | 'BAND'
  | 'OTHER';

export type MovementCategory =
  | 'HORIZONTAL_PUSH'
  | 'VERTICAL_PUSH'
  | 'HORIZONTAL_PULL'
  | 'VERTICAL_PULL'
  | 'ELBOW_FLEXION'
  | 'ELBOW_EXTENSION'
  | 'SHOULDER_ISOLATION'
  | 'KNEE_EXTENSION'
  | 'KNEE_FLEXION'
  | 'HIP_DOMINANT'
  | 'CORE'
  | 'OTHER';

export type TrackingType =
  | 'WEIGHT_REPS'
  | 'REPS_ONLY'
  | 'BODYWEIGHT_REPS'
  | 'BODYWEIGHT_PLUS_WEIGHT'
  | 'ASSISTED_BODYWEIGHT'
  | 'TIME'
  | 'DISTANCE'
  | 'OTHER';

export type SetType = 'WARMUP' | 'WORKING' | 'FAILURE' | 'DROP_SET';

export interface Exercise {
  id: string;
  name: string;
  primaryMuscle: MuscleGroup;
  secondaryMuscles: MuscleGroup[];
  equipment: EquipmentType;
  category: MovementCategory;
  trackingType: TrackingType;
  notes?: string | null;
  archived: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface TemplateExercise {
  id?: string;
  templateId?: string;
  exerciseId: string;
  exerciseName?: string;
  order: number;
  targetSets: number;
  repMin: number;
  repMax: number;
  targetRir?: number | null;
  restBetweenSetsSeconds: number;
  restAfterExerciseSeconds: number;
  notes?: string | null;
}

export interface WorkoutTemplate {
  id: string;
  name: string;
  description?: string | null;
  createdAt?: string;
  updatedAt?: string;
  exercises: TemplateExercise[];
}

export interface WorkoutSet {
  id: string;
  sessionExerciseId?: string;
  setNumber: number;
  type: SetType;
  weightKg: number;
  reps: number;
  rir?: number | null;
  completed: boolean;
  completedAt?: string | null;
  isPr?: boolean;
}

export interface SessionExercise {
  id: string;
  sessionId: string;
  exerciseId: string;
  exerciseName?: string;
  primaryMuscle?: MuscleGroup;
  order: number;
  notes?: string | null;
  restBetweenSetsSeconds?: number;
  restAfterExerciseSeconds?: number;
  sets: WorkoutSet[];
  previousPerformance?: WorkoutSet[];
}

export interface WorkoutSession {
  id: string;
  templateId?: string | null;
  name: string;
  startedAt: string;
  finishedAt?: string | null;
  notes?: string | null;
  isActive: boolean;
  exercises: SessionExercise[];
}

export type RecordType =
  | 'MAX_WEIGHT'
  | 'MAX_REPS_AT_WEIGHT'
  | 'MAX_E1RM'
  | 'MAX_EXERCISE_VOLUME'
  | 'MAX_WORKOUT_VOLUME';

export interface PersonalRecord {
  id: string;
  exerciseId: string;
  exerciseName?: string;
  recordType: RecordType;
  value: number;
  weightKg?: number;
  reps?: number;
  setId?: string;
  sessionId?: string;
  achievedAt: string;
}

export interface UserSettings {
  weightUnit: 'kg' | 'lb';
  theme: 'dark' | 'light' | 'system';
  defaultSetRestSeconds: number;
  defaultExerciseRestSeconds: number;
  keepScreenAwake: boolean;
  hapticFeedback: boolean;
  timerVibration: boolean;
  timerSound: boolean;
  showRir: boolean;
}
