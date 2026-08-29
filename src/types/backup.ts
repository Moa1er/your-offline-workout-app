// typescript interfaces for json backup import and export schemas

import { UserSettings } from './workout';

export interface ExportedExercise {
  id: string;
  name: string;
  primaryMuscle: string;
  secondaryMuscles?: string[];
  equipment: string;
  category: string;
  trackingType: string;
  notes?: string | null;
  archived?: boolean;
}

export interface ExportedTemplateExercise {
  exerciseId: string;
  order: number;
  targetSets: number;
  targetReps?: number;
  reps?: number;
  repMin?: number;
  repMax?: number;
  targetRir?: number | null;
  restBetweenSetsSeconds: number;
  restAfterExerciseSeconds: number;
  notes?: string | null;
}

export interface ExportedWorkoutTemplate {
  id: string;
  name: string;
  description?: string | null;
  exercises: ExportedTemplateExercise[];
}

export interface ExportedSet {
  id: string;
  setNumber: number;
  type: string;
  weightKg: number;
  reps: number;
  rir?: number | null;
  completed: boolean;
}

export interface ExportedSessionExercise {
  exerciseId: string;
  order: number;
  notes?: string | null;
  sets: ExportedSet[];
}

export interface ExportedWorkoutSession {
  id: string;
  templateId?: string | null;
  name: string;
  startedAt: string;
  finishedAt?: string | null;
  notes?: string | null;
  exercises: ExportedSessionExercise[];
}

export interface WorkoutBackup {
  schemaVersion: number;
  exportedAt: string;
  app: {
    name: string;
    version: string;
  };
  settings?: Partial<UserSettings>;
  exercises: ExportedExercise[];
  workoutTemplates: ExportedWorkoutTemplate[];
  workoutSessions: ExportedWorkoutSession[];
}

export interface ImportValidationResult {
  valid: boolean;
  errors: string[];
  summary?: {
    exerciseCount: number;
    templateCount: number;
    sessionCount: number;
  };
}
