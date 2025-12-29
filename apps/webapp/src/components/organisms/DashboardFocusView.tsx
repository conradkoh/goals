import { api } from '@workspace/backend/convex/_generated/api';
import type { Doc, Id } from '@workspace/backend/convex/_generated/dataModel';
import type { AdhocGoalWithChildren } from '@workspace/backend/convex/adhocGoal';
import type { GoalWithDetailsAndChildren } from '@workspace/backend/src/usecase/getWeekDetails';
import { useQuery } from 'convex/react';
import { Loader2 } from 'lucide-react';
import React, { useCallback, useMemo, useState } from 'react';

import { DomainPopover } from '@/components/molecules/DomainPopover';
import { AdhocGoalQuickViewModal } from '@/components/molecules/focus/AdhocGoalQuickViewModal';
import type { ViewMode } from '@/components/molecules/focus/constants';
import { CreateAdhocGoalDialog } from '@/components/molecules/focus/CreateAdhocGoalDialog';
import { FocusMenuBar } from '@/components/molecules/focus/FocusMenuBar';
import { GoalQuickViewModal } from '@/components/molecules/focus/GoalQuickViewModal';
import { GoalSearchDialog } from '@/components/molecules/focus/GoalSearchDialog';
import { QuarterJumpDialog } from '@/components/molecules/focus/QuarterJumpDialog';
import { ViewModeKeyboardShortcuts } from '@/components/molecules/focus/ViewModeKeyboardShortcuts';
import { FocusModeDailyView } from '@/components/organisms/focus/FocusModeDailyView';
import { FocusModeQuarterlyView } from '@/components/organisms/focus/FocusModeQuarterlyView/FocusModeQuarterlyView';
import { FocusModeWeeklyView } from '@/components/organisms/focus/FocusModeWeeklyView';
import { GoalStatusProvider } from '@/contexts/GoalStatusContext';
import { useCurrentWeekInfo } from '@/hooks/useCurrentDateTime';
import { useDashboard } from '@/hooks/useDashboard';
import { useMoveGoalsForQuarter } from '@/hooks/useMoveGoalsForQuarter';
import { usePullGoals } from '@/hooks/usePullGoals';
import { useQuarterWeekInfo } from '@/hooks/useQuarterWeekInfo';
import { useWeek as useWeekContext, useWeekData, WeekProvider } from '@/hooks/useWeek';
import type { DayOfWeek } from '@/lib/constants';
import { useSession } from '@/modules/auth/useSession';

/**
 * Props for the DashboardFocusView component.
 *
 * @public
 *
 * @example
 * ```typescript
 * <DashboardFocusView
 *   viewMode="weekly"
 *   selectedWeekNumber={48}
 *   selectedDayOfWeek={1}
 *   isAtMinBound={false}
 *   isAtMaxBound={false}
 *   onViewModeChange={(mode) => console.log('View mode:', mode)}
 *   onPrevious={() => console.log('Previous')}
 *   onNext={() => console.log('Next')}
 * />
 * ```
 */
export interface DashboardFocusViewProps {
  /** Current active view mode */
  viewMode: ViewMode;
  /** Currently selected ISO week number */
  selectedWeekNumber: number;
  /** Currently selected day of week */
  selectedDayOfWeek: DayOfWeek;
  /** Whether the view is at the minimum date boundary */
  isAtMinBound: boolean;
  /** Whether the view is at the maximum date boundary */
  isAtMaxBound: boolean;
  /** Callback fired when the view mode changes */
  onViewModeChange: (viewMode: ViewMode) => void;
  /** Callback fired when navigating to the previous period */
  onPrevious: () => void;
  /** Callback fired when navigating to the next period */
  onNext: () => void;
  /** Optional callback fired when the year or quarter changes */
  onYearQuarterChange?: (year: number, quarter: number) => void;
}

/**
 * Props for the GoalSearchDialogWrapper internal component.
 *
 * @internal
 */
interface GoalSearchDialogWrapperProps {
  /** Whether the search dialog is open */
  open: boolean;
  /** Callback fired when the dialog open state changes */
  onOpenChange: (open: boolean) => void;
  /** Callback fired when a goal is selected from search results */
  onGoalSelect: (goalId: Id<'goals'>, goal: GoalWithDetailsAndChildren) => void;
  /** Callback fired when an adhoc goal is selected from search results */
  onAdhocGoalSelect: (goalId: Id<'goals'>, goal: AdhocGoalWithChildren) => void;
  /** Callback fired when a domain is selected */
  onDomainSelect: (domain: Doc<'domains'> | null) => void;
  /** Callback fired when "Jump to Quarter" is selected */
  onJumpToQuarter: () => void;
  /** Callback fired when "New Adhoc Goal" is selected */
  onNewAdhocGoal: () => void;
  /** Whether the goal details modal is currently open */
  isGoalModalOpen: boolean;
}

