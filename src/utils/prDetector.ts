// pr detection logic for sets and exercise metrics

import { PersonalRecord, WorkoutSet } from '../types/workout';
import { calculateE1RM } from './calculations';

export interface PrDetectionResult {
  isPr: boolean;
  records: {
    type: 'MAX_WEIGHT' | 'MAX_REPS_AT_WEIGHT' | 'MAX_E1RM';
    value: number;
    description: string;
  }[];
}

/**
 * compares a newly completed set against existing personal records for an exercise
 */
export function checkSetForPrs(
  exerciseId: string,
  set: WorkoutSet,
  existingPrs: PersonalRecord[]
): PrDetectionResult {
  if (!set.completed || set.type === 'WARMUP' || set.weightKg <= 0 || set.reps <= 0) {
    return { isPr: false, records: [] };
  }

  const exercisePrs = existingPrs.filter((pr) => pr.exerciseId === exerciseId);
  const detectedPrs: {
    type: 'MAX_WEIGHT' | 'MAX_REPS_AT_WEIGHT' | 'MAX_E1RM';
    value: number;
    description: string;
  }[] = [];

  // 1. check max weight record
  const maxWeightPr = exercisePrs.find((p) => p.recordType === 'MAX_WEIGHT');
  const currentMaxWeight = maxWeightPr ? maxWeightPr.value : 0;
  if (set.weightKg > currentMaxWeight) {
    detectedPrs.push({
      type: 'MAX_WEIGHT',
      value: set.weightKg,
      description: `Heaviest Weight: ${set.weightKg} kg`,
    });
  }

  // 2. check max reps at this specific weight
  const weightRepsPrs = exercisePrs.filter((p) => p.recordType === 'MAX_REPS_AT_WEIGHT');
  const matchingWeightPr = weightRepsPrs.find((p) => p.weightKg === set.weightKg);
  const currentMaxRepsAtWeight = matchingWeightPr ? matchingWeightPr.reps || 0 : 0;
  if (set.reps > currentMaxRepsAtWeight) {
    detectedPrs.push({
      type: 'MAX_REPS_AT_WEIGHT',
      value: set.reps,
      description: `Max Reps at ${set.weightKg} kg: ${set.reps} reps`,
    });
  }

  // 3. check max e1rm
  const e1rmPr = exercisePrs.find((p) => p.recordType === 'MAX_E1RM');
  const currentMaxE1rm = e1rmPr ? e1rmPr.value : 0;
  const setE1rm = calculateE1RM(set.weightKg, set.reps);
  if (setE1rm > 0 && setE1rm > currentMaxE1rm) {
    detectedPrs.push({
      type: 'MAX_E1RM',
      value: setE1rm,
      description: `Best e1RM: ${setE1rm} kg`,
    });
  }

  return {
    isPr: detectedPrs.length > 0,
    records: detectedPrs,
  };
}
