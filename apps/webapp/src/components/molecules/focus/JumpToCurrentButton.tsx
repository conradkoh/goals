import { CalendarClock } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { useCurrentDateInfo } from '@/hooks/useCurrentDateTime';
import type { DayOfWeek } from '@/lib/constants';

export interface JumpToCurrentButtonProps {
  /**
   * The year for the current view
   */
  year: number;

  /**
   * The quarter for the current view (1-4)
   */
  quarter: number;

  /**
   * The currently selected week number
   */
  selectedWeek: number;

  /**
   * The currently selected day
   */
  selectedDay: DayOfWeek;

  /**
   * Unified callback function - will be called with current year, quarter, week and day
   * This updates all views to the current day in the current week of the current quarter
   */
  onJumpToToday: (year: number, quarter: number, weekNumber: number, dayOfWeek: DayOfWeek) => void;

  /**
   * Optional CSS class name for additional styling
   */
  className?: string;
}

/**
 * A unified button that allows users to jump to today
 * Sets both the current week and current day across all views
 * Only appears when the user is not already viewing today
 */
export const JumpToCurrentButton = ({
  year,
  quarter,
  selectedWeek,
  selectedDay,
  onJumpToToday,
  className = '',
}: JumpToCurrentButtonProps) => {
  // Get current date information - includes year, quarter, weekNumber, and weekday
  const currentDateInfo = useCurrentDateInfo();
  const currentYear = currentDateInfo.year;
  const currentQuarter = currentDateInfo.quarter;
  const currentWeekNumber = currentDateInfo.weekNumber;
  const currentDay = currentDateInfo.weekday;

  // Check if we're already viewing today (same year, quarter, week, AND day)
  const isViewingToday =
    year === currentYear &&
    quarter === currentQuarter &&
    selectedWeek === currentWeekNumber &&
    selectedDay === currentDay;

  // Don't show the button if we're already viewing today
  if (isViewingToday) {
    return null;
  }

  const handleJumpToToday = () => {
    onJumpToToday(currentYear, currentQuarter, currentWeekNumber, currentDay);
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleJumpToToday}
      className={`text-muted-foreground hover:text-foreground ${className}`}
    >
      <CalendarClock className="h-4 w-4 mr-2" />
      Jump to Today
    </Button>
  );
};
