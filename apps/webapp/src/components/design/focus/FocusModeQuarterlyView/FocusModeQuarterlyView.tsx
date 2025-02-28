import React, { memo } from 'react';
import { WeekData, WeekProviderWithoutDashboard } from '@/hooks/useWeek';
import { WeekCardQuarterlyGoals } from '@/components/design/quarterly-overview/week-card-sections/WeekCardQuarterlyGoals';
import { Skeleton } from '@/components/ui/skeleton';

interface FocusModeQuarterlyViewProps {
  year: number;
  quarter: number;
  weekData: WeekData;
  isLoading?: boolean;
}

// Loading skeleton for quarterly goals
const QuarterlyGoalsSkeleton = () => (
  <div className="space-y-3">
    <Skeleton className="h-10 w-full" />
    <Skeleton className="h-10 w-5/6" />
    <Skeleton className="h-10 w-4/5" />
  </div>
);

// Use React.memo to prevent unnecessary re-renders
export const FocusModeQuarterlyView = memo(
  ({
    year,
    quarter,
    weekData,
    isLoading = false,
  }: FocusModeQuarterlyViewProps) => {
    // If loading, show skeleton
    if (isLoading) {
      return (
        <div className="space-y-4">
          <QuarterlyGoalsSkeleton />
        </div>
      );
    }

    // Ensure weekData is valid before rendering
    if (!weekData || !weekData.tree) {
      return null;
    }

    return (
      <div className="space-y-4">
        <WeekProviderWithoutDashboard weekData={weekData}>
          <WeekCardQuarterlyGoals
            weekNumber={weekData.weekNumber}
            year={year}
            quarter={quarter}
          />
        </WeekProviderWithoutDashboard>
      </div>
    );
  }
);

FocusModeQuarterlyView.displayName = 'FocusModeQuarterlyView';
