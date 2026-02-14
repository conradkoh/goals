import { CalendarClock } from 'lucide-react';
import { useState, useEffect } from 'react';

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
 *
 * Uses ISO week-based year and quarter for consistency:
 * - Year is the ISO week year (may differ from calendar year at year boundaries)
 * - Quarter is determined by week number (weeks 1-13 = Q1, etc.)
 */
export const JumpToCurrentButton = ({
  year,
  quarter,
  selectedWeek,
  selectedDay,
  onJumpToToday,
  className = '',
}: JumpToCurrentButtonProps) => {
  // Get current date information - includes ISO week year, week-based quarter, weekNumber, and weekday
  const currentDateInfo = useCurrentDateInfo();
  // Use ISO week year for year consistency
  const currentYear = currentDateInfo.weekYear;
  // Use ISO week-based quarter (determined by week number, not calendar month)
  const currentQuarter = currentDateInfo.weekQuarter;
  const currentWeekNumber = currentDateInfo.weekNumber;
  const currentDay = currentDateInfo.weekday;

  // Track if navigation is pending (button clicked but URL params not yet updated)
  const [isPending, setIsPending] = useState(false);

  // Check if we're already viewing today (same ISO week year, week-based quarter, week, AND day)
  const isViewingToday =
    year === currentYear &&
    quarter === currentQuarter &&
    selectedWeek === currentWeekNumber &&
    selectedDay === currentDay;

  // Reset pending state when props change to values different from target
  // This handles cases where user navigates away after clicking the button
  useEffect(() => {
    if (isPending && !isViewingToday) {
      // Check if we've reached the target destination
      const reachedTarget =
        year === currentYear &&
        quarter === currentQuarter &&
        selectedWeek === currentWeekNumber &&
        selectedDay === currentDay;

      if (reachedTarget) {
        setIsPending(false);
      }
    }
  }, [
    isPending,
    isViewingToday,
    year,
    quarter,
    selectedWeek,
    selectedDay,
    currentYear,
    currentQuarter,
    currentWeekNumber,
    currentDay,
  ]);

  // Don't show the button if we're already viewing today or navigation is pending
  if (isViewingToday || isPending) {
    return null;
  }

  const handleJumpToToday = () => {
    setIsPending(true);
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
