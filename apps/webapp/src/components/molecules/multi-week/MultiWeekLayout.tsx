import {
  DndContext,
  DragOverlay,
  MouseSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import { api } from '@workspace/backend/convex/_generated/api';
import { useMutation } from 'convex/react';
import { DateTime } from 'luxon';
import type React from 'react';
import { memo, useCallback, useMemo, useState } from 'react';

import { useMultiWeek } from './MultiWeekContext';
import { MultiWeekGrid } from './MultiWeekGrid';
import { DroppableWeekColumn } from '../dnd/DroppableWeekColumn';
import {
  isQuarterlyGoalDrop,
  isWeekColumnDrop,
  isWeeklyGoalDrag,
  type QuarterlyGoalDropData,
  type WeekColumnDropData,
  type WeeklyGoalDragData,
} from '../dnd/types';
import { WeekCard } from '../week/WeekCard';

import { AdhocGoalsSection } from '@/components/organisms/focus/AdhocGoalsSection';
import { WeekCardDailyGoals } from '@/components/organisms/WeekCardDailyGoals';
import { WeekCardQuarterlyGoals } from '@/components/organisms/WeekCardQuarterlyGoals';
import { WeekCardWeeklyGoals } from '@/components/organisms/WeekCardWeeklyGoals';
import { toast } from '@/components/ui/use-toast';
import { useCurrentDateInfo } from '@/hooks/useCurrentDateTime';
import { useWeekData, type WeekData } from '@/hooks/useWeek';
import { useSession } from '@/modules/auth/useSession';

// Week card content component
const WeekCardContent = ({
  week,
  isCurrentWeek,
}: {
  week: {
    year: number;
    quarter: number;
    weekNumber: number;
    weekData: WeekData;
  };
  isCurrentWeek: boolean;
}) => {
  // Fetch the actual week data from the backend
  const weekDataFromBackend = useWeekData({
    year: week.year,
    quarter: week.quarter,
    week: week.weekNumber,
  });

  // Format the date as a string for mondayDate using Luxon for proper ISO week handling
  const mondayDate = DateTime.fromObject({
    weekYear: week.year,
    weekNumber: week.weekNumber,
  }).startOf('week');
  const mondayDateString = mondayDate.toFormat('yyyy-MM-dd');

  // Use the backend data if available, otherwise use placeholder data
  const weekData = useMemo(
    () => ({
      weekLabel: `Week ${week.weekNumber}`,
      weekNumber: week.weekNumber,
      mondayDate: mondayDateString,
      days: (weekDataFromBackend || week.weekData).days,
      tree: weekDataFromBackend?.tree || week.weekData.tree || { allGoals: [] },
      year: week.year,
      quarter: week.quarter,
    }),
    [week.weekNumber, mondayDateString, weekDataFromBackend, week.weekData, week.quarter, week.year]
  );

  // Loading state is determined by weekDataFromBackend being undefined
  const isLoading = weekDataFromBackend === undefined;

  // WeekCard already wraps children in WeekProviderWithoutDashboard
  // No need to wrap again here - the provider is at the WeekCard level
  return (
    <WeekCard
      year={week.year}
      quarter={week.quarter}
      weekLabel={`Week ${week.weekNumber}`}
      mondayDate={mondayDateString}
      weekNumber={week.weekNumber}
      isCurrentWeek={isCurrentWeek}
      weekData={weekData}
    >
      <div className="space-y-2 md:space-y-4">
        <WeekCardSection title="💭 Quarterly Goals">
          <WeekCardQuarterlyGoals
            weekNumber={week.weekNumber}
            year={week.year}
            quarter={week.quarter}
            isLoading={isLoading}
          />
        </WeekCardSection>

        <WeekCardSection title="🚀 Weekly Goals">
          <WeekCardWeeklyGoals
            weekNumber={week.weekNumber}
            year={week.year}
            quarter={week.quarter}
            isLoading={isLoading}
          />
        </WeekCardSection>

        <WeekCardSection title="📋 Adhoc Tasks">
          <AdhocGoalsSection
            year={week.year}
            weekNumber={week.weekNumber}
            showHeader={false}
            variant="inline"
          />
        </WeekCardSection>

        <WeekCardSection title="🔍 Daily Goals">
          <WeekCardDailyGoals weekNumber={week.weekNumber} year={week.year} isLoading={isLoading} />
        </WeekCardSection>
      </div>
    </WeekCard>
  );
};

// Update the displayName
WeekCardContent.displayName = 'WeekCardContent';

export const MultiWeekLayout = memo(() => {
  const { weeks } = useMultiWeek();
  const { sessionId } = useSession();
  const moveWeeklyGoalMutation = useMutation(api.goal.moveWeeklyGoalToWeek);
  const updateGoalParentMutation = useMutation(api.goal.updateGoalParent);

  // Get the current week/year/quarter info using our optimized hook
  // Use ISO week year and week-based quarter for consistency
  const {
    weekYear: currentYear,
    weekQuarter: currentQuarter,
    weekNumber: currentWeekNumber,
  } = useCurrentDateInfo();

  // Find the index of the current week in our weeks array
  // Compare using ISO week year and week-based quarter
  const currentIndex = useMemo(() => {
    const index = weeks.findIndex(
      (week) =>
        week.weekNumber === currentWeekNumber &&
        week.year === currentYear &&
        week.quarter === currentQuarter
    );

    // If not found, return -1 to indicate no current week in this view
    return index >= 0 ? index : -1;
  }, [weeks, currentWeekNumber, currentYear, currentQuarter]);

  // Set up DnD sensors
  const mouseSensor = useSensor(MouseSensor, {
    activationConstraint: {
      distance: 10,
    },
  });
  const sensors = useSensors(mouseSensor);

  // Drag state management
  const [activeDragData, setActiveDragData] = useState<WeeklyGoalDragData | null>(null);
  const [isProcessingDrop, setIsProcessingDrop] = useState(false);

  /**
   * Handle drag start - store the dragged item data
   * Don't allow starting a new drag while processing a previous drop
   */
  const handleDragStart = useCallback(
    (event: DragStartEvent) => {
      if (isProcessingDrop) {
        return;
      }
      const { active } = event;
      if (active.data.current && isWeeklyGoalDrag(active.data.current)) {
        setActiveDragData(active.data.current);
      }
    },
    [isProcessingDrop]
  );

  /**
   * Handle moving a weekly goal to a different week
   */
  const handleMoveGoalToWeek = useCallback(
    async (dragData: WeeklyGoalDragData, dropData: WeekColumnDropData) => {
      // Don't move if same week
      if (
        dragData.sourceWeek.weekNumber === dropData.weekNumber &&
        dragData.sourceWeek.year === dropData.year &&
        dragData.sourceWeek.quarter === dropData.quarter
      ) {
        return;
      }

      if (!sessionId) {
        toast({
          title: 'Not authenticated',
          description: 'Please log in to move goals',
          variant: 'destructive',
        });
        return;
      }

      setIsProcessingDrop(true);
      try {
        await moveWeeklyGoalMutation({
          sessionId,
          goalId: dragData.goalId,
          currentWeek: {
            year: dragData.sourceWeek.year,
            quarter: dragData.sourceWeek.quarter,
            weekNumber: dragData.sourceWeek.weekNumber,
          },
          targetWeek: {
            year: dropData.year,
            quarter: dropData.quarter,
            weekNumber: dropData.weekNumber,
          },
        });

        toast({
          title: 'Goal moved',
          description: `"${dragData.goalTitle}" moved to Week ${dropData.weekNumber}`,
        });
      } catch (error) {
        console.error('[DnD] Failed to move goal:', error);
        toast({
          title: 'Failed to move goal',
          description: error instanceof Error ? error.message : 'An error occurred',
          variant: 'destructive',
        });
      } finally {
        setIsProcessingDrop(false);
      }
    },
    [sessionId, moveWeeklyGoalMutation]
  );

  /**
   * Handle reparenting a weekly goal to a different quarterly goal
   */
  const handleReparentGoal = useCallback(
    async (dragData: WeeklyGoalDragData, dropData: QuarterlyGoalDropData) => {
      // Don't reparent to the same parent
      if (dragData.parentId === dropData.quarterlyGoalId) {
        return;
      }

      if (!sessionId) {
        toast({
          title: 'Not authenticated',
          description: 'Please log in to reparent goals',
          variant: 'destructive',
        });
        return;
      }

      setIsProcessingDrop(true);
      try {
        await updateGoalParentMutation({
          sessionId,
          goalId: dragData.goalId,
          newParentId: dropData.quarterlyGoalId,
        });

        toast({
          title: 'Goal reparented',
          description: `"${dragData.goalTitle}" moved under "${dropData.quarterlyGoalTitle}"`,
        });
      } catch (error) {
        console.error('[DnD] Failed to reparent goal:', error);
        toast({
          title: 'Failed to reparent goal',
          description: error instanceof Error ? error.message : 'An error occurred',
          variant: 'destructive',
        });
      } finally {
        setIsProcessingDrop(false);
      }
    },
    [sessionId, updateGoalParentMutation]
  );

  /**
   * Handle drag end - process the drop
   */
  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;

      // Reset drag state
      setActiveDragData(null);

      // If no drop target, cancel
      if (!over) {
        return;
      }

      // Get drag data
      const dragData = active.data.current;
      if (!dragData || !isWeeklyGoalDrag(dragData)) {
        return;
      }

      // Get drop data
      const dropData = over.data.current;
      if (!dropData) {
        return;
      }

      // Handle week column drops (week-to-week movement)
      if (isWeekColumnDrop(dropData)) {
        void handleMoveGoalToWeek(dragData, dropData);
        return;
      }

      // Handle quarterly goal drops (reparenting)
      if (isQuarterlyGoalDrop(dropData)) {
        void handleReparentGoal(dragData, dropData);
        return;
      }
    },
    [handleMoveGoalToWeek, handleReparentGoal]
  );

  /**
   * Handle drag cancel - reset state
   */
  const handleDragCancel = useCallback(() => {
    setActiveDragData(null);
  }, []);

  return (
    <div className="flex flex-col h-full">
      <DndContext
        sensors={sensors}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragCancel={handleDragCancel}
      >
        <MultiWeekGrid currentIndex={currentIndex} numItems={weeks.length}>
          {weeks.map((week) => {
            // Compare using ISO week year and week-based quarter
            const isCurrentWeek =
              week.weekNumber === currentWeekNumber &&
              week.year === currentYear &&
              week.quarter === currentQuarter;

            return (
              <DroppableWeekColumn
                key={`${week.year}-${week.quarter}-${week.weekNumber}`}
                year={week.year}
                quarter={week.quarter}
                weekNumber={week.weekNumber}
              >
                <WeekCardContent week={week} isCurrentWeek={isCurrentWeek} />
              </DroppableWeekColumn>
            );
          })}
        </MultiWeekGrid>

        {/* Drag overlay - shows the dragged item while dragging */}
        <DragOverlay>
          {activeDragData && (
            <div className="bg-card border border-border shadow-lg rounded-md px-3 py-2 opacity-90">
              <span className="text-sm font-medium">{activeDragData.goalTitle}</span>
            </div>
          )}
        </DragOverlay>
      </DndContext>
    </div>
  );
});

MultiWeekLayout.displayName = 'MultiWeekLayout';

interface WeekCardSectionProps {
  title: string;
  children?: React.ReactNode;
}

const WeekCardSection = memo(({ title, children }: WeekCardSectionProps) => {
  return (
    <div className="space-y-3 md:space-y-4">
      <div className="flex justify-between items-center px-2 py-1 rounded-md">
        <h3 className="font-semibold text-sm md:text-base">{title}</h3>
      </div>
      <div className="space-y-1.5 md:space-y-2">{children}</div>
    </div>
  );
});

WeekCardSection.displayName = 'WeekCardSection';
