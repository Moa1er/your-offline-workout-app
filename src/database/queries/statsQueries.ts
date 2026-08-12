// database queries for progress dashboard, muscle split volume, and chart historical data points

import * as SQLite from 'expo-sqlite';
import { MuscleGroup, Exercise } from '../../types/workout';
import { calculateE1RM, calculateSetVolume } from '../../utils/calculations';

export interface ProgressOverviewStats {
  workoutCount: number;
  totalDurationMinutes: number;
  workingSetsCount: number;
  totalReps: number;
  totalVolumeKg: number;
  prCount: number;
}

export interface ChartDataPoint {
  date: string;
  timestamp: number;
  value: number;
  weightKg?: number;
  reps?: number;
  e1rm?: number;
}

export async function getMuscleVolumeBreakdown(
  db: SQLite.SQLiteDatabase,
  startDateIso?: string
): Promise<Record<MuscleGroup, number>> {
  const muscleSets: Record<MuscleGroup, number> = {
    CHEST: 0,
    BACK: 0,
    LATS: 0,
    TRAPS: 0,
    FRONT_DELTS: 0,
    SIDE_DELTS: 0,
    REAR_DELTS: 0,
    BICEPS: 0,
    TRICEPS: 0,
    FOREARMS: 0,
    QUADS: 0,
    HAMSTRINGS: 0,
    GLUTES: 0,
    CALVES: 0,
    CORE: 0,
    OTHER: 0,
  };

  const query = startDateIso
    ? `SELECT e.primary_muscle, COUNT(s.id) as set_count
       FROM sets s
       JOIN workout_session_exercises wse ON s.session_exercise_id = wse.id
       JOIN workout_sessions ws ON wse.session_id = ws.id
       JOIN exercises e ON wse.exercise_id = e.id
       WHERE s.completed = 1 AND s.type != 'WARMUP' AND ws.is_active = 0 AND ws.started_at >= ?
       GROUP BY e.primary_muscle;`
    : `SELECT e.primary_muscle, COUNT(s.id) as set_count
       FROM sets s
       JOIN workout_session_exercises wse ON s.session_exercise_id = wse.id
       JOIN workout_sessions ws ON wse.session_id = ws.id
       JOIN exercises e ON wse.exercise_id = e.id
       WHERE s.completed = 1 AND s.type != 'WARMUP' AND ws.is_active = 0
       GROUP BY e.primary_muscle;`;

  const rows = await db.getAllAsync<any>(query, startDateIso ? [startDateIso] : []);

  for (const r of rows) {
    const muscle = r.primary_muscle as MuscleGroup;
    if (muscleSets[muscle] !== undefined) {
      muscleSets[muscle] += r.set_count;
    }
  }

  return muscleSets;
}

export async function getProgressOverviewStats(
  db: SQLite.SQLiteDatabase,
  startDateIso?: string,
  endDateIso?: string
): Promise<ProgressOverviewStats> {
  let dateFilter = 'WHERE is_active = 0';
  const params: any[] = [];

  if (startDateIso && endDateIso) {
    dateFilter += ' AND started_at >= ? AND started_at <= ?';
    params.push(startDateIso, endDateIso);
  } else if (startDateIso) {
    dateFilter += ' AND started_at >= ?';
    params.push(startDateIso);
  }

  const sessions = await db.getAllAsync<any>(
    `SELECT * FROM workout_sessions ${dateFilter} ORDER BY started_at ASC;`,
    params
  );

  let workoutCount = sessions.length;
  let totalDurationMinutes = 0;
  let workingSetsCount = 0;
  let totalReps = 0;
  let totalVolumeKg = 0;

  for (const s of sessions) {
    if (s.started_at && s.finished_at) {
      const diffMs = new Date(s.finished_at).getTime() - new Date(s.started_at).getTime();
      totalDurationMinutes += Math.round(Math.max(0, diffMs) / 60000);
    }

    const sets = await db.getAllAsync<any>(
      `SELECT s.* FROM sets s
       JOIN workout_session_exercises wse ON s.session_exercise_id = wse.id
       WHERE wse.session_id = ? AND s.completed = 1;`,
      [s.id]
    );

    for (const set of sets) {
      if (set.type !== 'WARMUP') {
        workingSetsCount++;
        totalReps += set.reps;
        totalVolumeKg += calculateSetVolume(set.type, set.weight_kg, set.reps);
      }
    }
  }

  // count distinct exercise max weight prs in time frame
  let prQuery = "SELECT COUNT(DISTINCT exercise_id) as count FROM personal_records WHERE record_type = 'MAX_WEIGHT'";
  const prParams: any[] = [];
  if (startDateIso) {
    prQuery += ' AND achieved_at >= ?';
    prParams.push(startDateIso);
  }
  if (endDateIso) {
    prQuery += ' AND achieved_at <= ?';
    prParams.push(endDateIso);
  }
  prQuery += ';';
  const prRow = await db.getFirstAsync<{ count: number }>(prQuery, prParams);
  const prCount = prRow ? prRow.count : 0;

  return {
    workoutCount,
    totalDurationMinutes,
    workingSetsCount,
    totalReps,
    totalVolumeKg: Math.round(totalVolumeKg),
    prCount,
  };
}

