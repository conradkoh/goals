'use client';

import type { Id } from '@services/backend/convex/_generated/dataModel';
import type { DayOfWeek } from '@services/backend/src/constants';
import { AdhocGoalList } from '@/components/organisms/AdhocGoalList';
import { GoalStatusProvider } from '@/contexts/GoalStatusContext';
import { useAdhocGoals } from '@/hooks/useAdhocGoals';
import { useDomains } from '@/hooks/useDomains';
import { useSession } from '@/modules/auth/useSession';

/**
 * Data structure for creating a new adhoc goal.
 */
interface _CreateGoalData {
  title: string;
  details?: string;
  domainId?: Id<'domains'> | null;
  year: number;
  weekNumber: number;
  dayOfWeek?: DayOfWeek;
  dueDate?: number;
}

/**
 * Data structure for updating an existing adhoc goal.
 */
interface _UpdateGoalData {
  title?: string;
  details?: string;
  domainId?: Id<'domains'> | null;
  weekNumber?: number;
  dayOfWeek?: DayOfWeek;
  dueDate?: number;
  isComplete?: boolean;
}

/**
 * Page component for managing adhoc goals.
 * Provides CRUD operations for goals and domains.
 */
export default function AdhocGoalsPage() {
  const { sessionId } = useSession();
  const { adhocGoals, createAdhocGoal, updateAdhocGoal, deleteAdhocGoal } =
    useAdhocGoals(sessionId);
  const { domains, createDomain, updateDomain, deleteDomain } = useDomains(sessionId);

  /**
   * Handles creating a new adhoc goal.
   */
  const handleCreateGoal = async (data: _CreateGoalData) => {
    await createAdhocGoal(
      data.title,
      data.details,
      data.domainId || undefined,
      data.year,
      data.weekNumber,
      data.dayOfWeek,
      data.dueDate
    );
  };

  /**
   * Handles updating an existing adhoc goal.
   */
  const handleUpdateGoal = async (goalId: Id<'goals'>, updates: _UpdateGoalData) => {
    await updateAdhocGoal(goalId, {
      ...updates,
      domainId: updates.domainId || undefined,
    });
  };

  /**
   * Handles creating a new domain.
   */
  const handleDomainCreate = async (name: string, description?: string, color?: string) => {
    return await createDomain(name, description, color);
  };

  return (
    <GoalStatusProvider>
      <div className="container mx-auto py-8 px-4">
        <AdhocGoalList
          adhocGoals={adhocGoals}
          domains={domains}
          onCreateGoal={handleCreateGoal}
          onUpdateGoal={handleUpdateGoal}
          onDeleteGoal={deleteAdhocGoal}
          onDomainCreate={handleDomainCreate}
          onDomainUpdate={async (domainId, name, description, color) => {
            await updateDomain(domainId, { name, description, color });
          }}
          onDomainDelete={deleteDomain}
        />
      </div>
    </GoalStatusProvider>
  );
}
