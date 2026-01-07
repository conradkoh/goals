import { describe, expect, test } from 'vitest';

import { getFirstWeekOfQuarter, getQuarterWeeks, getWeeksInYear } from './getQuarterWeeks';

describe('Quarter Weeks Use Cases', () => {
  describe('getQuarterWeeks', () => {
    test('should return correct weeks for Q1 2025', () => {
      const { startWeek, endWeek, weeks } = getQuarterWeeks(2025, 1);
      expect(startWeek).toBe(1); // First week of 2025
      expect(endWeek).toBe(13); // Last week of Q1 2025
      expect(weeks).toHaveLength(13);
      expect(weeks).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13]);
    });

    test('should handle year boundary for Q4 2024 to Q1 2025', () => {
      const { startWeek, endWeek, weeks } = getQuarterWeeks(2024, 4);
      expect(startWeek).toBe(40); // Expected start week of Q4
      // Since Q4 2024 goes into 2025, we expect the end week to include weeks in 2025
      // This will vary by year but should include the proper transition
      expect(weeks).toContain(startWeek);
      expect(weeks).toContain(endWeek);
    });
  });

  describe('getFirstWeekOfQuarter', () => {
    test('should return correct first week for Q1 2025', () => {
      const result = getFirstWeekOfQuarter(2025, 1);
      expect(result.weekNumber).toBe(1);
      expect(result.year).toBe(2025);
    });

    test('should return correct first week for Q2 2025', () => {
      const result = getFirstWeekOfQuarter(2025, 2);
      expect(result.weekNumber).toBe(14);
      expect(result.year).toBe(2025);
    });
  });

  describe('getWeeksInYear', () => {
    test('should return 52 for regular years', () => {
      expect(getWeeksInYear(2025)).toBe(52);
    });

    test('should return 53 for years with 53 ISO weeks', () => {
      // 2020 is a year with 53 ISO weeks
      expect(getWeeksInYear(2020)).toBe(53);
    });
  });
});
