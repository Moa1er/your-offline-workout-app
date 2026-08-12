// progressive overload target advice evaluation

import { WorkoutSet } from '../types/workout';

export interface OverloadStatus {
  targetMet: boolean;
  message: string;
  recommendation?: string;
}

/**
 * evaluates completed working sets against template target rep range
 */
export function evaluateProgressiveOverload(
  workingSets: WorkoutSet[],
  repMin: number,
  repMax: number
): OverloadStatus {
  if (!workingSets || workingSets.length === 0) {
    return {
      targetMet: false,
      message: `Target rep range: ${repMin}-${repMax}`,
    };
  }

  const completedWorkingSets = workingSets.filter(
    (s) => s.completed && s.type !== 'WARMUP'
  );

  if (completedWorkingSets.length === 0) {
    return {
      targetMet: false,
      message: `Target rep range: ${repMin}-${repMax}`,
    };
  }

  // check if all planned working sets hit the top of the rep range
  const allHitMax = completedWorkingSets.every((s) => s.reps >= repMax);

  if (allHitMax) {
    return {
      targetMet: true,
      message: 'REP RANGE COMPLETED',
      recommendation: 'Consider increasing the weight next session.',
    };
  }

  return {
    targetMet: false,
    message: `Target: ${repMin}-${repMax} reps per set`,
    recommendation: 'Push for additional reps to hit top of target range.',
  };
}
