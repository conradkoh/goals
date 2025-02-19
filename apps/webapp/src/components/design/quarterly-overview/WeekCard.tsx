import { WeekProvider } from '@/hooks/useWeek';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Focus } from 'lucide-react';

interface WeekCardProps {
  weekLabel: string;
  mondayDate: string;
  weekNumber: number;
  isCurrentWeek?: boolean;
  children?: React.ReactNode;
  onFocusClick?: () => void;
}

export const WeekCard = ({
  weekLabel,
  mondayDate,
  weekNumber,
  isCurrentWeek,
  children,
  onFocusClick,
}: WeekCardProps) => {
  return (
    <WeekProvider weekNumber={weekNumber}>
      <div
        className={cn(
          'h-full flex flex-col border rounded-lg shadow bg-white',
          isCurrentWeek && 'ring-2 ring-blue-500'
        )}
      >
        <div className={cn('border-b p-4', isCurrentWeek && 'bg-blue-50')}>
          <div className="flex items-baseline justify-between">
            <div className="flex items-center gap-4">
              <p className="text-sm text-muted-foreground">{mondayDate}</p>
              {onFocusClick && (
                <Button
                  variant="ghost"
                  size="sm"
                  className={cn(
                    'text-muted-foreground hover:text-foreground',
                    isCurrentWeek && 'hover:bg-blue-100'
                  )}
                  onClick={onFocusClick}
                >
                  <Focus className="h-4 w-4 mr-2" />
                  <span className="text-sm">Focus Mode</span>
                </Button>
              )}
            </div>
            <div className="flex items-center gap-2">
              {isCurrentWeek && (
                <span className="text-xs font-medium text-blue-600 bg-blue-100 px-2 py-0.5 rounded">
                  Current Week
                </span>
              )}
              <h2 className="text-lg font-semibold">{weekLabel}</h2>
            </div>
          </div>
        </div>
        <div className="flex-1 p-4 space-y-6 overflow-y-auto">{children}</div>
      </div>
    </WeekProvider>
  );
};
