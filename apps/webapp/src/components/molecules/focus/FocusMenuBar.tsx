import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, MoreVertical } from 'lucide-react';
import { ViewMode } from '@/components/molecules/focus/constants';
import { DayOfWeek, getDayName } from '@/lib/constants';
import { cn } from '@/lib/utils';
import { QuarterActionMenu } from '@/components/molecules/quarter/QuarterActionMenu';

export type FocusMenuBarProps = {
  viewMode?: ViewMode;
  onViewModeChange?: (viewMode: ViewMode) => void;
  selectedWeek?: number;
  selectedDay?: DayOfWeek;
  isAtMinBound?: boolean;
  isAtMaxBound?: boolean;
  onPrevious?: () => void;
  onNext?: () => void;
  selectedYear: number;
  selectedQuarter: 1 | 2 | 3 | 4;
  onYearQuarterChange?: (year: number, quarter: number) => void;
  // Props for QuarterActionMenu
  isFirstQuarter?: boolean;
  isMovingGoals?: boolean;
  handlePreviewGoals?: () => void;
};

/**
 * A pure component that renders a menu bar for the focus mode views
 * Includes controls for navigation, view mode selection, and year/quarter selection
 */
export const FocusMenuBar = ({
  viewMode = 'quarterly',
  onViewModeChange,
  selectedWeek,
  selectedDay,
  isAtMinBound = false,
  isAtMaxBound = false,
  onPrevious,
  onNext,
  selectedYear,
  selectedQuarter,
  onYearQuarterChange,
  // QuarterActionMenu props
  isFirstQuarter,
  isMovingGoals,
  handlePreviewGoals,
}: FocusMenuBarProps) => {
  // Generate years (current year - 1 to current year + 2)
  const years = selectedYear
    ? Array.from({ length: 4 }, (_, i) => selectedYear - 1 + i)
    : [];

  // Generate quarters
  const quarters = [1, 2, 3, 4];

  // Only show year and quarter selectors in quarterly view
  const showYearQuarterSelectors = viewMode === 'quarterly';

  // Show navigation controls for daily and weekly views
  const showNavigationControls = viewMode === 'daily' || viewMode === 'weekly';

  // Only show the QuarterActionMenu in quarterly view
  const showQuarterActionMenu = viewMode === 'quarterly' && handlePreviewGoals;

  // Determine if the quarter action button should be disabled
  const isActionMenuDisabled = isFirstQuarter || isMovingGoals;

  // Tooltip content for the QuarterActionMenu
  const tooltipContent = isFirstQuarter
    ? 'Cannot pull goals from previous quarter as this is the first quarter'
    : isMovingGoals
    ? 'Moving goals...'
    : "Can't pull from previous quarter";

  return (
    <div className="bg-background p-3 border-b">
      <div className="max-w-screen-2xl mx-auto px-4 flex justify-center">
        <div
          id="focus-menu-bar"
          className="flex items-center justify-center w-full"
        >
          <div className="flex items-center gap-4">
            {showYearQuarterSelectors &&
              selectedYear &&
              selectedQuarter &&
              onYearQuarterChange && (
                <>
                  <Select
                    value={selectedYear.toString()}
                    onValueChange={(value) =>
                      onYearQuarterChange(parseInt(value), selectedQuarter)
                    }
                  >
                    <SelectTrigger className="w-[80px]">
                      <SelectValue placeholder="Year" />
                    </SelectTrigger>
                    <SelectContent>
                      {years.map((year) => (
                        <SelectItem key={year} value={year.toString()}>
                          {year}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Select
                    value={selectedQuarter.toString()}
                    onValueChange={(value) =>
                      onYearQuarterChange(
                        selectedYear,
                        parseInt(value) as 1 | 2 | 3 | 4
                      )
                    }
                  >
                    <SelectTrigger className="w-[80px]">
                      <SelectValue placeholder="Quarter" />
                    </SelectTrigger>
                    <SelectContent>
                      {quarters.map((quarter) => (
                        <SelectItem key={quarter} value={quarter.toString()}>
                          Q{quarter}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </>
              )}

            {showNavigationControls && onPrevious && onNext && (
              <div className="flex items-center gap-2 mr-2">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onPrevious}
                  disabled={isAtMinBound}
                  className={cn(
                    'h-8 w-8 text-muted-foreground hover:text-foreground',
                    isAtMinBound && 'opacity-50 cursor-not-allowed'
                  )}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-sm font-medium min-w-[100px] text-center">
                  {viewMode === 'daily' && selectedDay
                    ? `${getDayName(selectedDay)}`
                    : viewMode === 'weekly' && selectedWeek
                    ? `Week ${selectedWeek}`
                    : ''}
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onNext}
                  disabled={isAtMaxBound}
                  className={cn(
                    'h-8 w-8 text-muted-foreground hover:text-foreground',
                    isAtMaxBound && 'opacity-50 cursor-not-allowed'
                  )}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            )}

            <Select
              value={viewMode}
              onValueChange={
                onViewModeChange
                  ? (value) => onViewModeChange(value as ViewMode)
                  : undefined
              }
            >
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Select view" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="quarterly">Quarterly View</SelectItem>
                <SelectItem value="weekly">Weekly View</SelectItem>
                <SelectItem value="daily">Daily View</SelectItem>
              </SelectContent>
            </Select>

            {/* Quarter Action Menu - with vertical dots icon */}
            {showQuarterActionMenu && (
              <QuarterActionMenu
                isDisabled={isActionMenuDisabled}
                isFirstQuarter={isFirstQuarter}
                isMovingGoals={isMovingGoals}
                handlePreviewGoals={handlePreviewGoals}
                tooltipContent={tooltipContent}
                buttonSize="icon"
                buttonVariant="ghost"
                showLabel={false}
                menuIcon={<MoreVertical className="h-4 w-4" />}
                year={selectedYear}
                quarter={selectedQuarter}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
