import { DndContext, MouseSensor, useSensor, useSensors } from '@dnd-kit/core';
import { DateTime } from 'luxon';
import type React from 'react';
import { memo, useMemo } from 'react';
import { AdhocGoalsSection } from '@/components/organisms/focus/AdhocGoalsSection';
import { WeekCardDailyGoals } from '@/components/organisms/WeekCardDailyGoals';
import { WeekCardQuarterlyGoals } from '@/components/organisms/WeekCardQuarterlyGoals';
import { WeekCardWeeklyGoals } from '@/components/organisms/WeekCardWeeklyGoals';
import { useCurrentDateInfo } from '@/hooks/useCurrentDateTime';
import { useWeekWithoutDashboard, type WeekData } from '@/hooks/useWeek';
import { WeekCard } from '../week/WeekCard';
import { useMultiWeek } from './MultiWeekContext';
import { MultiWeekGrid } from './MultiWeekGrid';

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
  const weekDataFromBackend = useWeekWithoutDashboard({
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
          <AdhocGoalsSection weekNumber={week.weekNumber} showHeader={false} variant="inline" />
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

  // Get the current week/year/quarter info using our optimized hook
  const {
    year: currentYear,
    quarter: currentQuarter,
    weekNumber: currentWeekNumber,
  } = useCurrentDateInfo();

  // Find the index of the current week in our weeks array
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

  return (
    <div className="flex flex-col h-full">
      <DndContext sensors={sensors}>
        <MultiWeekGrid currentIndex={currentIndex} numItems={weeks.length}>
          {weeks.map((week) => {
            const isCurrentWeek =
              week.weekNumber === currentWeekNumber &&
              week.year === currentYear &&
              week.quarter === currentQuarter;

            return (
              <WeekCardContent
                key={`${week.year}-${week.quarter}-${week.weekNumber}`}
                week={week}
                isCurrentWeek={isCurrentWeek}
              />
            );
          })}
        </MultiWeekGrid>
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
