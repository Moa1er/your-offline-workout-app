// absolute timestamp timer utilities for rest periods and active session duration

export interface ActiveTimerState {
  startedAt: number; // epoch ms
  endsAt: number; // epoch ms
  durationSeconds: number;
  exerciseName?: string;
  type: 'SET_REST' | 'EXERCISE_REST';
}

/**
 * creates new rest timer state using absolute timestamp endsAt
 */
export function createRestTimer(
  durationSeconds: number,
  type: 'SET_REST' | 'EXERCISE_REST',
  exerciseName?: string
): ActiveTimerState {
  const now = Date.now();
  return {
    startedAt: now,
    endsAt: now + durationSeconds * 1000,
    durationSeconds,
    exerciseName,
    type,
  };
}

/**
 * calculates remaining time in seconds from target endsAt timestamp
 */
export function calculateRemainingSeconds(endsAt: number, nowMs: number = Date.now()): number {
  const remainingMs = endsAt - nowMs;
  if (remainingMs <= 0) {
    return 0;
  }
  return Math.ceil(remainingMs / 1000);
}

/**
 * parses date strings from sqlite or iso safely into epoch milliseconds
 */
export function parseIsoDateMs(dateStr?: string | null): number {
  if (!dateStr) return Date.now();
  let normalized = dateStr.trim();
  if (normalized.includes(' ') && !normalized.includes('T')) {
    normalized = normalized.replace(' ', 'T') + (normalized.endsWith('Z') ? '' : 'Z');
  }
  const ms = new Date(normalized).getTime();
  if (isNaN(ms)) {
    const fallback = new Date(dateStr).getTime();
    return isNaN(fallback) ? Date.now() : fallback;
  }
  return ms;
}

/**
 * calculates total elapsed time formatted as string (e.g. 1h 04m or 42:17)
 */
export function calculateElapsedTime(startedAtIso: string, finishedAtIso?: string | null): string {
  const start = parseIsoDateMs(startedAtIso);
  const end = finishedAtIso ? parseIsoDateMs(finishedAtIso) : Date.now();
  const diffMs = Math.max(0, end - start);
  const totalSeconds = Math.floor(diffMs / 1000);

  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}h ${minutes.toString().padStart(2, '0')}m`;
  }
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

/**
 * formats remaining rest seconds as MM:SS
 */
export function formatTimerSeconds(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}
