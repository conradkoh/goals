import { ArrowDownToLine, FileText, History } from 'lucide-react';
import { useRouter } from 'next/navigation';
import React from 'react';
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

export interface QuarterActionMenuProps {
  isDisabled?: boolean;
  isFirstQuarter?: boolean;
  isMovingGoals?: boolean;
  tooltipContent?: string;
  handlePreviewGoals: () => void;
  buttonSize?: 'default' | 'sm' | 'icon';
  buttonVariant?: 'default' | 'ghost' | 'outline';
  align?: 'start' | 'center' | 'end';
  className?: string;
  showLabel?: boolean;
  menuIcon?: React.ReactNode;
  year: number;
  quarter: number;
}

export const QuarterActionMenu = React.memo(
  ({
    isDisabled = false,
    isFirstQuarter = false,
    isMovingGoals = false,
    tooltipContent = "Can't pull from previous quarter",
    handlePreviewGoals,
    buttonSize = 'icon',
    buttonVariant = 'ghost',
    align = 'end',
    className,
    showLabel = false,
    menuIcon,
    year,
    quarter,
  }: QuarterActionMenuProps) => {
    const router = useRouter();

    // Handle navigating to summary page directly
    const handleGenerateSummary = React.useCallback(() => {
      if (year && quarter) {
        const params = new URLSearchParams();
        params.set('year', year.toString());
        params.set('quarter', quarter.toString());
        router.push(`/app/goal/quarterly-summary?${params.toString()}`);
      }
    }, [router, year, quarter]);

    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant={buttonVariant}
            size={buttonSize}
            disabled={isDisabled}
            className={cn('text-muted-foreground hover:text-foreground', className)}
          >
            {showLabel ? (
              <>
                {menuIcon || <ArrowDownToLine className="h-4 w-4 mr-2" />}
                Pull from Previous Quarter
              </>
            ) : (
              menuIcon || <ArrowDownToLine className="h-4 w-4" />
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
                    <DropdownMenuItem className="cursor-not-allowed opacity-50" disabled>
                      <History className="mr-2 h-4 w-4" />
                      <div className="flex flex-col w-full items-center">
                        <span>Pull Incomplete</span>
                        <span className="text-gray-500 text-xs">from previous quarter</span>
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
                Quarter Actions
              </DropdownMenuLabel>
              <DropdownMenuSeparator />

              <DropdownMenuItem
                onClick={handleGenerateSummary}
                disabled={!year || !quarter}
                className="flex items-center"
              >
                <FileText className="mr-2 h-4 w-4 flex-shrink-0" />
                <span className="text-sm">Generate Summary</span>
              </DropdownMenuItem>

              <DropdownMenuSeparator />

              <DropdownMenuItem
                disabled={isFirstQuarter || isMovingGoals}
                onClick={() => {
                  if (!isFirstQuarter && !isMovingGoals) {
                    handlePreviewGoals();
                  }
                }}
                className="flex items-center"
              >
                <History className="mr-2 h-4 w-4 flex-shrink-0" />
                <span className="text-sm">Pull incomplete goals from previous quarter</span>
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }
);
