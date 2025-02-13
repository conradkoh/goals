'use client';

import { useDashboard } from '@/hooks/useDashboard';
import { QuarterlyGrid } from './quarterly-overview/QuarterlyGrid';
import { WeekCard } from './quarterly-overview/WeekCard';

export const QuarterlyOverviewScreen2 = () => {
  const { weekData, currentWeekNumber } = useDashboard();

  const currentIndex = weekData.findIndex(
    (week) => week.weekNumber === currentWeekNumber
  );

  return (
    <QuarterlyGrid currentIndex={currentIndex} numItems={weekData.length}>
      {weekData.map((week, weekIndex) => (
        <WeekCard
          key={weekIndex}
          weekLabel={week.weekLabel}
          mondayDate={week.mondayDate}
        >
          {/* We'll implement the content rendering here incrementally */}
        </WeekCard>
      ))}
    </QuarterlyGrid>
  );
};
