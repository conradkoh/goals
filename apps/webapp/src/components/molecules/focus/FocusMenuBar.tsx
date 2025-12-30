import { ChevronLeft, ChevronRight, MoreVertical } from 'lucide-react';
import type { ReactElement } from 'react';

import type { ViewMode } from '@/components/molecules/focus/constants';
import { DailyWeeklyActionMenu } from '@/components/molecules/focus/DailyWeeklyActionMenu';
import { QuarterActionMenu } from '@/components/molecules/quarter/QuarterActionMenu';
import { Button } from '@/components/ui/button';
import { type DayOfWeek, getDayNameShort } from '@/lib/constants';
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

  // Build the navigation label based on view mode
  const getNavigationLabel = () => {
    if (viewMode === 'daily' && selectedDay && selectedWeek) {
      return `${effectiveWeekYear} · Q${getQuarterFromWeek(selectedWeek)} · W${selectedWeek} · ${getDayNameShort(selectedDay)}`;
    }
    if (viewMode === 'weekly' && selectedWeek) {
      return `${effectiveWeekYear} · Q${getQuarterFromWeek(selectedWeek)} · W${selectedWeek}`;
    }
    if (viewMode === 'quarterly') {
      return `${selectedYear} · Q${selectedQuarter}`;
    }
    return '';
  };

  // Show navigation controls for all views
  const showNavigation = onPrevious && onNext;

  return (
    <div className="bg-background p-3 border-b">
      <div className="max-w-screen-2xl mx-auto px-2 sm:px-4 flex justify-center">
        <div id="focus-menu-bar" className="flex items-center justify-center w-full">
          <div className="flex items-center gap-1 sm:gap-2">
            {/* Navigation with unified indicator */}
            {showNavigation && (
              <div className="flex items-center gap-0.5 sm:gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onPrevious}
                  className="h-7 w-7 sm:h-8 sm:w-8 text-muted-foreground hover:text-foreground"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-xs sm:text-sm font-medium text-center truncate px-1 sm:px-2 max-w-[120px] sm:max-w-[160px]">
                  {getNavigationLabel()}
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onNext}
                  className="h-7 w-7 sm:h-8 sm:w-8 text-muted-foreground hover:text-foreground"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            )}

            {/* Quarter Action Menu - with vertical dots icon and view mode options */}
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
                viewMode={viewMode}
                onViewModeChange={onViewModeChange}
              />
            )}

            {/* Daily/Weekly Action Menu - with vertical dots icon and view mode options */}
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
                viewMode={viewMode}
                onViewModeChange={onViewModeChange}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
