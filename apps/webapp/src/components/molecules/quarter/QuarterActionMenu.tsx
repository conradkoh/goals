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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { ArrowDownToLine, History, FileText } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Id } from '@services/backend/convex/_generated/dataModel';
import { QuarterlyGoalSelector } from '@/components/molecules/quarterly-summary';

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
    const [showGoalCurationDialog, setShowGoalCurationDialog] = React.useState(false);
    const [selectedGoalIds, setSelectedGoalIds] = React.useState<Id<'goals'>[]>([]);

    // Handle opening the goal curation dialog
    const handleOpenGoalCuration = React.useCallback(() => {
      setSelectedGoalIds([]); // Reset selection when opening
      setShowGoalCurationDialog(true);
    }, []);

    // Handle confirming the goal selection and navigating to summary
    const handleConfirmGoalSelection = React.useCallback(() => {
      if (year && quarter && selectedGoalIds.length > 0) {
        const params = new URLSearchParams();
        params.set('year', year.toString());
        params.set('quarter', quarter.toString());
        params.set('goals', selectedGoalIds.join(','));
        router.push(`/app/goal/quarterly-summary?${params.toString()}`);
      }
      setShowGoalCurationDialog(false);
    }, [router, year, quarter, selectedGoalIds]);

    // Handle closing the dialog
    const handleCloseDialog = React.useCallback(() => {
      setShowGoalCurationDialog(false);
      setSelectedGoalIds([]);
    }, []);

    return (
      <>
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
                      <DropdownMenuItem
                        className="cursor-not-allowed opacity-50"
                        disabled
                      >
                        <History className="mr-2 h-4 w-4" />
                        <div className="flex flex-col w-full items-center">
                          <span>Pull Incomplete</span>
                          <span className="text-gray-500 text-xs">
                            from previous quarter
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
                  Quarter Actions
                </DropdownMenuLabel>
                <DropdownMenuSeparator />

                <DropdownMenuItem
                  onClick={handleOpenGoalCuration}
                  disabled={!year || !quarter}
                  className="flex items-center"
                >
                  <FileText className="mr-2 h-4 w-4 flex-shrink-0" />
                  <span className="text-sm">
                    Generate Summary
                  </span>
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
                  <span className="text-sm">
                    Pull incomplete goals from previous quarter
                  </span>
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Goal Curation Dialog */}
        <Dialog open={showGoalCurationDialog} onOpenChange={setShowGoalCurationDialog}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Select Goals for Summary</DialogTitle>
              <DialogDescription>
                Choose which goals from Q{quarter} {year} you want to include in the quarterly summary.
                You can select multiple goals to generate a comprehensive report.
              </DialogDescription>
            </DialogHeader>

            <div className="py-4">
              <QuarterlyGoalSelector
                year={year}
                quarter={quarter}
                selectedGoalIds={selectedGoalIds}
                onSelectionChange={setSelectedGoalIds}
                showGenerateButton={false}
              />
            </div>

            <DialogFooter className="flex items-center justify-between">
              <div className="text-sm text-muted-foreground">
                {selectedGoalIds.length === 0 
                  ? 'No goals selected'
                  : `${selectedGoalIds.length} goal${selectedGoalIds.length === 1 ? '' : 's'} selected`
                }
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={handleCloseDialog}>
                  Cancel
                </Button>
                <Button 
                  onClick={handleConfirmGoalSelection}
                  disabled={selectedGoalIds.length === 0}
                >
                  Generate Summary
                </Button>
              </div>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </>
    );
  }
);
