import React, {
  createContext,
  useContext,
  useMemo,
  useState,
  useCallback,
} from 'react';
import { WeekData, useWeekWithoutDashboard } from '@/hooks/useWeek';
import { DayOfWeek } from '@/lib/constants';
import { generateISOWeeks } from '@/lib/date/iso-week';

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
  // Calculate the Monday date for this week
  const firstDayOfYear = new Date(year, 0, 1);
  const dayOfWeek = firstDayOfYear.getDay(); // 0 = Sunday, 1 = Monday, etc.
  const daysToAdd = (weekNumber - 1) * 7 - (dayOfWeek - 1);

  // Create the Monday date for this week
  const mondayDate = new Date(year, 0, daysToAdd);
  const mondayDateString = mondayDate.toISOString().split('T')[0]; // Format as YYYY-MM-DD

  // Create the days array
  const days = Array(7)
    .fill(null)
    .map((_, i) => {
      const date = new Date(mondayDate);
      date.setDate(mondayDate.getDate() + i);
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
  // Generate the weeks between the start and end dates using our ISO week utility
  const generatedWeeks = useMemo(() => {
    return generateISOWeeks(startDate, endDate);
  }, [startDate, endDate]);

  // Create initial placeholder data for each week
  const initialWeeksWithData = useMemo(() => {
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

  return (
    <MultiWeekContext.Provider value={contextValue}>
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
