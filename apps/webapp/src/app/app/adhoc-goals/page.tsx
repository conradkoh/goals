'use client';

import type { Id } from '@services/backend/convex/_generated/dataModel';
import type { DayOfWeek } from '@services/backend/src/constants';
import { AdhocGoalList } from '@/components/organisms/AdhocGoalList';
import { useAdhocGoals } from '@/hooks/useAdhocGoals';
import { useDomains } from '@/hooks/useDomains';
import { useSession } from '@/modules/auth/useSession';

export default function AdhocGoalsPage() {
  const { sessionId } = useSession();
  const { adhocGoals, createAdhocGoal, updateAdhocGoal, deleteAdhocGoal } =
    useAdhocGoals(sessionId);
  const { domains, createDomain, updateDomain, deleteDomain } = useDomains(sessionId);

  const handleCreateGoal = async (data: {
    title: string;
    details?: string;
    domainId?: Id<'domains'> | null;
    weekNumber?: number;
    dayOfWeek?: DayOfWeek;
    dueDate?: number;
  }) => {
    await createAdhocGoal(
      data.title,
      data.details,
      data.domainId || undefined,
      data.weekNumber,
      data.dayOfWeek,
      data.dueDate
    );
  };

  const handleUpdateGoal = async (
    goalId: Id<'goals'>,
    updates: {
      title?: string;
      details?: string;
      domainId?: Id<'domains'> | null;
      weekNumber?: number;
      dayOfWeek?: DayOfWeek;
      dueDate?: number;
      isComplete?: boolean;
    }
  ) => {
    await updateAdhocGoal(goalId, {
      ...updates,
      domainId: updates.domainId || undefined,
    });
  };

  const handleDomainCreate = async (name: string, description?: string, color?: string) => {
    await createDomain(name, description, color);
  };

  return (
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
  );
}
