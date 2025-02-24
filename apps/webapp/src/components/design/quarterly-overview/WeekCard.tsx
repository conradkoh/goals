import { WeekData, WeekProviderWithoutDashboard } from '@/hooks/useWeek';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Focus, History, MoreVertical } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useMoveGoalsForWeek } from '@/hooks/useMoveGoalsForWeek';

interface WeekCardProps {
  weekLabel: string;
  mondayDate: string;
  weekNumber: number;
  isCurrentWeek?: boolean;
  children?: React.ReactNode;
  onFocusClick?: () => void;
  weekData: WeekData;
  year: number;
  quarter: number;
}

export const WeekCard = ({
  weekLabel,
  mondayDate,
  weekNumber,
  isCurrentWeek,
  children,
  onFocusClick,
  weekData,
  year,
  quarter,
}: WeekCardProps) => {
  const { isFirstWeek, isMovingTasks, handlePreviewTasks, dialog } =
    useMoveGoalsForWeek({
      weekNumber,
      year,
      quarter,
    });

  const isDisabled = isFirstWeek || isMovingTasks;
  const tooltipContent = isFirstWeek
    ? 'Cannot pull goals from previous week as this is the first week of the quarter'
    : isMovingTasks
    ? 'Moving tasks...'
    : null;

  return (
    <WeekProviderWithoutDashboard weekData={weekData}>
      <div
        className={cn(
          'h-full flex flex-col border rounded-lg shadow bg-white',
          isCurrentWeek && 'ring-2 ring-blue-500'
        )}
      >
        <div
          className={cn(
            'border-b p-4 flex-shrink-0',
            isCurrentWeek && 'bg-blue-50'
          )}
        >
          <div className="flex items-baseline justify-between">
            <div className="flex items-baseline gap-2">
              <h3 className="font-semibold">{weekLabel}</h3>
              <span className="text-sm text-gray-500">{mondayDate}</span>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={onFocusClick}
                title="Focus Mode"
              >
                <Focus className="h-4 w-4" />
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {isDisabled ? (
                    <TooltipProvider delayDuration={0}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="w-full cursor-not-allowed">
                            <DropdownMenuItem
                              className="cursor-not-allowed opacity-50"
                              disabled
                            >
                              <History className="mr-2 h-4 w-4" />
                              <div className="flex flex-col w-full items-center">
                                <span>Pull Incomplete</span>
                                <span className="text-gray-500 text-xs">
                                  from previous week
                                </span>
                              </div>
                            </DropdownMenuItem>
                          </div>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>{tooltipContent}</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  ) : (
                    <DropdownMenuItem
                      className="cursor-pointer"
                      onClick={handlePreviewTasks}
                    >
                      <History className="mr-2 h-4 w-4" />
                      <div className="flex flex-col w-full items-center">
                        <span>Pull Incomplete</span>
                        <span className="text-gray-500 text-xs">
                          from previous week
                        </span>
                      </div>
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
        <div className="flex-1 p-4 space-y-6 min-h-0">{children}</div>
      </div>

      {dialog}
    </WeekProviderWithoutDashboard>
  );
};
