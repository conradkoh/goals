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

export const WeekActionMenu = ({
  isDisabled = false,
  isFirstWeek = false,
  isMovingTasks = false,
  tooltipContent = "Can't pull from previous week",
  handlePreviewTasks,
  buttonSize = 'icon',
  buttonVariant = 'ghost',
  align = 'end',
  className,
  showLabel = false,
}: WeekActionMenuProps) => {
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
              Pull from Previous Week
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
          <>
            <DropdownMenuLabel className="font-semibold px-3 py-2">
              Pull from Previous Week
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
              <span className="text-sm">To first day of the week (Monday)</span>
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
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
