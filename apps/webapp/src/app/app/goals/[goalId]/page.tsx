'use client';

import type { Id } from '@workspace/backend/convex/_generated/dataModel';
import { DateTime } from 'luxon';
import { useParams, useSearchParams } from 'next/navigation';
import React from 'react';

import { GoalPageContent } from '@/components/molecules/goal-details-popover/variants/GoalPageContent';
import { getQuarterFromWeek } from '@/lib/date/iso-week';

/**
 * Goal Details Page
 *
 * Displays a single goal with full details and interactivity.
 * URL format: /app/goals/[goalId]?year=<year>&week=<week>&quarter=<quarter>
 *
 * Query parameters:
 * - year: The ISO week year for context (defaults to current year)
 * - week: The week number for context (defaults to current week)
 * - quarter: The quarter for context (derived from week if not provided)
 */
export default function GoalPage() {
  const params = useParams();
  const searchParams = useSearchParams();

  // Parse goal ID from route params
  const goalId = params.goalId as Id<'goals'>;

  // Parse year, week, and quarter from search params
  const { year, weekNumber, quarter } = React.useMemo(() => {
    const now = DateTime.now();
    const yearParam = searchParams.get('year');
    const weekParam = searchParams.get('week');
    const quarterParam = searchParams.get('quarter');

    // Use ISO week year for consistency
    const year = yearParam ? Number.parseInt(yearParam) : now.weekYear;
    const weekNumber = weekParam ? Number.parseInt(weekParam) : now.weekNumber;
    const quarter = quarterParam
      ? (Number.parseInt(quarterParam) as 1 | 2 | 3 | 4)
      : getQuarterFromWeek(weekNumber);

    return { year, weekNumber, quarter };
  }, [searchParams]);

  // Set page title
  React.useEffect(() => {
    const originalTitle = document.title;
    document.title = 'Goal Details';

    return () => {
      document.title = originalTitle;
    };
  }, []);

  return <GoalPageContent goalId={goalId} year={year} weekNumber={weekNumber} quarter={quarter} />;
}
