import React, { memo, useMemo } from 'react';
import { useMultiWeek } from './MultiWeekContext';
import { WeekCard } from '../quarterly-overview/WeekCard';
import { QuarterlyGrid } from '../quarterly-overview/QuarterlyGrid';
import { useRouter } from 'next/navigation';
import { DateTime } from 'luxon';
import { DayOfWeek } from '@/lib/constants';
import { DndContext, MouseSensor, useSensor, useSensors } from '@dnd-kit/core';
import { WeekProviderWithoutDashboard } from '@/hooks/useWeek';
import { WeekCardQuarterlyGoals } from '@/components/design/quarterly-overview/week-card-sections/WeekCardQuarterlyGoals';
import { WeekCardWeeklyGoals } from '@/components/design/quarterly-overview/week-card-sections/WeekCardWeeklyGoals';
import { WeekCardDailyGoals } from '@/components/design/quarterly-overview/week-card-sections/WeekCardDailyGoals';

// Memoized week card component to prevent unnecessary re-renders
const MemoizedWeekCardContent = memo(
  ({
    week,
    isCurrentWeek,
    handleFocusClick,
  }: {
    week: {
      year: number;
      quarter: number;
      weekNumber: number;
      weekData: any;
      isLoading: boolean;
    };
    isCurrentWeek: boolean;
    handleFocusClick: (
      weekNumber: number,
      year: number,
      quarter: number
    ) => void;
  }) => {
    // Format the date as a string for mondayDate
    const mondayDate = new Date(
      week.year,
      (week.quarter - 1) * 3,
      1 + (week.weekNumber - 1) * 7
    );
    const mondayDateString = mondayDate.toISOString().split('T')[0]; // Format as YYYY-MM-DD

    // Create days array with proper format
    const days = useMemo(() => {
      return Array(7)
        .fill(null)
        .map((_, i) => {
          const date = new Date(mondayDate.getTime() + i * 24 * 60 * 60 * 1000);
          return {
            dayOfWeek: (i % 7) as DayOfWeek,
            date: date.toISOString().split('T')[0], // Format as YYYY-MM-DD
            dateTimestamp: date.getTime(),
            goals: [],
          };
        });
    }, [mondayDate]);

    const weekData = useMemo(
      () => ({
        weekLabel: `Week ${week.weekNumber}`,
        weekNumber: week.weekNumber,
        mondayDate: mondayDateString,
        days,
        tree: week.weekData.tree || { allGoals: [] },
      }),
      [week.weekNumber, mondayDateString, days, week.weekData.tree]
    );

    return (
      <WeekCard
        key={`${week.year}-${week.quarter}-${week.weekNumber}`}
        year={week.year}
        quarter={week.quarter}
        weekLabel={`Week ${week.weekNumber}`}
        mondayDate={mondayDateString}
        weekNumber={week.weekNumber}
        isCurrentWeek={isCurrentWeek}
        onFocusClick={() =>
          handleFocusClick(week.weekNumber, week.year, week.quarter)
        }
        weekData={weekData}
      >
        <div className="space-y-2 md:space-y-4">
          <WeekCardSection title="💭 Quarterly Goals">
            <WeekProviderWithoutDashboard weekData={week.weekData}>
              <WeekCardQuarterlyGoals
                weekNumber={week.weekNumber}
                year={week.year}
                quarter={week.quarter}
                isLoading={week.isLoading}
              />
            </WeekProviderWithoutDashboard>
          </WeekCardSection>

          <WeekCardSection title="🚀 Weekly Goals">
            <WeekProviderWithoutDashboard weekData={week.weekData}>
              <WeekCardWeeklyGoals
                weekNumber={week.weekNumber}
                year={week.year}
                quarter={week.quarter}
                isLoading={week.isLoading}
              />
            </WeekProviderWithoutDashboard>
          </WeekCardSection>

          <WeekCardSection title="📊 Daily Goals">
            <WeekProviderWithoutDashboard weekData={week.weekData}>
              <WeekCardDailyGoals
                weekNumber={week.weekNumber}
                year={week.year}
                quarter={week.quarter}
                isLoading={week.isLoading}
              />
            </WeekProviderWithoutDashboard>
          </WeekCardSection>
        </div>
      </WeekCard>
    );
  }
);

MemoizedWeekCardContent.displayName = 'MemoizedWeekCardContent';

export const MultiWeekLayout = memo(() => {
  const { weeks } = useMultiWeek();
  const router = useRouter();

  // Get the current week number
  const currentDate = new Date();
  const firstDayOfYear = new Date(currentDate.getFullYear(), 0, 1);
  const pastDaysOfYear =
    (currentDate.getTime() - firstDayOfYear.getTime()) / 86400000;
  const currentWeekNumber = Math.ceil(
    (pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7
  );
  const currentYear = currentDate.getFullYear();
  const currentQuarter = Math.floor(currentDate.getMonth() / 3) + 1;

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

  // Handle focus click to navigate to the focus page
  const handleFocusClick = React.useCallback(
    (weekNumber: number, year: number, quarter: number) => {
      router.push(`/focus?year=${year}&quarter=${quarter}&week=${weekNumber}`);
    },
    [router]
  );

  return (
    <div className="flex flex-col h-full">
      <DndContext sensors={sensors}>
        <QuarterlyGrid currentIndex={currentIndex} numItems={weeks.length}>
          {weeks.map(
            (week: {
              year: number;
              quarter: number;
              weekNumber: number;
              weekData: any;
              isLoading: boolean;
            }) => {
              const isCurrentWeek =
                week.weekNumber === currentWeekNumber &&
                week.year === currentYear &&
                week.quarter === currentQuarter;

              return (
                <MemoizedWeekCardContent
                  key={`${week.year}-${week.quarter}-${week.weekNumber}`}
                  week={week}
                  isCurrentWeek={isCurrentWeek}
                  handleFocusClick={handleFocusClick}
                />
              );
            }
          )}
        </QuarterlyGrid>
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