/**
 * Main dashboard focus view component that manages state and layout for different view modes.
 * Orchestrates navigation, search, goal creation, and period-specific views.
 *
 * @public
 *
 * @param props - Component props
 * @returns Rendered focus view component
 */
export const DashboardFocusView: React.FC<DashboardFocusViewProps> = ({
  viewMode,
  selectedWeekNumber,
  selectedDayOfWeek,
  isAtMinBound,
  isAtMaxBound,
  onViewModeChange,
  onPrevious,
  onNext,
  onYearQuarterChange,
}) => {
  const {
    selectedYear,
    selectedQuarter,
    selectedWeekYear,
    isFocusModeEnabled,
    updateUrlParams,
    handleWeekYearChange,
  } = useDashboard();
  const { currentWeekNumber } = useQuarterWeekInfo(selectedYear, selectedQuarter as 1 | 2 | 3 | 4);
  const { weekday: currentDay } = useCurrentWeekInfo();

  // State for dialogs
  const [isQuarterJumpOpen, setIsQuarterJumpOpen] = useState(false);
  const [isGoalSearchOpen, setIsGoalSearchOpen] = useState(false);
  const [isCreateAdhocGoalOpen, setIsCreateAdhocGoalOpen] = useState(false);
  const [selectedGoal, setSelectedGoal] = useState<GoalWithDetailsAndChildren | null>(null);
  const [isGoalQuickViewOpen, setIsGoalQuickViewOpen] = useState(false);
  const [selectedAdhocGoal, setSelectedAdhocGoal] = useState<AdhocGoalWithChildren | null>(null);
  const [isAdhocGoalQuickViewOpen, setIsAdhocGoalQuickViewOpen] = useState(false);
  const [selectedDomain, setSelectedDomain] = useState<Doc<'domains'> | null>(null);
  const [isDomainPopoverOpen, setIsDomainPopoverOpen] = useState(false);

  /**
   * Hook for managing "Pull from previous quarter" functionality.
   * @internal
   */
  const {
    isFirstQuarter,
    isMovingGoals,
    handlePreviewGoals,
    dialog: quarterMoveDialog,
  } = useMoveGoalsForQuarter({
    year: selectedYear,
    quarter: selectedQuarter as 1 | 2 | 3 | 4,
  });

  /**
   * Hook for managing "Pull goals" functionality for daily/weekly views.
   * @internal
   */
  const {
    isPulling: isPullingGoals,
    handlePullGoals,
    dialog: pullGoalsDialog,
  } = usePullGoals({
    weekNumber: selectedWeekNumber,
    year: selectedYear,
    quarter: selectedQuarter,
  });

  /**
   * Determine if pull goals should be shown based on current view context.
   * @internal
   */
  const showPullGoals = useMemo(() => {
    if (viewMode === 'daily') {
      return selectedWeekNumber === currentWeekNumber && selectedDayOfWeek === currentDay;
    }
    if (viewMode === 'weekly') {
      return selectedWeekNumber === currentWeekNumber;
    }
    return false;
  }, [viewMode, selectedWeekNumber, currentWeekNumber, selectedDayOfWeek, currentDay]);

  // Force component re-render when year/quarter changes
  const [forceRender, setForceRender] = React.useState(0);

  /**
   * Fetch week-specific data for the selected period.
   * @internal
   */
  const weekData = useWeekData({
    year: selectedYear,
    quarter: selectedQuarter,
    week: selectedWeekNumber,
  });

  // When year or quarter changes, force a re-render to refresh hooks
  React.useEffect(() => {
    setForceRender((prev) => prev + 1);
  }, []);

  /**
   * Unique keys for view components to force fresh renders on period changes.
   * @internal
   */
  const quarterlyViewKey = useMemo(
    () => `quarterly-${selectedYear}-${selectedQuarter}-${forceRender}`,
    [selectedYear, selectedQuarter, forceRender]
  );

  /** @internal */
  const weeklyViewKey = useMemo(
    () => `weekly-${selectedYear}-${selectedQuarter}-${selectedWeekNumber}-${forceRender}`,
    [selectedYear, selectedQuarter, selectedWeekNumber, forceRender]
  );

  /** @internal */
  const dailyViewKey = useMemo(
    () =>
      `daily-${selectedYear}-${selectedQuarter}-${selectedWeekNumber}-${selectedDayOfWeek}-${forceRender}`,
    [selectedYear, selectedQuarter, selectedWeekNumber, selectedDayOfWeek, forceRender]
  );

  /**
   * Unified callback for jumping to the current date across all views.
   * Updates year, quarter, week, and day to navigate to today in a single URL update.
   * @internal
   */
  const handleJumpToToday = useCallback(
    (year: number, quarter: number, weekNumber: number, dayOfWeek: DayOfWeek) => {
      // Update all parameters at once to avoid race conditions
      updateUrlParams({
        year,
        quarter,
        week: weekNumber,
        day: dayOfWeek,
      });
    },
    [updateUrlParams]
  );

  /**
   * Handler for opening the appropriate command dialog based on the current view mode.
   * @internal
   */
  const handleOpenCommandDialog = useCallback(() => {
    if (viewMode === 'quarterly') {
      setIsQuarterJumpOpen(true);
    } else {
      setIsGoalSearchOpen(true);
    }
  }, [viewMode]);

  /**
   * Handler for goal selection from search results to show quick view modal.
   * @internal
   */
  const handleGoalSelect = useCallback((_goalId: Id<'goals'>, goal: GoalWithDetailsAndChildren) => {
    setSelectedGoal(goal);
    setIsGoalQuickViewOpen(true);
  }, []);

  /**
   * Handler for adhoc goal selection from search results to show adhoc quick view modal.
   * @internal
   */
  const handleAdhocGoalSelect = useCallback((_goalId: Id<'goals'>, goal: AdhocGoalWithChildren) => {
    setSelectedAdhocGoal(goal);
    setIsAdhocGoalQuickViewOpen(true);
  }, []);

  /**
   * Handler for "Jump to Quarter" action from the goal search dialog.
   * @internal
   */
  const handleJumpToQuarter = useCallback(() => {
    setIsQuarterJumpOpen(true);
  }, []);

  /**
   * Handler for "New Adhoc Goal" action from the goal search dialog.
   * @internal
   */
  const handleNewAdhocGoal = useCallback(() => {
    setIsCreateAdhocGoalOpen(true);
  }, []);

  /**
   * Handler for domain selection from the goal search dialog.
   * @internal
   */
  const handleDomainSelect = useCallback((domain: Doc<'domains'> | null) => {
    setSelectedDomain(domain);
    setIsDomainPopoverOpen(true);
  }, []);

  /**
   * Handles quarter selection from the jump dialog.
   * @internal
   */
  const handleQuarterSelect = useCallback(
    (year: number, quarter: number) => {
      onYearQuarterChange?.(year, quarter);
    },
    [onYearQuarterChange]
  );

  /**
   * Handles close events for the goal search dialog.
   * @internal
   */
  const handleGoalSearchOpenChange = useCallback((open: boolean) => {
    setIsGoalSearchOpen(open);
  }, []);

  /**
   * Handles close events for the create adhoc goal dialog.
   * @internal
   */
  const handleCreateAdhocGoalOpenChange = useCallback((open: boolean) => {
    setIsCreateAdhocGoalOpen(open);
  }, []);

  /**
   * Handles close events for the goal quick view modal.
   * @internal
   */
  const handleGoalQuickViewOpenChange = useCallback((open: boolean) => {
    setIsGoalQuickViewOpen(open);
  }, []);

  return (
    <GoalStatusProvider>
      <div id="db-focus-view" className="w-full h-full">
        <ViewModeKeyboardShortcuts
          onViewModeChange={onViewModeChange}
          onOpenQuarterJump={handleOpenCommandDialog}
        />
        <QuarterJumpDialog
          open={isQuarterJumpOpen}
          onOpenChange={setIsQuarterJumpOpen}
          selectedYear={selectedYear}
          selectedQuarter={selectedQuarter}
          onQuarterSelect={handleQuarterSelect}
        />

        {/* Render goal search and quick view within WeekProvider context if week data available */}
        {weekData && (viewMode === 'weekly' || viewMode === 'daily') && (
          <WeekProvider weekData={weekData}>
            <GoalSearchDialogWrapper
              open={isGoalSearchOpen}
              onOpenChange={handleGoalSearchOpenChange}
              onGoalSelect={handleGoalSelect}
              onAdhocGoalSelect={handleAdhocGoalSelect}
              onDomainSelect={handleDomainSelect}
              onJumpToQuarter={handleJumpToQuarter}
              onNewAdhocGoal={handleNewAdhocGoal}
              isGoalModalOpen={
                isGoalQuickViewOpen || isAdhocGoalQuickViewOpen || isDomainPopoverOpen
              }
            />
            <CreateAdhocGoalDialog
              open={isCreateAdhocGoalOpen}
              onOpenChange={handleCreateAdhocGoalOpenChange}
              year={selectedYear}
              weekNumber={selectedWeekNumber}
            />
            <GoalQuickViewModal
              open={isGoalQuickViewOpen}
              onOpenChange={handleGoalQuickViewOpenChange}
              goal={selectedGoal}
            />
            <AdhocGoalQuickViewModal
              open={isAdhocGoalQuickViewOpen}
              onOpenChange={setIsAdhocGoalQuickViewOpen}
              goal={selectedAdhocGoal}
              year={selectedYear}
              weekNumber={selectedWeekNumber}
            />
            {/* Render DomainPopover when a domain is selected */}
            {selectedDomain !== undefined && (
              <DomainPopover
                domain={selectedDomain}
                trigger={<div />}
                year={selectedYear}
                weekNumber={selectedWeekNumber}
                open={isDomainPopoverOpen}
                onOpenChange={setIsDomainPopoverOpen}
              />
            )}
          </WeekProvider>
        )}

        {/* Render goal quick view placeholder outside WeekProvider for quarterly view */}
        {viewMode === 'quarterly' && (
          <GoalQuickViewModal open={false} onOpenChange={() => {}} goal={null} />
        )}
        <div className="w-full">
          <FocusMenuBar
            viewMode={viewMode}
            selectedWeek={selectedWeekNumber}
            selectedDay={selectedDayOfWeek}
            isAtMinBound={isAtMinBound}
            isAtMaxBound={isAtMaxBound}
            onPrevious={onPrevious}
            onNext={onNext}
            selectedYear={selectedYear}
            selectedQuarter={selectedQuarter}
            selectedWeekYear={selectedWeekYear}
            onViewModeChange={onViewModeChange}
            onYearQuarterChange={onYearQuarterChange}
            onWeekYearChange={handleWeekYearChange}
            isFirstQuarter={isFirstQuarter}
            isMovingGoals={isMovingGoals}
            handlePreviewGoals={handlePreviewGoals}
            isPullingGoals={isPullingGoals}
            showPullGoals={showPullGoals}
            onPullGoals={handlePullGoals}
            pullGoalsDialog={pullGoalsDialog}
          />
        </div>
        <div className="w-full h-full">
          {viewMode === 'quarterly' && (
            <div key={quarterlyViewKey}>
              <FocusModeQuarterlyView year={selectedYear} quarter={selectedQuarter} />
            </div>
          )}

          {viewMode === 'weekly' && weekData && (
            <div className="w-full h-full md:max-w-4xl mx-auto" key={weeklyViewKey}>
              <FocusModeWeeklyView
                weekNumber={selectedWeekNumber}
                year={selectedYear}
                quarter={selectedQuarter}
                weekData={weekData}
                onJumpToToday={handleJumpToToday}
              />
            </div>
          )}

          {viewMode === 'daily' && weekData && (
            <div className="w-full h-full md:max-w-4xl mx-auto" key={dailyViewKey}>
              <FocusModeDailyView
                weekNumber={selectedWeekNumber}
                year={selectedYear}
                quarter={selectedQuarter}
                weekData={weekData}
                selectedDayOfWeek={selectedDayOfWeek}
                onJumpToCurrent={handleJumpToToday}
                isFocusModeEnabled={isFocusModeEnabled}
              />
            </div>
          )}

          {(viewMode === 'weekly' || viewMode === 'daily') && !weekData && (
            <div className="flex items-center justify-center min-h-[400px]">
              <div className="flex flex-col items-center gap-3">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground">Loading week data...</p>
              </div>
            </div>
          )}
        </div>

        {/* Render the quarter move dialog */}
        {quarterMoveDialog}
      </div>
    </GoalStatusProvider>
  );
};

