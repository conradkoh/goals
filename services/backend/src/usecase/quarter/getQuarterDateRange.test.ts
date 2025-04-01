import { describe, test, expect } from 'vitest';
import { getQuarterDateRange, getPreviousQuarter } from './getQuarterDateRange';

describe('Quarter Date Range Use Cases', () => {
  describe('getQuarterDateRange', () => {
    test('should return correct date range for Q1 2025', () => {
      const { startDate, endDate } = getQuarterDateRange(2025, 1);
      expect(startDate.toFormat('yyyy-MM-dd')).toBe('2025-01-01');
      expect(endDate.toFormat('yyyy-MM-dd')).toBe('2025-03-31');
    });

    test('should return correct date range for Q2 2025', () => {
      const { startDate, endDate } = getQuarterDateRange(2025, 2);
      expect(startDate.toFormat('yyyy-MM-dd')).toBe('2025-04-01');
      expect(endDate.toFormat('yyyy-MM-dd')).toBe('2025-06-30');
    });
  });

  describe('getPreviousQuarter', () => {
    test('should return Q4 of previous year when current is Q1', () => {
      const prevQ = getPreviousQuarter(2025, 1);
      expect(prevQ).toEqual({ year: 2024, quarter: 4 });
    });

    test('should return previous quarter of same year for Q2-Q4', () => {
      expect(getPreviousQuarter(2025, 2)).toEqual({ year: 2025, quarter: 1 });
      expect(getPreviousQuarter(2025, 3)).toEqual({ year: 2025, quarter: 2 });
      expect(getPreviousQuarter(2025, 4)).toEqual({ year: 2025, quarter: 3 });
    });
  });
});
