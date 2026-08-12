// unit tests for absolute timestamp rest timer math

import { describe, test, expect } from '@jest/globals';
import {
  calculateRemainingSeconds,
  formatTimerSeconds,
} from '../src/utils/timer';

describe('timer utility', () => {
  test('rest timer remaining seconds calculated correctly with timestamps', () => {
    const startMs = 1000000;
    const durationSec = 150;
    const timer = {
      startedAt: startMs,
      endsAt: startMs + durationSec * 1000,
      durationSeconds: durationSec,
      type: 'SET_REST' as const,
    };

    // test halfway point (75 seconds later)
    const midWayMs = startMs + 75 * 1000;
    expect(calculateRemainingSeconds(timer.endsAt, midWayMs)).toBe(75);

    // test after expiry
    const afterExpiryMs = startMs + 160 * 1000;
    expect(calculateRemainingSeconds(timer.endsAt, afterExpiryMs)).toBe(0);
  });

  test('formatTimerSeconds formats seconds into MM:SS', () => {
    expect(formatTimerSeconds(150)).toBe('02:30');
    expect(formatTimerSeconds(5)).toBe('00:05');
    expect(formatTimerSeconds(0)).toBe('00:00');
  });
});
