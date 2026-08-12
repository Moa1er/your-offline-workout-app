// unit tests for JSON backup validator

import { describe, test, expect } from '@jest/globals';
import { validateWorkoutBackup } from '../src/services/backupValidator';
import exampleImport from '../docs/example-import.json';

describe('backupValidator service', () => {
  test('validates valid example JSON backup successfully', () => {
    const result = validateWorkoutBackup(exampleImport);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
    expect(result.summary).toEqual({
      exerciseCount: 3,
      templateCount: 1,
      sessionCount: 2,
    });
  });

  test('rejects unsupported schema version', () => {
    const invalidData = { ...exampleImport, schemaVersion: 99 };
    const result = validateWorkoutBackup(invalidData);
    expect(result.valid).toBe(false);
    expect(result.errors[0]).toContain('Unsupported schema version 99');
  });

  test('rejects malformed exercises array', () => {
    const invalidData = { ...exampleImport, exercises: 'not an array' };
    const result = validateWorkoutBackup(invalidData);
    expect(result.valid).toBe(false);
    expect(result.errors[0]).toContain('Missing or invalid "exercises" array');
  });
});
