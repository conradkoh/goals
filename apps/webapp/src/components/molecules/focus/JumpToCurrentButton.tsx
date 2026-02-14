import { CalendarClock } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { useCurrentDateInfo } from '@/hooks/useCurrentDateTime';
import { useDashboard } from '@/hooks/useDashboard';
import type { DayOfWeek } from '@/lib/constants';

export interface JumpToCurrentButtonProps {
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

  // Read selected values directly from URL via useDashboard hook
  const { selectedYear, selectedQuarter, selectedWeek, selectedDayOfWeek } = useDashboard();

  // Check if we're already viewing today (same ISO week year, week-based quarter, week, AND day)
  const isViewingToday =
    selectedYear === currentYear &&
    selectedQuarter === currentQuarter &&
    selectedWeek === currentWeekNumber &&
    selectedDayOfWeek === currentDay;

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
