import React, {
  createContext,
  useContext,
  useMemo,
  useState,
  useCallback,
  useEffect,
} from 'react';
import { WeekData, useWeekWithoutDashboard } from '@/hooks/useWeek';
import { DayOfWeek } from '@/lib/constants';
import { generateISOWeeks } from '@/lib/date/iso-week';
import { DateTime } from 'luxon';

// Define the context type
interface MultiWeekContextType {
  weeks: {
    weekNumber: number;
    year: number;
    quarter: number;
    weekData: WeekData;
    isLoading: boolean;
  }[];
}

// Create the context with a default empty value
const MultiWeekContext = createContext<MultiWeekContextType | undefined>(
  undefined
);

// Helper function to create a placeholder WeekData object for a week
const createPlaceholderWeekData = (
  weekNumber: number,
  year: number,
  quarter: number
): WeekData => {
  // Calculate the Monday date for this week using Luxon for proper ISO week handling
  const mondayDate = DateTime.fromObject({
    weekYear: year,
    weekNumber: weekNumber,
  })
    .startOf('week')
    .toJSDate();

  const mondayDateString = mondayDate.toISOString().split('T')[0]; // Format as YYYY-MM-DD

  // Create the days array
  const days = Array(7)
    .fill(null)
    .map((_, i) => {
      const date = new Date(mondayDate.getTime() + i * 24 * 60 * 60 * 1000);
      return {
        dayOfWeek: (i % 7) as DayOfWeek,
        date: date.toISOString().split('T')[0], // Format as YYYY-MM-DD
        dateTimestamp: date.getTime(),
        goals: [],
      };
    });

  // Create a proper WeekGoalsTree structure
  const tree = {
    quarterlyGoals: [], // Empty array of quarterly goals
    weekNumber: weekNumber, // The week number
    allGoals: [], // Empty array of all goals
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
  };
};

// Component to fetch data for a single week
interface WeekDataFetcherProps {
  year: number;
  quarter: number;
  weekNumber: number;
  onDataFetched: (
    weekData: WeekData,
    year: number,
    quarter: number,
    weekNumber: number
  ) => void;
  onLoadingChange: (
    isLoading: boolean,
    year: number,
    quarter: number,
    weekNumber: number
  ) => void;
}

const WeekDataFetcher: React.FC<WeekDataFetcherProps> = ({
  year,
  quarter,
  weekNumber,
  onDataFetched,
  onLoadingChange,
}) => {
  // Fetch the week data
  const weekData = useWeekWithoutDashboard({
    year,
    quarter,
    week: weekNumber,
  });

  // Set loading state when data is being fetched
  React.useEffect(() => {
    // If weekData is undefined, we're still loading
    onLoadingChange(weekData === undefined, year, quarter, weekNumber);

    // When data is fetched, call the callback
    if (weekData) {
      onDataFetched(weekData, year, quarter, weekNumber);
    }
  }, [weekData, year, quarter, weekNumber, onDataFetched, onLoadingChange]);

  // This component doesn't render anything
  return null;
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
    console.log(
      'Regenerating weeks for',
      startDate.toISOString(),
      endDate.toISOString()
    );
    return generateISOWeeks(startDate, endDate);
  }, [startDate, endDate]);

  // Create initial placeholder data for each week
  const initialWeeksWithData = useMemo(() => {
    console.log(
      'Creating placeholder data for',
      generatedWeeks.length,
      'weeks'
    );
    return generatedWeeks.map((week) => ({
      ...week,
      weekData: createPlaceholderWeekData(
        week.weekNumber,
        week.year,
        week.quarter
      ),
      isLoading: true, // Initially all weeks are loading
    }));
  }, [generatedWeeks]);

  // State to store the weeks with data
  const [weeksWithData, setWeeksWithData] = useState(initialWeeksWithData);

  // IMPORTANT: Reset weeksWithData when initialWeeksWithData changes (which happens when startDate/endDate change)
  useEffect(() => {
    console.log('Resetting weeks with data due to date change');
    setWeeksWithData(initialWeeksWithData);
  }, [initialWeeksWithData]);

  // Function to update a specific week's data - memoized to prevent infinite loops
  const updateWeekData = useCallback(
    (
      newWeekData: WeekData,
      year: number,
      quarter: number,
      weekNumber: number
    ) => {
      setWeeksWithData((prevWeeks) => {
        return prevWeeks.map((week) => {
          if (
            week.year === year &&
            week.quarter === quarter &&
            week.weekNumber === weekNumber
          ) {
            return {
              ...week,
              weekData: newWeekData,
              isLoading: false, // Data is loaded
            };
          }
          return week;
        });
      });
    },
    []
  );

  // Function to update loading state for a specific week
  const updateLoadingState = useCallback(
    (isLoading: boolean, year: number, quarter: number, weekNumber: number) => {
      setWeeksWithData((prevWeeks) => {
        return prevWeeks.map((week) => {
          if (
            week.year === year &&
            week.quarter === quarter &&
            week.weekNumber === weekNumber
          ) {
            return {
              ...week,
              isLoading,
            };
          }
          return week;
        });
      });
    },
    []
  );

  // Create the context value
  const contextValue = useMemo(() => {
    return { weeks: weeksWithData };
  }, [weeksWithData]);

  // Add key to Provider to force re-mount when dates change
  return (
    <MultiWeekContext.Provider value={contextValue} key={componentKey}>
      {/* Render data fetchers for each week */}
      {generatedWeeks.map((week) => (
        <WeekDataFetcher
          key={`${week.year}-${week.quarter}-${week.weekNumber}`}
          year={week.year}
          quarter={week.quarter}
          weekNumber={week.weekNumber}
          onDataFetched={updateWeekData}
          onLoadingChange={updateLoadingState}
        />
      ))}
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
