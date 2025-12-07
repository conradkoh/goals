import type { Doc, Id } from '@workspace/backend/convex/_generated/dataModel';
import { DomainPillView } from '@/components/atoms/DomainPill';
import { AdhocGoalItem } from '@/components/molecules/AdhocGoalItem';

interface AdhocGoalsListProps {
  goals: (Doc<'goals'> & { domain?: Doc<'domains'> })[];
  onCompleteChange: (goalId: Id<'goals'>, isComplete: boolean) => Promise<void>;
  onUpdate: (
    goalId: Id<'goals'>,
    title: string,
    details?: string,
    dueDate?: number,
    domainId?: Id<'domains'> | null
  ) => Promise<void>;
  onDelete: (goalId: Id<'goals'>) => Promise<void>;
  showDueDate?: boolean;
  emptyMessage?: string;
}

/**
 * Renders a list of adhoc goals grouped by domain.
 * Extracted component to enable reuse in Active/Completed tabs.
 */
export function AdhocGoalsList({
  goals,
  onCompleteChange,
  onUpdate,
  onDelete,
  showDueDate = true,
  emptyMessage = 'No tasks yet',
}: AdhocGoalsListProps) {
  // Group goals by domain
  const groupedGoals = goals.reduce(
    (acc, goal) => {
      const domainId = goal.domainId || 'uncategorized';
      if (!acc[domainId]) {
        acc[domainId] = {
          domain: goal.domain,
          goals: [],
        };
      }
      acc[domainId].goals.push(goal);
      return acc;
    },
    {} as Record<string, { domain?: Doc<'domains'>; goals: typeof goals }>
  );

  // Sort groups: domains first (alphabetically), then uncategorized
  const sortedGroups = Object.entries(groupedGoals).sort(([keyA, groupA], [keyB, groupB]) => {
    if (keyA === 'uncategorized') return 1;
    if (keyB === 'uncategorized') return -1;
    return (groupA.domain?.name || '').localeCompare(groupB.domain?.name || '');
  });

  // Show empty state if no goals
  if (sortedGroups.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <p className="text-sm">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {sortedGroups.map(([domainId, { domain, goals: domainGoals }]) => {
        return (
          <div key={domainId} className="space-y-1">
            <DomainPillView
              domainName={domain?.name || 'Uncategorized'}
              domainColor={domain?.color}
              count={domainGoals.length}
            />
            <div className="space-y-0.5">
              {domainGoals.map((goal) => (
                <AdhocGoalItem
                  key={goal._id}
                  goal={goal}
                  onCompleteChange={onCompleteChange}
                  onUpdate={onUpdate}
                  onDelete={onDelete}
                  showDueDate={showDueDate}
                  showDomain={false}
                />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
