import { CalendarClock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useCurrentWeekInfo } from '@/hooks/useCurrentDateTime';
import { useQuarterWeekInfo } from '@/hooks/useQuarterWeekInfo';
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
   * Unified callback function - will be called with current week and day
   * This updates all views to the current day in the current week
   */
  onJumpToToday: (weekNumber: number, dayOfWeek: DayOfWeek) => void;

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
  // Get current date information
  const { weekday: currentDay } = useCurrentWeekInfo();
  const { currentWeekNumber: quarterCurrentWeekNumber } = useQuarterWeekInfo(
    year,
    quarter as 1 | 2 | 3 | 4
  );

  // Check if we're already viewing today (both current week AND current day)
  const isViewingToday = selectedWeek === quarterCurrentWeekNumber && selectedDay === currentDay;

  // Don't show the button if we're already viewing today
  if (isViewingToday) {
    return null;
  }

  const handleJumpToToday = () => {
    onJumpToToday(quarterCurrentWeekNumber, currentDay);
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
