import { ChevronLeft, ChevronRight, MoreVertical } from 'lucide-react';
import type { ReactElement } from 'react';

import type { ViewMode } from '@/components/molecules/focus/constants';
import { DailyWeeklyActionMenu } from '@/components/molecules/focus/DailyWeeklyActionMenu';
import { QuarterActionMenu } from '@/components/molecules/quarter/QuarterActionMenu';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { type DayOfWeek, getDayName } from '@/lib/constants';
import { getQuarterFromWeek } from '@/lib/date/iso-week';

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
  /** The ISO week year for weekly/daily views (may differ from selectedYear at year boundaries) */
  selectedWeekYear?: number;
  onYearQuarterChange?: (year: number, quarter: number) => void;
  /** Handler for changing the week year in weekly/daily views */
  onWeekYearChange?: (weekYear: number) => void;
  // Props for QuarterActionMenu
  isFirstQuarter?: boolean;
  isMovingGoals?: boolean;
  handlePreviewGoals?: () => void;
  // Props for DailyWeeklyActionMenu (pull goals for daily/weekly views)
  isPullingGoals?: boolean;
  showPullGoals?: boolean;
  onPullGoals?: () => Promise<void>;
  pullGoalsDialog?: ReactElement;
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
  // isAtMinBound and isAtMaxBound are kept in props for backwards compatibility
  // but not used since weekly/daily views have no navigation bounds
  onPrevious,
  onNext,
  selectedYear,
  selectedQuarter,
  selectedWeekYear,
  onYearQuarterChange,
  onWeekYearChange,
  // QuarterActionMenu props
  isFirstQuarter,
  isMovingGoals,
  handlePreviewGoals,
  // DailyWeeklyActionMenu props
  isPullingGoals,
  showPullGoals,
  onPullGoals,
  pullGoalsDialog,
}: FocusMenuBarProps) => {
  // Use the week year if provided, otherwise fall back to selected year
  const effectiveWeekYear = selectedWeekYear ?? selectedYear;

  // Generate years for the quarterly view (current year - 1 to current year + 2)
  const years = selectedYear ? Array.from({ length: 4 }, (_, i) => selectedYear - 1 + i) : [];

  // Generate years for weekly/daily view centered around effective week year
  const weekYears = effectiveWeekYear
    ? Array.from({ length: 5 }, (_, i) => effectiveWeekYear - 2 + i)
    : [];

  // Generate quarters
  const quarters = [1, 2, 3, 4];

  // Only show year and quarter selectors in quarterly view
  const showYearQuarterSelectors = viewMode === 'quarterly';

  // Show year selector in weekly/daily views
  const showWeekYearSelector = (viewMode === 'weekly' || viewMode === 'daily') && onWeekYearChange;

  // Show navigation controls for daily and weekly views
  const showNavigationControls = viewMode === 'daily' || viewMode === 'weekly';

  // Only show the QuarterActionMenu in quarterly view
  const showQuarterActionMenu = viewMode === 'quarterly' && handlePreviewGoals;

  // Show the DailyWeeklyActionMenu in daily and weekly views
  const showDailyWeeklyActionMenu =
    (viewMode === 'daily' || viewMode === 'weekly') && onPullGoals && pullGoalsDialog;

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
        <div id="focus-menu-bar" className="flex items-center justify-center w-full">
          <div className="flex items-center gap-4">
            {showYearQuarterSelectors && selectedYear && selectedQuarter && onYearQuarterChange && (
              <>
                <Select
                  value={selectedYear.toString()}
                  onValueChange={(value) =>
                    onYearQuarterChange(Number.parseInt(value), selectedQuarter)
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
                    onYearQuarterChange(selectedYear, Number.parseInt(value) as 1 | 2 | 3 | 4)
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

            {showWeekYearSelector && (
              <Select
                value={effectiveWeekYear.toString()}
                onValueChange={(value) => onWeekYearChange(Number.parseInt(value))}
              >
                <SelectTrigger className="w-[80px]">
                  <SelectValue placeholder="Year" />
                </SelectTrigger>
                <SelectContent>
                  {weekYears.map((year) => (
                    <SelectItem key={year} value={year.toString()}>
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            {showNavigationControls && onPrevious && onNext && (
              <div className="flex items-center gap-2 mr-2">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onPrevious}
                  className="h-8 w-8 text-muted-foreground hover:text-foreground"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-sm font-medium min-w-[100px] md:min-w-[140px] text-center">
                  {viewMode === 'daily' && selectedDay && selectedWeek
                    ? `Q${getQuarterFromWeek(selectedWeek)} · W${selectedWeek} · ${getDayName(selectedDay)}`
                    : viewMode === 'weekly' && selectedWeek
                      ? `Q${getQuarterFromWeek(selectedWeek)} · W${selectedWeek}`
                      : ''}
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onNext}
                  className="h-8 w-8 text-muted-foreground hover:text-foreground"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            )}

            <Select
              value={viewMode}
              onValueChange={
                onViewModeChange ? (value) => onViewModeChange(value as ViewMode) : undefined
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

            {/* Daily/Weekly Action Menu - with vertical dots icon */}
            {showDailyWeeklyActionMenu && (
              <DailyWeeklyActionMenu
                isPulling={isPullingGoals}
                showPullGoals={showPullGoals}
                onPullGoals={onPullGoals}
                pullGoalsDialog={pullGoalsDialog}
                tooltipContent="Navigate to current day/week to pull goals"
                buttonSize="icon"
                buttonVariant="ghost"
                menuIcon={<MoreVertical className="h-4 w-4" />}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
