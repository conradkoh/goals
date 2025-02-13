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
import { Id } from '@services/backend/convex/_generated/dataModel';

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

    const sourceData = active.data.current as {
      goal: { id: string };
      state: { isStarred: boolean; isPinned: boolean };
      sourceWeekNumber: number;
      shiftKey: boolean;
    };
    const targetWeekNumber = parseInt(over.id.toString().split('-')[1], 10);

    if (sourceData.sourceWeekNumber === targetWeekNumber) return;

    try {
      // Port over the status (starred/pinned) to the target week
      await updateQuarterlyGoalStatus({
        weekNumber: targetWeekNumber,
        goalId: sourceData.goal.id as Id<'goals'>,
        isStarred: sourceData.state.isStarred,
        isPinned: sourceData.state.isPinned,
      });

      // If shift key is not pressed and the item was starred or pinned,
      // remove the star/pin from the source week
      if (
        !sourceData.shiftKey &&
        (sourceData.state.isStarred || sourceData.state.isPinned)
      ) {
        await updateQuarterlyGoalStatus({
          weekNumber: sourceData.sourceWeekNumber,
          goalId: sourceData.goal.id as Id<'goals'>,
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
        {weekData.map((week, weekIndex) => (
          <WeekCard
            key={weekIndex}
            weekLabel={week.weekLabel}
            mondayDate={week.mondayDate}
          >
            <div className="space-y-6">
              <WeekCardSection title="Quarterly Goals">
                <WeekCardQuarterlyGoals
                  weekNumber={week.weekNumber}
                  quarterlyGoals={week.quarterlyGoals}
                  quarterlyGoalStates={week.quarterlyGoalStates}
                />
              </WeekCardSection>

              <WeekCardSection title="Weekly Goals">
                {/* Weekly goals content will go here */}
              </WeekCardSection>

              <WeekCardSection title="Daily Goals">
                {/* Daily goals content will go here */}
              </WeekCardSection>
            </div>
          </WeekCard>
        ))}
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
