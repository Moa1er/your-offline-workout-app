import { describe, it, expect, jest } from '@jest/globals';
import { parseCsvString, parseHevyDate, normalizeExerciseName } from '../src/services/hevyImporter';

jest.mock('expo-document-picker', () => ({
  getDocumentAsync: jest.fn(),
}));

jest.mock('expo-file-system', () => ({
  File: class {
    get exists() {
      return false;
    }
    get uri() {
      return 'file:///test.csv';
    }
    async text() {
      return '';
    }
  },
  Paths: {
    cache: {},
    document: {},
  },
}));

jest.mock('expo-asset', () => ({
  Asset: {
    fromModule: jest.fn(() => ({
      downloadAsync: jest.fn(),
      localUri: 'file:///test/workout_data.csv',
    })),
  },
}));

describe('hevyImporter utils', () => {
  it('parses CSV string with quoted fields and commas', () => {
    const csv = `"title","start_time","exercise_title"\n"Day UpperBody","12 Jul 2026, 10:10","Lat Pulldown (Cable)"\n"Day LowerBody","10 Jul 2026, 09:00","Squat (Barbell)"`;
    const rows = parseCsvString(csv);
    expect(rows.length).toBe(3);
    expect(rows[0]).toEqual(['title', 'start_time', 'exercise_title']);
    expect(rows[1]).toEqual(['Day UpperBody', '12 Jul 2026, 10:10', 'Lat Pulldown (Cable)']);
    expect(rows[2]).toEqual(['Day LowerBody', '10 Jul 2026, 09:00', 'Squat (Barbell)']);
  });

  it('parses Hevy date formats correctly', () => {
    const dateStr = '12 Jul 2026, 10:10';
    const parsed = parseHevyDate(dateStr);
    expect(parsed).toContain('2026-07-12');
  });

  it('normalizes exercise names matching seed exercises and Hevy titles', () => {
    expect(normalizeExerciseName('Lat Pulldown (Cable)')).toBe('lat pulldown');
    expect(normalizeExerciseName('Lat Pulldown - Cable')).toBe('lat pulldown');
    expect(normalizeExerciseName('Chest Press (Machine)')).toBe('chest press');
    expect(normalizeExerciseName('Chest Press - Machine')).toBe('chest press');
  });
});
