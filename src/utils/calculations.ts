// math calculations for e1rm, set volume, unit conversion, and formatting

export const E1RM_REP_CUTOFF = 15;

/**
 * calculates estimated 1rep max using the epley formula: weight * (1 + reps / 30)
 * caps reps at E1RM_REP_CUTOFF (15) to maintain reliability
 */
export function calculateE1RM(weightKg: number, reps: number): number {
  if (weightKg <= 0 || reps <= 0 || reps > E1RM_REP_CUTOFF) {
    return 0;
  }
  if (reps === 1) {
    return weightKg;
  }
  return Number((weightKg * (1 + reps / 30)).toFixed(1));
}

/**
 * calculates volume for a set. warmups contribute 0 volume
 */
export function calculateSetVolume(type: string, weightKg: number, reps: number): number {
  if (type === 'WARMUP' || weightKg <= 0 || reps <= 0) {
    return 0;
  }
  return Number((weightKg * reps).toFixed(1));
}

/**
 * converts weight in kg to lb
 */
export function convertKgToLb(kg: number): number {
  return Number((kg * 2.2046226218).toFixed(1));
}

/**
 * converts weight in lb to kg
 */
export function convertLbToKg(lb: number): number {
  return Number((lb / 2.2046226218).toFixed(1));
}

/**
 * formats weight value based on selected unit preference
 */
export function formatWeight(kg: number, unit: 'kg' | 'lb'): string {
  if (unit === 'lb') {
    return `${convertKgToLb(kg)} lb`;
  }
  return `${kg} kg`;
}

/**
 * parses input weight in user's preferred unit back to kg
 */
export function parseWeightToKg(value: number, unit: 'kg' | 'lb'): number {
  if (unit === 'lb') {
    return convertLbToKg(value);
  }
  return value;
}
