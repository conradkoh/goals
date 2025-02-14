import { WeekProvider } from '@/hooks/useWeek';
import { cn } from '@/lib/utils';

interface WeekCardProps {
  weekLabel: string;
  mondayDate: string;
  weekNumber: number;
  isCurrentWeek?: boolean;
  children?: React.ReactNode;
}

export const WeekCard = ({
  weekLabel,
  mondayDate,
  weekNumber,
  isCurrentWeek,
  children,
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
            <p className="text-sm text-muted-foreground">{mondayDate}</p>
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
