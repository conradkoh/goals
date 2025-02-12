import { Id } from '@services/backend/convex/_generated/dataModel';
import { api } from '@services/backend/convex/_generated/api';
import { useQuery } from 'convex/react';
import { useState } from 'react';
/**
 * A custom hook that fetches the dashboard data for a specific user and session.
 * @returns An object containing the dashboard data and a loading state.
 */

export const useDashboard = () => {
  const userId = 'test-user' as Id<'users'>;
  const sessionId = 'test-session' as Id<'sessions'>;
  const [currentYear] = useState(new Date().getFullYear());
  const [currentQuarter] = useState(Math.ceil((new Date().getMonth() + 1) / 3));

  const data = useQuery(api.dashboard.getQuarterOverview, {
    userId,
    sessionId,
    year: currentYear,
    quarter: currentQuarter,
  });
  return {
    data,
    isLoading: data === undefined,
  };
};
