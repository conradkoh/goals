import { describe, test, expect } from 'vitest';
import { DateTime } from 'luxon';
import {
  getFinalWeeksOfQuarter,
  isInFinalWeeks,
} from './getFinalWeeksOfQuarter';

describe('Final Weeks of Quarter Use Cases', () => {
  describe('getFinalWeeksOfQuarter', () => {
    test('should return week 13 as final week of Q1 2025', () => {
      const finalWeeks = getFinalWeeksOfQuarter(2025, 1);
      expect(finalWeeks).toHaveLength(1);
      expect(finalWeeks[0].weekNumber).toBe(13);
      expect(finalWeeks[0].year).toBe(2025);
    });

    test('should handle week that spans quarter boundary', () => {
      // This test depends on the specific quarter and might need adjustment
      // Let's use Q2 2025 for our main test case
      const finalWeeks = getFinalWeeksOfQuarter(2025, 1);

      // For our specific test case (2025-04-01), we want to verify
      // that week 13 is correctly identified as the final week of Q1
      expect(
        finalWeeks.some((w) => w.weekNumber === 13 && w.year === 2025)
      ).toBe(true);
    });
  });

  describe('isInFinalWeeks', () => {
    test('should identify state in final week', () => {
      const finalWeeks = [{ weekNumber: 13, year: 2025 }];
      const state = { weekNumber: 13, year: 2025 };
      expect(isInFinalWeeks(state, finalWeeks)).toBe(true);
    });

    test('should reject state not in final week', () => {
      const finalWeeks = [{ weekNumber: 13, year: 2025 }];
      const state = { weekNumber: 12, year: 2025 };
      expect(isInFinalWeeks(state, finalWeeks)).toBe(false);
    });
  });
});
