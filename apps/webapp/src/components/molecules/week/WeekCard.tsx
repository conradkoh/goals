import { PullGoalsButton } from '@/components/molecules/PullGoalsButton';
import { usePullGoals } from '@/hooks/usePullGoals';
import { type WeekData, WeekProvider } from '@/hooks/useWeek';
import { cn } from '@/lib/utils';

interface WeekCardProps {
  weekLabel: string;
  mondayDate: string;
  weekNumber: number;
  isCurrentWeek?: boolean;
  children?: React.ReactNode;
  weekData: WeekData;
  year: number;
  quarter: number;
}

export const WeekCard = ({
  weekLabel,
  mondayDate,
  weekNumber,
  isCurrentWeek = false,
  children,
  weekData,
  year,
  quarter,
}: WeekCardProps) => {
  // Pull goals hook - only used when viewing current week
  const {
    isPulling,
    handlePullGoals,
    dialog: pullGoalsDialog,
  } = usePullGoals({
    weekNumber,
    year,
    quarter,
  });

  return (
    <WeekProvider weekData={weekData}>
      <div
        className={cn(
          'h-full flex flex-col border rounded-lg shadow bg-white',
          isCurrentWeek && 'ring-2 ring-blue-500'
        )}
      >
        <div className={cn('border-b p-2 md:p-3 flex-shrink-0', isCurrentWeek && 'bg-blue-50')}>
          <div className="flex items-baseline justify-between">
            <div className="flex flex-col md:flex-row md:items-baseline md:gap-2">
              <h3 className="font-semibold">{weekLabel}</h3>
              <span className="text-xs md:text-sm text-gray-500">{mondayDate}</span>
            </div>
            {isCurrentWeek && (
              <div className="flex items-center gap-1 md:gap-2">
                <PullGoalsButton
                  isPulling={isPulling}
                  onPullGoals={handlePullGoals}
                  dialog={pullGoalsDialog}
                  iconOnly
                />
              </div>
            )}
          </div>
        </div>
        <div className="flex-1 p-2 md:p-3 space-y-3 md:space-y-4 min-h-0 overflow-y-auto">
          {children}
        </div>
      </div>
    </WeekProvider>
  );
};

WeekCard.displayName = 'WeekCard';
