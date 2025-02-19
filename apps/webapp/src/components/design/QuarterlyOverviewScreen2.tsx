'use client';

import { useDashboard } from '@/hooks/useDashboard';
import { QuarterlyGrid } from './quarterly-overview/QuarterlyGrid';
import { WeekCard } from './quarterly-overview/WeekCard';
import { WeekCardQuarterlyGoals } from './quarterly-overview/week-card-sections/WeekCardQuarterlyGoals';
import {
  DndContext,
  DragEndEvent,
  MouseSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { WeekCardWeeklyGoals } from '@/components/design/quarterly-overview/week-card-sections/WeekCardWeeklyGoals';
import {
  WeekCardDailyGoals,
  WeekCardDailyGoalsRef,
} from '@/components/design/quarterly-overview/week-card-sections/WeekCardDailyGoals';
import { GoalWithDetailsAndChildren } from '@services/backend/src/usecase/getWeekDetails';
import { Button } from '@/components/ui/button';
import { Focus } from 'lucide-react';
import { useRef } from 'react';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export interface DragData {
  goal: GoalWithDetailsAndChildren;
  state: GoalWithDetailsAndChildren['state'];
  sourceWeekNumber: number;
  shiftKey: boolean;
}

export const QuarterlyOverviewScreen2 = () => {
  const { weekData, currentWeekNumber, updateQuarterlyGoalStatus } =
    useDashboard();

  const mouseSensor = useSensor(MouseSensor, {
    // Require the mouse to move by 10 pixels before activating
    activationConstraint: {
      distance: 10,
    },
  });
  const sensors = useSensors(mouseSensor);

  const currentIndex = weekData.findIndex(
    (week) => week.weekNumber === currentWeekNumber
  );

  // Create an array of refs for each week
  const dailyGoalsRefs = useRef<(WeekCardDailyGoalsRef | null)[]>([]);
  // Initialize the refs array with the correct length
  if (dailyGoalsRefs.current.length !== weekData.length) {
    dailyGoalsRefs.current = Array(weekData.length).fill(null);
  }

  // Ref callback to store the ref at the correct index
  const setDailyGoalRef =
    (index: number) => (el: WeekCardDailyGoalsRef | null) => {
      dailyGoalsRefs.current[index] = el;
    };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over || !active.data.current) return;

    const sourceData = active.data.current as DragData;
    const targetWeekNumber = parseInt(over.id.toString().split('-')[1], 10);

    if (sourceData.sourceWeekNumber === targetWeekNumber) return;

    try {
      // Port over the status (starred/pinned) to the target week
      await updateQuarterlyGoalStatus({
        weekNumber: targetWeekNumber,
        goalId: sourceData.goal._id,
        isStarred: sourceData.state?.isStarred ?? false,
        isPinned: sourceData.state?.isPinned ?? false,
      });

      // If shift key is not pressed and the item was starred or pinned,
      // remove the star/pin from the source week
      if (
        !sourceData.shiftKey &&
        (sourceData.state?.isStarred || sourceData.state?.isPinned)
      ) {
        await updateQuarterlyGoalStatus({
          weekNumber: sourceData.sourceWeekNumber,
          goalId: sourceData.goal._id,
          isStarred: false,
          isPinned: false,
        });
      }
    } catch (error) {
      console.error('Failed to update goal status:', error);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
        <QuarterlyGrid currentIndex={currentIndex} numItems={weekData.length}>
          {weekData.map((week, weekIndex) => (
            <WeekCard
              key={weekIndex}
              weekLabel={week.weekLabel}
              mondayDate={week.mondayDate}
              weekNumber={week.weekNumber}
              isCurrentWeek={week.weekNumber === currentWeekNumber}
              onFocusClick={() =>
                dailyGoalsRefs.current[weekIndex]?.openFocusMode()
              }
            >
              <div className="space-y-6">
                <WeekCardSection title="Quarterly Goals">
                  <WeekCardQuarterlyGoals weekNumber={week.weekNumber} />
                </WeekCardSection>

                <div className="border-t border-gray-100" />

                <WeekCardSection title="Weekly Goals">
                  <WeekCardWeeklyGoals weekNumber={week.weekNumber} />
                </WeekCardSection>

                <div className="border-t border-gray-100" />

                <WeekCardSection title="Daily Goals">
                  <WeekCardDailyGoals
                    ref={setDailyGoalRef(weekIndex)}
                    weekNumber={week.weekNumber}
                  />
                </WeekCardSection>
              </div>
            </WeekCard>
          ))}
        </QuarterlyGrid>
      </DndContext>
    </div>
  );
};

interface WeekCardSectionProps {
  title: string;
  children?: React.ReactNode;
  showFocusMode?: boolean;
  onFocusClick?: () => void;
}

const WeekCardSection = ({
  title,
  children,
  showFocusMode,
  onFocusClick,
}: WeekCardSectionProps) => {
  return (
    <div className="space-y-4">
      <div
        className={cn(
          'group flex justify-between items-center px-2 py-1 rounded-md',
          showFocusMode && 'hover:bg-gray-50/50 cursor-pointer'
        )}
      >
        <h3 className="font-semibold">{title}</h3>
        {showFocusMode && (
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={onFocusClick}
            >
              <Focus className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>
      <div className="space-y-2">{children}</div>
    </div>
  );
};
