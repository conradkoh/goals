'use client';

import type { Id } from '@workspace/backend/convex/_generated/dataModel';
import { useParams, useSearchParams } from 'next/navigation';
import React from 'react';

import { QuarterlyGoalPullPreviewContent } from '@/components/molecules/goal-details-popover/variants/QuarterlyGoalPullPreviewContent';

/**
 * Quarterly Goal Pull Preview Page
 *
 * Displays a quarterly goal with only the children from the last non-empty week.
 * This is used when previewing which goals will be pulled from a previous quarter.
 *
 * URL format: /app/quarterly-pull-preview/[goalId]?year=<year>&quarter=<quarter>
 *
 * Query parameters:
 * - year: The year of the quarter (required)
 * - quarter: The quarter number 1-4 (required)
 */
export default function QuarterlyGoalPullPreviewPage() {
  const params = useParams();
  const searchParams = useSearchParams();

  // Parse goal ID from route params
  const goalId = params.goalId as Id<'goals'>;

  // Parse year and quarter from search params (required)
  const { year, quarter } = React.useMemo(() => {
    const yearParam = searchParams.get('year');
    const quarterParam = searchParams.get('quarter');

    if (!yearParam || !quarterParam) {
      throw new Error('Year and quarter are required query parameters');
    }

    const yearNum = Number.parseInt(yearParam);
    const quarterNum = Number.parseInt(quarterParam);

    if (isNaN(yearNum) || isNaN(quarterNum) || quarterNum < 1 || quarterNum > 4) {
      throw new Error('Invalid year or quarter parameter');
    }

    // Safe to cast after validation
    return { year: yearNum, quarter: quarterNum as 1 | 2 | 3 | 4 };
  }, [searchParams]);

  // Set page title
  React.useEffect(() => {
    const originalTitle = document.title;
    document.title = `Quarterly Goal Preview - Q${quarter} ${year}`;

    return () => {
      document.title = originalTitle;
    };
  }, [year, quarter]);

  return <QuarterlyGoalPullPreviewContent goalId={goalId} year={year} quarter={quarter} />;
}