export async function getOverallWorkoutVolumeHistory(
  db: SQLite.SQLiteDatabase,
  startDateIso?: string
): Promise<ChartDataPoint[]> {
  let dateFilter = 'WHERE ws.is_active = 0';
  const params: any[] = [];
  if (startDateIso) {
    dateFilter += ' AND ws.started_at >= ?';
    params.push(startDateIso);
  }

  const sessions = await db.getAllAsync<any>(
    `SELECT ws.id, ws.started_at
     FROM workout_sessions ws
     ${dateFilter}
     ORDER BY ws.started_at ASC;`,
    params
  );

  const points: ChartDataPoint[] = [];

  for (const s of sessions) {
    const sets = await db.getAllAsync<any>(
      `SELECT s.weight_kg, s.reps, s.type
       FROM sets s
       JOIN workout_session_exercises wse ON s.session_exercise_id = wse.id
       WHERE wse.session_id = ? AND s.completed = 1;`,
      [s.id]
    );

    if (sets.length === 0) continue;

    let sessionVol = 0;
    for (const st of sets) {
      sessionVol += calculateSetVolume(st.type, st.weight_kg, st.reps);
    }

    const dateStr = new Date(s.started_at).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });

    points.push({
      date: dateStr,
      timestamp: new Date(s.started_at).getTime(),
      value: Math.round(sessionVol),
    });
  }

  return points;
}

export async function getPerformedExercises(
  db: SQLite.SQLiteDatabase
): Promise<Exercise[]> {
  const query = `
    SELECT e.*, COUNT(s.id) as set_count
    FROM exercises e
    JOIN workout_session_exercises wse ON e.id = wse.exercise_id
    JOIN sets s ON wse.id = s.session_exercise_id
    JOIN workout_sessions ws ON wse.session_id = ws.id
    WHERE s.completed = 1 AND ws.is_active = 0
    GROUP BY e.id
    ORDER BY set_count DESC, e.name ASC;
  `;
  const rows = await db.getAllAsync<any>(query);
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    primaryMuscle: r.primary_muscle,
    secondaryMuscles: r.secondary_muscles_json ? JSON.parse(r.secondary_muscles_json) : [],
    equipment: r.equipment,
    category: r.category,
    trackingType: r.tracking_type,
    notes: r.notes || undefined,
    archived: Boolean(r.archived),
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  }));
}

export async function getExerciseChartHistory(
  db: SQLite.SQLiteDatabase,
  exerciseId: string,
  metric: 'BEST_WEIGHT' | 'E1RM' | 'VOLUME'
): Promise<ChartDataPoint[]> {
  const sessions = await db.getAllAsync<any>(
    `SELECT ws.id, ws.started_at, wse.id as se_id
     FROM workout_sessions ws
     JOIN workout_session_exercises wse ON ws.id = wse.session_id
     WHERE wse.exercise_id = ? AND ws.is_active = 0
     ORDER BY ws.started_at ASC;`,
    [exerciseId]
  );

  const points: ChartDataPoint[] = [];

  for (const s of sessions) {
    const sets = await db.getAllAsync<any>(
      'SELECT * FROM sets WHERE session_exercise_id = ? AND completed = 1 ORDER BY set_number ASC;',
      [s.se_id]
    );

    if (sets.length === 0) continue;

    const dateStr = new Date(s.started_at).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
    const timestamp = new Date(s.started_at).getTime();

    if (metric === 'BEST_WEIGHT') {
      let maxW = 0;
      let maxSet = sets[0];
      for (const st of sets) {
        if (st.weight_kg > maxW) {
          maxW = st.weight_kg;
          maxSet = st;
        }
      }
      points.push({
        date: dateStr,
        timestamp,
        value: maxW,
        weightKg: maxW,
        reps: maxSet.reps,
      });
    } else if (metric === 'E1RM') {
      let maxE = 0;
      let maxSet = sets[0];
      for (const st of sets) {
        const e1rm = calculateE1RM(st.weight_kg, st.reps);
        if (e1rm > maxE) {
          maxE = e1rm;
          maxSet = st;
        }
      }
      points.push({
        date: dateStr,
        timestamp,
        value: maxE,
        weightKg: maxSet.weight_kg,
        reps: maxSet.reps,
        e1rm: maxE,
      });
    } else if (metric === 'VOLUME') {
      let vol = 0;
      for (const st of sets) {
        vol += calculateSetVolume(st.type, st.weight_kg, st.reps);
      }
      points.push({
        date: dateStr,
        timestamp,
        value: Math.round(vol),
      });
    }
  }

  return points;
}
