import { ArrowDownToLine, MoreVertical } from 'lucide-react';
import React, { type ReactElement } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

export interface DailyWeeklyActionMenuProps {
  /** Whether the menu is disabled */
  isDisabled?: boolean;
  /** Whether goals are currently being pulled */
  isPulling?: boolean;
  /** Whether pull goals should be shown (e.g., only when viewing current day/week) */
  showPullGoals?: boolean;
  /** Handler to trigger pull goals preview */
  onPullGoals: () => Promise<void>;
  /** The dialog element for the pull goals confirmation */
  pullGoalsDialog: ReactElement;
  /** Tooltip content when disabled */
  tooltipContent?: string;
  /** Button size */
  buttonSize?: 'default' | 'sm' | 'icon';
  /** Button variant */
  buttonVariant?: 'default' | 'ghost' | 'outline';
  /** Dropdown alignment */
  align?: 'start' | 'center' | 'end';
  /** Additional className */
  className?: string;
  /** Custom menu icon */
  menuIcon?: React.ReactNode;
}

export const DailyWeeklyActionMenu = React.memo(
  ({
    isDisabled = false,
    isPulling = false,
    showPullGoals = true,
    onPullGoals,
    pullGoalsDialog,
    tooltipContent = 'Not viewing current day/week',
    buttonSize = 'icon',
    buttonVariant = 'ghost',
    align = 'end',
    className,
    menuIcon,
  }: DailyWeeklyActionMenuProps) => {
    // Determine if the menu trigger should be disabled
    const isMenuDisabled = isDisabled || isPulling;

    return (
      <>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant={buttonVariant}
              size={buttonSize}
              disabled={isMenuDisabled}
              className={cn('text-muted-foreground hover:text-foreground', className)}
            >
              {menuIcon || <MoreVertical className="h-4 w-4" />}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align={align}
            sideOffset={5}
            className="z-50 max-h-[70vh] overflow-y-auto"
          >
            <DropdownMenuLabel className="font-semibold px-3 py-2">Actions</DropdownMenuLabel>
            <DropdownMenuSeparator />

            {showPullGoals ? (
              <DropdownMenuItem
                disabled={isPulling}
                onClick={(e) => {
                  e.preventDefault();
                  if (!isPulling) {
                    onPullGoals();
                  }
                }}
                className="flex items-center"
              >
                <ArrowDownToLine className="mr-2 h-4 w-4 flex-shrink-0" />
                <span className="text-sm">
                  {isPulling ? 'Pulling...' : 'Pull incomplete goals'}
                </span>
              </DropdownMenuItem>
            ) : (
              <TooltipProvider delayDuration={0}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="w-full cursor-not-allowed">
                      <DropdownMenuItem className="cursor-not-allowed opacity-50" disabled>
                        <ArrowDownToLine className="mr-2 h-4 w-4 flex-shrink-0" />
                        <span className="text-sm">Pull incomplete goals</span>
                      </DropdownMenuItem>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{tooltipContent}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Render the pull goals confirmation dialog */}
        {pullGoalsDialog}
      </>
    );
  }
);

DailyWeeklyActionMenu.displayName = 'DailyWeeklyActionMenu';
