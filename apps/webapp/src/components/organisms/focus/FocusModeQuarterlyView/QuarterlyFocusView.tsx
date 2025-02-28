import React, { useMemo, memo } from 'react';
import { MultiWeekGenerator } from '../../../molecules/multi-week/MultiWeekContext';
import { MultiWeekLayout } from '../../../molecules/multi-week/MultiWeekLayout';

interface QuarterlyFocusViewProps {
  year?: number;
  quarter?: number;
}

export const QuarterlyFocusView = memo(
  ({
    year = new Date().getFullYear(),
    quarter = Math.floor(new Date().getMonth() / 3) + 1,
  }: QuarterlyFocusViewProps) => {
    // Calculate the start and end dates of the quarter
    const { startOfQuarter, endOfQuarter } = useMemo(() => {
      // Quarter is 1-based (1-4), but Date month is 0-based (0-11)
      const startMonth = (quarter - 1) * 3;
      const endMonth = startMonth + 2;

      // Create start date (first day of the first month of the quarter)
      const startDate = new Date(year, startMonth, 1);

      // Create end date (last day of the last month of the quarter)
      const endDate = new Date(year, endMonth + 1, 0);

      return {
        startOfQuarter: startDate,
        endOfQuarter: endDate,
      };
    }, [year, quarter]);

    return (
      <div className="w-full">
        <MultiWeekGenerator startDate={startOfQuarter} endDate={endOfQuarter}>
          <MultiWeekLayout />
        </MultiWeekGenerator>
      </div>
    );
  }
);

QuarterlyFocusView.displayName = 'QuarterlyFocusView';
