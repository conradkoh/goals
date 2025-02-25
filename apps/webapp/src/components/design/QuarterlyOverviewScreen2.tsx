'use client';

import { WeekCardDailyGoals } from '@/components/design/quarterly-overview/week-card-sections/WeekCardDailyGoals';
import { WeekCardWeeklyGoals } from '@/components/design/quarterly-overview/week-card-sections/WeekCardWeeklyGoals';
import { useDashboard } from '@/hooks/useDashboard';
import { useGoalActions } from '@/hooks/useGoalActions';
import {
  DndContext,
  DragEndEvent,
  MouseSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { GoalWithDetailsAndChildren } from '@services/backend/src/usecase/getWeekDetails';
import { useRouter } from 'next/navigation';
import { QuarterlyGrid } from './quarterly-overview/QuarterlyGrid';
import { WeekCard } from './quarterly-overview/WeekCard';
import { WeekCardQuarterlyGoals } from './quarterly-overview/week-card-sections/WeekCardQuarterlyGoals';
import { DayOfWeek } from '@/lib/constants';

export interface DragData {
  goal: GoalWithDetailsAndChildren;
  state: GoalWithDetailsAndChildren['state'];
  sourceWeekNumber: number;
  shiftKey: boolean;
}

export const QuarterlyOverviewScreen2 = () => {
  const { weekData, selectedQuarter, selectedYear, currentWeekNumber } =
    useDashboard();
  const { updateQuarterlyGoalStatus } = useGoalActions();
  const router = useRouter();

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

  const handleFocusClick = (weekNumber: number) => {
    router.push(
      `/focus?year=${selectedYear}&quarter=${selectedQuarter}&week=${weekNumber}`
    );
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
        year: selectedYear,
        quarter: selectedQuarter,
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
          year: selectedYear,
          quarter: selectedQuarter,
        });
      }
    } catch (error) {
      console.error('Failed to update goal status:', error);
    }
  };

  return (
    <div className="flex flex-col h-full pt-2">
      <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
        <QuarterlyGrid currentIndex={currentIndex} numItems={weekData.length}>
          {weekData.map((week, weekIndex) => {
            // Cast dayOfWeek to DayOfWeek type
            const weekDataWithTypedDays = {
              ...week,
              days: week.days.map((day) => ({
                ...day,
                dayOfWeek: day.dayOfWeek as DayOfWeek,
              })),
            };

            return (
              <WeekCard
                year={selectedYear}
                quarter={selectedQuarter}
                key={weekIndex}
                weekLabel={week.weekLabel}
                mondayDate={week.mondayDate}
                weekNumber={week.weekNumber}
                isCurrentWeek={week.weekNumber === currentWeekNumber}
                onFocusClick={() => handleFocusClick(week.weekNumber)}
                weekData={weekDataWithTypedDays}
              >
                <div className="space-y-2 md:space-y-4">
                  <WeekCardSection title="💭 Quarterly Goals">
                    <WeekCardQuarterlyGoals
                      weekNumber={week.weekNumber}
                      year={selectedYear}
                      quarter={selectedQuarter}
                    />
                  </WeekCardSection>

                  <WeekCardSection title="🚀 Weekly Goals">
                    <WeekCardWeeklyGoals
                      weekNumber={week.weekNumber}
                      year={selectedYear}
                      quarter={selectedQuarter}
                    />
                  </WeekCardSection>

                  <WeekCardSection title="🔍 Daily Goals">
                    <WeekCardDailyGoals
                      weekNumber={week.weekNumber}
                      year={selectedYear}
                      quarter={selectedQuarter}
                    />
                  </WeekCardSection>
                </div>
              </WeekCard>
            );
          })}
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

const WeekCardSection = ({ title, children }: WeekCardSectionProps) => {
  return (
    <div className="space-y-3 md:space-y-4">
      <div className="flex justify-between items-center px-2 py-1 rounded-md">
        <h3 className="font-semibold text-sm md:text-base">{title}</h3>
      </div>
      <div className="space-y-1.5 md:space-y-2">{children}</div>
    </div>
  );
};
