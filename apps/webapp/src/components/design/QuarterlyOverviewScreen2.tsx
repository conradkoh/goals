'use client';

import { useDashboard } from '@/hooks/useDashboard';
import { QuarterlyGrid } from './quarterly-overview/QuarterlyGrid';
import { WeekCard } from './quarterly-overview/WeekCard';
import { WeekCardQuarterlyGoals } from './quarterly-overview/week-card-sections/WeekCardQuarterlyGoals';

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
