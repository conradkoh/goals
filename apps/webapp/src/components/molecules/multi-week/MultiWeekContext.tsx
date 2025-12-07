import { DateTime } from 'luxon';
import type React from 'react';
import { createContext, useContext, useMemo } from 'react';
import type { WeekData } from '@/hooks/useWeek';
import type { DayOfWeek } from '@/lib/constants';
import { generateISOWeeks } from '@/lib/date/iso-week';

// Define the context type
interface MultiWeekContextType {
  weeks: {
    weekNumber: number;
    year: number;
    quarter: number;
    weekData: WeekData;
  }[];
}

// Create the context with a default empty value
const MultiWeekContext = createContext<MultiWeekContextType | undefined>(undefined);

// Helper function to create a placeholder WeekData object for a week
const createPlaceholderWeekData = (weekNumber: number, year: number, quarter: number): WeekData => {
  // Calculate the Monday date for this week using Luxon for proper ISO week handling
  const mondayDate = DateTime.fromObject({
    weekYear: year,
    weekNumber: weekNumber,
  }).startOf('week');

  const mondayDateString = mondayDate.toFormat('yyyy-MM-dd');

  // Create the days array using Luxon for consistent date handling
  const days = Array(7)
    .fill(null)
    .map((_, i) => {
      const date = mondayDate.plus({ days: i });
      return {
        dayOfWeek: (i % 7) as DayOfWeek,
        date: date.toFormat('yyyy-MM-dd'),
        dateTimestamp: date.toMillis(),
        goals: [],
      };
    });

  // Create a proper WeekGoalsTree structure
  const tree = {
    quarterlyGoals: [],
    weekNumber: weekNumber,
    allGoals: [],
    stats: {
      totalTasks: 0,
      completedTasks: 0,
    },
  };

  return {
    weekLabel: `Week ${weekNumber}`,
    weekNumber,
    mondayDate: mondayDateString,
    days,
    tree,
    year,
    quarter,
  };
};

// Props for the MultiWeekGenerator component
interface MultiWeekGeneratorProps {
  startDate: Date;
  endDate: Date;
  children: React.ReactNode;
}

// The MultiWeekGenerator component that provides the context
export const MultiWeekGenerator: React.FC<MultiWeekGeneratorProps> = ({
  startDate,
  endDate,
  children,
}) => {
  // Create a unique key for the component based on dates
  const componentKey = useMemo(() => {
    return `${startDate.getTime()}-${endDate.getTime()}`;
  }, [startDate, endDate]);

  // Generate the weeks between the start and end dates using our ISO week utility
  const generatedWeeks = useMemo(() => {
    return generateISOWeeks(startDate, endDate);
  }, [startDate, endDate]);

  // Create initial placeholder data for each week
  const weeksWithData = useMemo(() => {
    return generatedWeeks.map((week) => ({
      ...week,
      weekData: createPlaceholderWeekData(week.weekNumber, week.year, week.quarter),
    }));
  }, [generatedWeeks]);

  // Create the context value
  const contextValue = useMemo(() => {
    return { weeks: weeksWithData };
  }, [weeksWithData]);

  return (
    <MultiWeekContext.Provider value={contextValue} key={componentKey}>
      {children}
    </MultiWeekContext.Provider>
  );
};

// Hook to use the MultiWeek context
export const useMultiWeek = (): MultiWeekContextType => {
  const context = useContext(MultiWeekContext);
  if (!context) {
    throw new Error('useMultiWeek must be used within a MultiWeekGenerator');
  }
  return context;
};
