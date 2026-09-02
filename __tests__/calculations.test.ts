// unit tests for calculation utilities (e1rm, set volume, unit conversion)

import { describe, test, expect } from '@jest/globals';
import {
  calculateE1RM,
  calculateSetVolume,
  convertKgToLb,
  convertLbToKg,
  E1RM_REP_CUTOFF,
} from '../src/utils/calculations';

describe('calculations utility', () => {
  test('calculateE1RM computes epley formula correctly', () => {
    // 60kg for 10 reps: 60 * (1 + 10/30) = 80kg
    expect(calculateE1RM(60, 10)).toBe(80);
    // 1 rep returns exact weight
    expect(calculateE1RM(100, 1)).toBe(100);
  });

  test('calculateE1RM respects rep cutoff of 15', () => {
    // reps > 15 return 0
    expect(calculateE1RM(60, 16)).toBe(0);
    expect(calculateE1RM(60, E1RM_REP_CUTOFF)).toBeGreaterThan(0);
  });

  test('calculateSetVolume ignores warmup sets', () => {
    expect(calculateSetVolume('WARMUP', 60, 10)).toBe(0);
    expect(calculateSetVolume('WORKING', 60, 10)).toBe(600);
    expect(calculateSetVolume('FAILURE', 60, 8)).toBe(480);
  });

  test('kg and lb conversions work roundtrip', () => {
    const kg = 100;
    const lb = convertKgToLb(kg);
    expect(lb).toBeCloseTo(220.5, 0);
    expect(convertLbToKg(lb)).toBeCloseTo(100, 0);
  });

  test('checkSetForPrs detects max set volume personal record', () => {
    const existingPrs: any[] = [
      {
        id: 'pr1',
        exerciseId: 'ex1',
        recordType: 'MAX_SET_VOLUME',
        value: 800,
        achievedAt: '2026-08-01T10:00:00.000Z',
      },
    ];

    // 90kg * 10 reps = 900kg volume > 800kg
    const completedSet: any = {
      id: 's1',
      sessionExerciseId: 'se1',
      setNumber: 1,
      type: 'WORKING',
      weightKg: 90,
      reps: 10,
      completed: true,
    };

    const { checkSetForPrs } = require('../src/utils/prDetector');
    const result = checkSetForPrs('ex1', completedSet, existingPrs);
    expect(result.isPr).toBe(true);
    const volPr = result.records.find((r: any) => r.type === 'MAX_SET_VOLUME');
    expect(volPr).toBeDefined();
    expect(volPr.value).toBe(900);
  });
});
