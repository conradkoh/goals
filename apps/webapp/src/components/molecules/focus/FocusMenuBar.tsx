import { ChevronLeft, ChevronRight, MoreVertical, Search } from 'lucide-react';
import type { ReactElement } from 'react';
import { useMemo, useState } from 'react';

import type { ViewMode } from '@/components/molecules/focus/constants';
import { DailyWeeklyActionMenu } from '@/components/molecules/focus/DailyWeeklyActionMenu';
import {
  DailySelector,
  QuarterlySelector,
  WeeklySelector,
} from '@/components/molecules/focus-context-selector';
import { QuarterActionMenu } from '@/components/molecules/quarter/QuarterActionMenu';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { type DayOfWeek, getDayNameShort } from '@/lib/constants';
import { getQuarterFromWeek } from '@/lib/date/iso-week';

/**
 * Returns a platform-aware label for the search shortcut.
 * Shows keyboard shortcut on desktop, plain "Search" on mobile.
 * @internal
 */
function getSearchShortcutLabel(): string {
  if (typeof navigator !== 'undefined') {
    const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

    if (isMobile) return 'Search';
    return isMac ? 'Search (⌘K)' : 'Search (Ctrl+K)';
  }
  return 'Search';
}

/** Navigation params for updating URL state atomically */
export type NavigationParams = {
  year?: number;
  quarter?: number;
  week?: number;
  day?: DayOfWeek;
};

export type FocusMenuBarProps = {
  viewMode?: ViewMode;
  onViewModeChange?: (viewMode: ViewMode) => void;
  selectedWeek?: number;
  selectedDay?: DayOfWeek;
  onPrevious?: () => void;
  onNext?: () => void;
  /** ISO week year (unified year param for all views) */
  selectedYear: number;
  selectedQuarter: 1 | 2 | 3 | 4;
  /** Single callback to update navigation params atomically (URL is source of truth) */
  onNavigate?: (params: NavigationParams) => void;
  /** Props for QuarterActionMenu */
  isFirstQuarter?: boolean;
  isMovingGoals?: boolean;
  handlePreviewGoals?: () => void;
  /** Props for DailyWeeklyActionMenu (pull goals for daily/weekly views) */
  isPullingGoals?: boolean;
  showPullGoals?: boolean;
  onPullGoals?: () => Promise<void>;
  pullGoalsDialog?: ReactElement;
  /** Handler to open the command palette / search dialog */
  onOpenCommandPalette?: () => void;
};

/**
 * A pure component that renders a menu bar for focus mode views
 * Includes controls for navigation, view mode selection, and year/quarter selection
 */
export const FocusMenuBar = ({
  viewMode = 'quarterly',
  onViewModeChange,
  selectedWeek,
  selectedDay,
  onPrevious,
  onNext,
  selectedYear,
  selectedQuarter,
  onNavigate,
  /** QuarterActionMenu props */
  isFirstQuarter,
  isMovingGoals,
  handlePreviewGoals,
  /** DailyWeeklyActionMenu props */
  isPullingGoals,
  showPullGoals,
  onPullGoals,
  pullGoalsDialog,
  /** Command palette handler */
  onOpenCommandPalette,
}: FocusMenuBarProps) => {
  // State for selector dialogs
  const [isSelectorOpen, setIsSelectorOpen] = useState(false);

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
      return `${selectedYear} · Q${getQuarterFromWeek(selectedWeek)} · W${selectedWeek} · ${getDayNameShort(selectedDay)}`;
    }
    if (viewMode === 'weekly' && selectedWeek) {
      return `${selectedYear} · Q${getQuarterFromWeek(selectedWeek)} · W${selectedWeek}`;
    }
    if (viewMode === 'quarterly') {
      return `${selectedYear} · Q${selectedQuarter}`;
    }
    return '';
  };

  // Show navigation controls for all views
  const showNavigation = onPrevious && onNext;

  // Memoize search shortcut label to avoid recalculation
  const searchShortcutLabel = useMemo(() => getSearchShortcutLabel(), []);

  // Handle selector changes - updates URL params atomically via onNavigate
  const handleQuarterlyApply = (year: number, quarter: 1 | 2 | 3 | 4) => {
    onNavigate?.({ year, quarter });
    setIsSelectorOpen(false);
  };

  const handleWeeklyApply = (year: number, _quarter: 1 | 2 | 3 | 4, week: number) => {
    onNavigate?.({ year, week });
    setIsSelectorOpen(false);
  };

  const handleDailyApply = (
    year: number,
    _quarter: 1 | 2 | 3 | 4,
    week: number,
    day: DayOfWeek
  ) => {
    onNavigate?.({ year, week, day });
    setIsSelectorOpen(false);
  };

  return (
    <>
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
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsSelectorOpen(true)}
                    className="text-xs sm:text-sm font-medium text-center px-1 sm:px-2 hover:bg-accent"
                  >
                    {getNavigationLabel()}
                  </Button>
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

              {/* Search button - opens command palette */}
              {onOpenCommandPalette && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={onOpenCommandPalette}
                        className="h-9 w-9 text-muted-foreground hover:text-foreground"
                        aria-label="Search"
                      >
                        <Search className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>{searchShortcutLabel}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Selector Dialogs */}
      {viewMode === 'quarterly' && (
        <QuarterlySelector
          open={isSelectorOpen}
          onOpenChange={setIsSelectorOpen}
          year={selectedYear}
          quarter={selectedQuarter}
          onApply={handleQuarterlyApply}
        />
      )}
      {viewMode === 'weekly' && selectedWeek && (
        <WeeklySelector
          open={isSelectorOpen}
          onOpenChange={setIsSelectorOpen}
          year={selectedYear}
          quarter={selectedQuarter}
          week={selectedWeek}
          onApply={handleWeeklyApply}
        />
      )}
      {viewMode === 'daily' && selectedWeek && selectedDay && (
        <DailySelector
          open={isSelectorOpen}
          onOpenChange={setIsSelectorOpen}
          year={selectedYear}
          quarter={selectedQuarter}
          week={selectedWeek}
          day={selectedDay}
          onApply={handleDailyApply}
        />
      )}
    </>
  );
};
