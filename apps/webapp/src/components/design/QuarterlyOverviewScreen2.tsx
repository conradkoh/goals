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
import { WeekCardDailyGoals } from '@/components/design/quarterly-overview/week-card-sections/WeekCardDailyGoals';
import { GoalWithDetailsAndChildren } from '@services/backend/src/usecase/getWeekDetails';

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
    <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
      <QuarterlyGrid currentIndex={currentIndex} numItems={weekData.length}>
        {weekData.map((week, weekIndex) => {
          return (
            <WeekCard
              key={weekIndex}
              weekLabel={week.weekLabel}
              mondayDate={week.mondayDate}
              weekNumber={week.weekNumber}
            >
              <div className="space-y-6">
                <WeekCardSection title="Quarterly Goals">
                  <WeekCardQuarterlyGoals weekNumber={week.weekNumber} />
                </WeekCardSection>

                <WeekCardSection title="Weekly Goals">
                  <WeekCardWeeklyGoals weekNumber={week.weekNumber} />
                </WeekCardSection>

                <WeekCardSection title="Daily Goals">
                  <WeekCardDailyGoals weekNumber={week.weekNumber} />
                </WeekCardSection>
              </div>
            </WeekCard>
          );
        })}
      </QuarterlyGrid>
    </DndContext>
  );
};

interface WeekCardSectionProps {
  title: string;
  children?: React.ReactNode;
}

const WeekCardSection = ({ title, children }: WeekCardSectionProps) => {
  return (
    <div className="space-y-4">
      <h3 className="font-semibold">{title}</h3>
      <div className="space-y-2">{children}</div>
    </div>
  );
};
