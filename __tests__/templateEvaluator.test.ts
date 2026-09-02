// unit tests for evidence-based template evaluation and recommendations

import { describe, test, expect } from '@jest/globals';
import { evaluateTemplate, isCompoundMovement } from '../src/utils/templateEvaluator';
import { TemplateExercise } from '../src/types/workout';

describe('template evaluator utility', () => {
  test('returns 0 score and warning for empty template', () => {
    const result = evaluateTemplate([], 'Empty');
    expect(result.overallScore).toBe(0);
    expect(result.letterGrade).toBe('D');
    expect(result.improvements.length).toBeGreaterThan(0);
  });

  test('correctly identifies compound vs isolation movements', () => {
    const benchPress: TemplateExercise = {
      exerciseId: 'ex1',
      exerciseName: 'Barbell Bench Press',
      order: 1,
      targetSets: 3,
      targetReps: 8,
      restBetweenSetsSeconds: 150,
      restAfterExerciseSeconds: 120,
      category: 'HORIZONTAL_PUSH',
    };
    expect(isCompoundMovement(benchPress)).toBe(true);

    const bicepCurl: TemplateExercise = {
      exerciseId: 'ex2',
      exerciseName: 'Dumbbell Bicep Curl',
      order: 2,
      targetSets: 3,
      targetReps: 12,
      restBetweenSetsSeconds: 60,
      restAfterExerciseSeconds: 60,
      category: 'ELBOW_FLEXION',
    };
    expect(isCompoundMovement(bicepCurl)).toBe(false);
  });

  test('awards high score for well-balanced routine with optimal rest and volume', () => {
    const routine: TemplateExercise[] = [
      {
        exerciseId: 'ex1',
        exerciseName: 'Barbell Bench Press',
        primaryMuscle: 'CHEST',
        category: 'HORIZONTAL_PUSH',
        order: 1,
        targetSets: 4,
        targetReps: 8,
        restBetweenSetsSeconds: 150,
        restAfterExerciseSeconds: 120,
      },
      {
        exerciseId: 'ex2',
        exerciseName: 'Incline Dumbbell Press',
        primaryMuscle: 'CHEST',
        category: 'HORIZONTAL_PUSH',
        order: 2,
        targetSets: 3,
        targetReps: 10,
        restBetweenSetsSeconds: 120,
        restAfterExerciseSeconds: 120,
      },
      {
        exerciseId: 'ex3',
        exerciseName: 'Barbell Bent Over Row',
        primaryMuscle: 'BACK',
        category: 'HORIZONTAL_PULL',
        order: 3,
        targetSets: 4,
        targetReps: 8,
        restBetweenSetsSeconds: 150,
        restAfterExerciseSeconds: 120,
      },
      {
        exerciseId: 'ex4',
        exerciseName: 'Tricep Rope Pushdown',
        primaryMuscle: 'TRICEPS',
        category: 'ELBOW_EXTENSION',
        order: 4,
        targetSets: 3,
        targetReps: 12,
        restBetweenSetsSeconds: 75,
        restAfterExerciseSeconds: 60,
      },
    ];

    const result = evaluateTemplate(routine, 'Upper A');
    expect(result.overallScore).toBeGreaterThanOrEqual(85);
    expect(['S', 'A']).toContain(result.letterGrade);
    expect(result.strengths.length).toBeGreaterThan(0);
  });

  test('detects junk volume when single muscle exceeds 10 sets', () => {
    const excessiveChestRoutine: TemplateExercise[] = [
      {
        exerciseId: 'ex1',
        exerciseName: 'Bench Press',
        primaryMuscle: 'CHEST',
        category: 'HORIZONTAL_PUSH',
        order: 1,
        targetSets: 5,
        targetReps: 8,
        restBetweenSetsSeconds: 150,
        restAfterExerciseSeconds: 120,
      },
      {
        exerciseId: 'ex2',
        exerciseName: 'Incline Press',
        primaryMuscle: 'CHEST',
        category: 'HORIZONTAL_PUSH',
        order: 2,
        targetSets: 4,
        targetReps: 10,
        restBetweenSetsSeconds: 120,
        restAfterExerciseSeconds: 120,
      },
      {
        exerciseId: 'ex3',
        exerciseName: 'Cable Chest Fly',
        primaryMuscle: 'CHEST',
        category: 'HORIZONTAL_PUSH',
        order: 3,
        targetSets: 4,
        targetReps: 12,
        restBetweenSetsSeconds: 60,
        restAfterExerciseSeconds: 60,
      },
    ];

    const result = evaluateTemplate(excessiveChestRoutine, 'Chest Annihilation');
    const junkVolWarning = result.improvements.find((i) => i.id === 'vol_CHEST');
    expect(junkVolWarning).toBeDefined();
    expect(junkVolWarning?.severity).toBe('WARNING');
    expect(junkVolWarning?.citation).toContain('Heaselgrave');
  });

  test('flags short rest on heavy compound lift', () => {
    const shortRestRoutine: TemplateExercise[] = [
      {
        exerciseId: 'ex1',
        exerciseName: 'Barbell Back Squat',
        primaryMuscle: 'QUADS',
        category: 'HORIZONTAL_PUSH',
        order: 1,
        targetSets: 4,
        targetReps: 6,
        restBetweenSetsSeconds: 45, // very short rest for heavy squat!
        restAfterExerciseSeconds: 60,
      },
    ];

    const result = evaluateTemplate(shortRestRoutine, 'Leg Day');
    const restWarning = result.improvements.find((i) => i.type === 'REST');
    expect(restWarning).toBeDefined();
    expect(restWarning?.message).toContain('3-minute');
    expect(restWarning?.citation).toContain('Schoenfeld');
  });
});
