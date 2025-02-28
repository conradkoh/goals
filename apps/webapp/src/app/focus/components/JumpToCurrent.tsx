import { ViewMode } from '@/app/focus/page.constants';
import { Button } from '@/components/ui/button';
import { DayOfWeek } from '@/lib/constants';
import { CalendarClock } from 'lucide-react';
import { DateTime } from 'luxon';

interface JumpToCurrentButtonProps {
  viewMode: ViewMode;
  selectedWeek: number;
  selectedDay: DayOfWeek;
  currentWeekNumber: number;
  isCurrentQuarter: boolean;
  onJumpToCurrent: () => void;
}

export const JumpToCurrentButton = ({
  viewMode,
  selectedWeek,
  selectedDay,
  currentWeekNumber,
  isCurrentQuarter,
  onJumpToCurrent,
}: JumpToCurrentButtonProps) => {
  // Calculate if we're on the current view
  const today = DateTime.now();
  const isCurrentView =
    viewMode === 'daily'
      ? selectedWeek === currentWeekNumber && selectedDay === today.weekday
      : viewMode === 'weekly'
      ? selectedWeek === currentWeekNumber
      : false; // For quarterly view, we don't have a concept of "current" in this component

  // Don't show the button for quarterly view or if we're already on the current view
  if (!isCurrentQuarter || isCurrentView || viewMode === 'quarterly') {
    return null;
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={onJumpToCurrent}
      className="text-muted-foreground hover:text-foreground"
    >
      <CalendarClock className="h-4 w-4 mr-2" />
      {viewMode === 'daily' ? 'Jump to Today' : 'Jump to Current Week'}
    </Button>
  );
};
