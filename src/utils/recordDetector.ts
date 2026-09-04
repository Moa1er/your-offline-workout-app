// record detection utilities for exercise volume records, session volume records, and prs

import * as SQLite from 'expo-sqlite';
import { WorkoutSet, PersonalRecord } from '../types/workout';
import { calculateE1RM, calculateSetVolume } from './calculations';

export interface ExerciseHistoricalBest {
  maxExerciseVolume: number;
  bestSetVolume: number;
  maxWeight: number;
  maxE1rm: number;
}

export interface SessionHistoricalBest {
  maxSessionVolume: number;
  bestSessionId?: string;
}

export interface HitRecordInfo {
  type: 'EXERCISE_VOLUME' | 'SET_VOLUME' | 'MAX_WEIGHT' | 'MAX_E1RM' | 'SESSION_VOLUME';
  title: string;
  badge: string;
  exerciseName?: string;
  currentValue: number;
  previousBest: number;
  improvement: number;
  improvementPercent: number;
  unit?: string;
}

export async function getExerciseHistoricalBest(
  db: SQLite.SQLiteDatabase,
  exerciseId: string,
  excludeSessionId?: string
): Promise<ExerciseHistoricalBest> {
  // query all past completed sets for this exercise
  const params: any[] = [exerciseId];
  let excludeClause = '';
  if (excludeSessionId) {
    excludeClause = 'AND ws.id != ?';
    params.push(excludeSessionId);
  }

  const rows = await db.getAllAsync<{
    session_id: string;
    weight_kg: number;
    reps: number;
    type: string;
    include_in_volume: number;
  }>(
    `SELECT ws.id as session_id, s.weight_kg, s.reps, s.type, wse.include_in_volume
     FROM sets s
     JOIN workout_session_exercises wse ON s.session_exercise_id = wse.id
     JOIN workout_sessions ws ON wse.session_id = ws.id
     WHERE wse.exercise_id = ? AND s.completed = 1 AND ws.is_active = 0 ${excludeClause};`,
    params
  );

  let bestSetVolume = 0;
  let maxWeight = 0;
  let maxE1rm = 0;
  const volumeBySession: Record<string, number> = {};

  for (const r of rows) {
    if (r.type !== 'WARMUP') {
      const vol = r.weight_kg * r.reps;
      if (vol > bestSetVolume) bestSetVolume = vol;
      if (r.weight_kg > maxWeight) maxWeight = r.weight_kg;

      const e1rm = calculateE1RM(r.weight_kg, r.reps);
      if (e1rm > maxE1rm) maxE1rm = e1rm;

      // accumulate exercise volume records for all completed working sets
      volumeBySession[r.session_id] = (volumeBySession[r.session_id] || 0) + vol;
    }
  }

  let maxExerciseVolume = 0;
  for (const sessId of Object.keys(volumeBySession)) {
    if (volumeBySession[sessId] > maxExerciseVolume) {
      maxExerciseVolume = volumeBySession[sessId];
    }
  }

  return {
    maxExerciseVolume,
    bestSetVolume,
    maxWeight,
    maxE1rm,
  };
}

export async function getSessionHistoricalBest(
  db: SQLite.SQLiteDatabase,
  excludeSessionId?: string
): Promise<SessionHistoricalBest> {
  const params: any[] = [];
  let excludeClause = '';
  if (excludeSessionId) {
    excludeClause = 'AND ws.id != ?';
    params.push(excludeSessionId);
  }

  const rows = await db.getAllAsync<{
    session_id: string;
    total_volume: number;
  }>(
    `SELECT ws.id as session_id, SUM(s.weight_kg * s.reps) as total_volume
     FROM sets s
     JOIN workout_session_exercises wse ON s.session_exercise_id = wse.id
     JOIN workout_sessions ws ON wse.session_id = ws.id
     WHERE s.completed = 1 AND s.type != 'WARMUP' AND wse.include_in_volume != 0 AND ws.is_active = 0 ${excludeClause}
     GROUP BY ws.id;`,
    params
  );

  let maxSessionVolume = 0;
  let bestSessionId: string | undefined;

  for (const r of rows) {
    if (r.total_volume > maxSessionVolume) {
      maxSessionVolume = r.total_volume;
      bestSessionId = r.session_id;
    }
  }

  return { maxSessionVolume, bestSessionId };
}
