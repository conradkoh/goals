import { DateTime } from 'luxon';
import { useEffect, useState } from 'react';
import type { DayOfWeek } from '@/lib/constants';

// Core hook that updates only when the day changes (at midnight)
export const useCurrentDate = () => {
  const [currentDate, setCurrentDate] = useState(() => DateTime.now().startOf('day'));

  useEffect(() => {
    const updateDate = () => {
      setCurrentDate(DateTime.now().startOf('day'));
    };

    // Calculate milliseconds until next day
    const now = DateTime.now();
    const tomorrow = now.plus({ days: 1 }).startOf('day');
    const msUntilMidnight = tomorrow.toMillis() - now.toMillis();

    // Set initial timeout for midnight, then update daily
    const initialTimeout = setTimeout(() => {
      updateDate();

      // Set up daily interval after first midnight
      const dailyInterval = setInterval(updateDate, 24 * 60 * 60 * 1000);

      return () => clearInterval(dailyInterval);
    }, msUntilMidnight);

    return () => clearTimeout(initialTimeout);
  }, []);

  return currentDate;
};

// Targeted hook for current weekday (updates daily)
export const useCurrentWeekday = (): DayOfWeek => {
  const currentDate = useCurrentDate();
  return currentDate.weekday as DayOfWeek;
};

// Targeted hook for current week info (updates daily)
export const useCurrentWeekInfo = () => {
  const currentDate = useCurrentDate();
  return {
    weekNumber: currentDate.weekNumber,
    year: currentDate.year,
    weekday: currentDate.weekday as DayOfWeek,
  };
};

// Targeted hook for current date info (updates daily)
export const useCurrentDateInfo = () => {
  const currentDate = useCurrentDate();
  return {
    year: currentDate.year,
    month: currentDate.month,
    monthLong: currentDate.monthLong,
    day: currentDate.day,
    weekdayLong: currentDate.weekdayLong,
    weekday: currentDate.weekday as DayOfWeek,
    quarter: Math.ceil(currentDate.month / 3) as 1 | 2 | 3 | 4,
    weekNumber: currentDate.weekNumber,
  };
};

// Legacy hook for backward compatibility - now uses daily updates
export const useCurrentDateTime = () => {
  const currentDate = useCurrentDate();
  // Return a DateTime object that represents the current day
  // This maintains the same API but updates daily instead of minutely
  return currentDate;
};
