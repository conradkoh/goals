'use client';
import { useWeek2, WeekProvider2 } from '@/hooks/useWeek';
import { WeekCardDailyGoals } from '@/components/design/quarterly-overview/week-card-sections/WeekCardDailyGoals';
import { WeekCardQuarterlyGoals } from '@/components/design/quarterly-overview/week-card-sections/WeekCardQuarterlyGoals';
import { WeekCardWeeklyGoals } from '@/components/design/quarterly-overview/week-card-sections/WeekCardWeeklyGoals';

// Day of week constants
const DayOfWeek = {
  MONDAY: 1,
  TUESDAY: 2,
  WEDNESDAY: 3,
  THURSDAY: 4,
  FRIDAY: 5,
  SATURDAY: 6,
  SUNDAY: 7,
} as const;

type DayOfWeek = (typeof DayOfWeek)[keyof typeof DayOfWeek];

export const FocusPage = () => {
  const year = 2025;
  const quarter = 1;
  const week = 8;

  const weekDetails = useWeek2({ year, quarter, week });

  if (!weekDetails) {
    return <div>Loading...</div>;
  }

  return (
    <div className="container mx-auto py-8 space-y-6">
      {/* Weekly View */}
      <div className="space-y-6">
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="font-semibold mb-4">💭 Quarterly Goals</div>
          <WeekProvider2 weekData={weekDetails}>
            <WeekCardQuarterlyGoals
              weekNumber={weekDetails.weekNumber}
              year={year}
              quarter={quarter}
            />
          </WeekProvider2>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="font-semibold mb-4">🚀 Weekly Goals</div>
          <WeekProvider2 weekData={weekDetails}>
            <WeekCardWeeklyGoals
              weekNumber={weekDetails.weekNumber}
              year={year}
              quarter={quarter}
            />
          </WeekProvider2>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="font-semibold mb-4">🔍 Daily Goals</div>
          <WeekProvider2 weekData={weekDetails}>
            <WeekCardDailyGoals
              weekNumber={weekDetails.weekNumber}
              year={year}
              quarter={quarter}
            />
          </WeekProvider2>
        </div>
      </div>
    </div>
  );
};

export default FocusPage;
