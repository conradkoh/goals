import { Button } from '@/components/ui/button';
import { KeyboardShortcut } from '@/components/ui/keyboard-shortcut';
import { X } from 'lucide-react';
import { WeekCardDailyGoals } from './WeekCardDailyGoals';

interface DailyGoalsFocusModeProps {
  weekNumber: number;
  onClose: () => void;
}

export const DailyGoalsFocusMode = ({
  weekNumber,
  onClose,
}: DailyGoalsFocusModeProps) => {
  return (
    <div className="fixed inset-0 bg-gray-50 z-50 overflow-auto">
      <KeyboardShortcut onEscPressed={onClose} />
      <div className="max-w-5xl mx-auto px-6 py-4">
        <div className="space-y-6">
          <div className="flex justify-between items-center border-b border-gray-200 pb-4">
            <h2 className="text-lg font-semibold">
              Focus Mode - Today's Goals
            </h2>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="h-8 w-8 text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          <div className="space-y-8">
            <div className="bg-white rounded-lg shadow-sm p-6">
              <WeekCardDailyGoals
                weekNumber={weekNumber}
                showOnlyToday={true}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
