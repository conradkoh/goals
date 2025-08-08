import React from 'react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Button } from '@/components/ui/button';
import {
  MoreVertical,
  History,
  ArrowDownToLine,
  ArrowRightLeft,
  MoveHorizontal,
} from 'lucide-react';
import { DayOfWeek } from '@services/backend/src/constants';
import { cn } from '@/lib/utils';
import { useCurrentDateInfo } from '@/hooks/useCurrentDateTime';

interface WeekActionMenuProps {
  isDisabled?: boolean;
  isFirstWeek?: boolean;
  isMovingTasks?: boolean;
  tooltipContent?: string;
  handlePreviewTasks: (dayOfWeek?: DayOfWeek) => void;
  buttonSize?: 'default' | 'sm' | 'lg' | 'icon';
  buttonVariant?:
    | 'default'
    | 'destructive'
    | 'outline'
    | 'secondary'
    | 'ghost'
    | 'link';
  align?: 'start' | 'center' | 'end';
  className?: string;
  showLabel?: boolean;
}

export const WeekActionMenu = React.memo(
  ({
    isDisabled = false,
    isFirstWeek = false,
    isMovingTasks = false,
    tooltipContent = "Can't pull from last non-empty week",
    handlePreviewTasks,
    buttonSize = 'icon',
    buttonVariant = 'ghost',
    align = 'end',
    className,
    showLabel = false,
  }: WeekActionMenuProps) => {
  // Use a hook that updates only once a day (at midnight) to avoid excessive rerenders
  const { weekday, weekdayLong } = useCurrentDateInfo();
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant={buttonVariant}
            size={buttonSize}
            disabled={isDisabled}
            className={cn(
              'text-muted-foreground hover:text-foreground',
              className
            )}
          >
            {showLabel ? (
              <>
                <ArrowDownToLine className="h-4 w-4 mr-2" />
                Pull from Last Non-Empty Week
              </>
            ) : (
              <MoreVertical className="h-4 w-4" />
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align={align}
          sideOffset={5}
          className="z-50 max-h-[70vh] overflow-y-auto"
        >
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
                          from last non-empty week
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
            <>
              <DropdownMenuLabel className="font-semibold px-3 py-2">
                Pull from Last Non-Empty Week
              </DropdownMenuLabel>
              <DropdownMenuSeparator />

              <DropdownMenuItem
                disabled={isFirstWeek || isMovingTasks}
                onClick={() => {
                  if (!isFirstWeek && !isMovingTasks) {
                    handlePreviewTasks(DayOfWeek.MONDAY);
                  }
                }}
                className="flex items-center"
              >
                <MoveHorizontal className="mr-2 h-4 w-4 flex-shrink-0" />
                <span className="text-sm">
                  To first day of the week (Monday)
                </span>
              </DropdownMenuItem>

              <DropdownMenuItem
                disabled={isFirstWeek || isMovingTasks}
                onClick={() => {
                  if (!isFirstWeek && !isMovingTasks) {
                    handlePreviewTasks(undefined);
                  }
                }}
                className="flex items-center"
              >
                <ArrowRightLeft className="mr-2 h-4 w-4 flex-shrink-0" />
                <span className="text-sm">Preserve day of week</span>
              </DropdownMenuItem>

              <DropdownMenuItem
                disabled={isFirstWeek || isMovingTasks}
                onClick={() => {
                  if (!isFirstWeek && !isMovingTasks) {
                    // Pull to today's weekday using a stable, daily-updating source
                    handlePreviewTasks(weekday);
                  }
                }}
                className="flex items-center"
              >
                <ArrowDownToLine className="mr-2 h-4 w-4 flex-shrink-0" />
                <span className="text-sm">To today ({weekdayLong})</span>
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }
);
