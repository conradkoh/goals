import { Button } from '@/components/ui/button';
import { DayOfWeek } from '@/lib/constants';
import { CalendarClock } from 'lucide-react';
import { DateTime } from 'luxon';
import { useCurrentDateTime } from '@/hooks/useCurrentDateTime';
import { useQuarterWeekInfo } from '@/hooks/useQuarterWeekInfo';

export interface JumpToCurrentButtonProps {
  /**
   * The current view mode (daily or weekly)
   */
  viewMode: 'daily' | 'weekly';

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
   * The currently selected day (only relevant for daily view)
   */
  selectedDay: DayOfWeek;

  /**
   * Callback function for daily view - will be called with current week and day
   */
  onJumpToCurrentDay?: (weekNumber: number, dayOfWeek: DayOfWeek) => void;

  /**
   * Callback function for weekly view - will be called with current week
   */
  onJumpToCurrentWeek?: (weekNumber: number) => void;

  /**
   * Optional CSS class name for additional styling
   */
  className?: string;
}

/**
 * A button that allows users to jump to the current day or week
 * Only appears when the user is not already viewing the current day/week
 */
export const JumpToCurrentButton = ({
  viewMode,
  year,
  quarter,
  selectedWeek,
  selectedDay,
  onJumpToCurrentDay,
  onJumpToCurrentWeek,
  className = '',
}: JumpToCurrentButtonProps) => {
  // Get current date information
  const currentDateTime = useCurrentDateTime();
  const { currentWeekNumber } = useQuarterWeekInfo(
    year,
    quarter as 1 | 2 | 3 | 4
  );

  // Calculate if we're on the current view
  const today = currentDateTime;
  const currentDay = today.weekday as DayOfWeek;

  const isCurrentView =
    viewMode === 'daily'
      ? selectedWeek === currentWeekNumber && selectedDay === currentDay
      : selectedWeek === currentWeekNumber;

  // Don't show the button if we're already on the current view
  if (isCurrentView) {
    return null;
  }

  // Determine which callback to use based on view mode
  const handleJumpToCurrent = () => {
    if (viewMode === 'daily' && onJumpToCurrentDay) {
      onJumpToCurrentDay(currentWeekNumber, currentDay);
    } else if (viewMode === 'weekly' && onJumpToCurrentWeek) {
      onJumpToCurrentWeek(currentWeekNumber);
    }
  };

  // Don't render if the appropriate callback isn't provided
  if (
    (viewMode === 'daily' && !onJumpToCurrentDay) ||
    (viewMode === 'weekly' && !onJumpToCurrentWeek)
  ) {
    return null;
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleJumpToCurrent}
      className={`text-muted-foreground hover:text-foreground ${className}`}
    >
      <CalendarClock className="h-4 w-4 mr-2" />
      {viewMode === 'daily' ? 'Jump to Today' : 'Jump to Current Week'}
    </Button>
  );
};