/**
 * Wrapper component for GoalSearchDialog that provides data context from useWeek hook.
 * Must be rendered within a WeekProvider context.
 *
 * @internal
 *
 * @param props - Component props
 * @returns Rendered search dialog wrapper
 */
function GoalSearchDialogWrapper({
  open,
  onOpenChange,
  onGoalSelect,
  onAdhocGoalSelect,
  onDomainSelect,
  onJumpToQuarter,
  onNewAdhocGoal,
  isGoalModalOpen,
}: GoalSearchDialogWrapperProps) {
  const { weeklyGoals, dailyGoals, quarterlyGoals, weekNumber, year } = useWeekContext();

  // Fetch domains
  const { sessionId } = useSession();
  const domains = useQuery(api.domain.getDomains, { sessionId }) ?? [];

  // Fetch adhoc goals for the current week
  const adhocGoals =
    useQuery(api.adhocGoal.getAdhocGoalsForWeek, {
      sessionId,
      year,
      weekNumber,
    }) ?? [];

  return (
    <GoalSearchDialog
      open={open}
      onOpenChange={onOpenChange}
      weeklyGoals={weeklyGoals}
      dailyGoals={dailyGoals}
      quarterlyGoals={quarterlyGoals}
      domains={domains}
      adhocGoals={adhocGoals}
      onGoalSelect={onGoalSelect}
      onAdhocGoalSelect={onAdhocGoalSelect}
      onDomainSelect={onDomainSelect}
      onJumpToQuarter={onJumpToQuarter}
      onNewAdhocGoal={onNewAdhocGoal}
      isGoalModalOpen={isGoalModalOpen}
    />
  );
}
