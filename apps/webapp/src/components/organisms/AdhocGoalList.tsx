import type { Doc, Id } from '@workspace/backend/convex/_generated/dataModel';
import type { DayOfWeek } from '@workspace/backend/src/constants';
import { Plus } from 'lucide-react';
import { useState } from 'react';
import { AdhocGoalForm } from '@/components/molecules/AdhocGoalForm';
import { AdhocGoalItem } from '@/components/molecules/AdhocGoalItem';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

/**
 * Props for the AdhocGoalList component.
 */
export interface AdhocGoalListProps {
  /** Array of adhoc goals with domain information */
  adhocGoals: (Doc<'goals'> & { domain?: Doc<'domains'> })[];
  /** Available domains for filtering and creation */
  domains: Doc<'domains'>[];
  /** Callback to create a new goal */
  onCreateGoal?: (data: {
    title: string;
    details?: string;
    domainId?: Id<'domains'> | null;
    year: number;
    weekNumber: number;
    dayOfWeek?: DayOfWeek;
    dueDate?: number;
  }) => Promise<void>;
  onUpdateGoal?: (
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
  ) => Promise<void>;
  onDeleteGoal?: (goalId: Id<'goals'>) => Promise<void>;
  onDomainCreate?: (name: string, description?: string, color?: string) => Promise<Id<'domains'>>;
  onDomainUpdate?: (
    domainId: Id<'domains'>,
    name: string,
    description?: string,
    color?: string
  ) => Promise<void>;
  onDomainDelete?: (domainId: Id<'domains'>) => Promise<void>;
  title?: string;
  showCreateButton?: boolean;
  showFilters?: boolean;
  className?: string;
}

/**
 * Filter options for the goal list.
 */
type _FilterOption = 'all' | 'complete' | 'incomplete' | 'today' | 'this-week';

export function AdhocGoalList({
  adhocGoals,
  domains,
  onCreateGoal,
  onUpdateGoal,
  onDeleteGoal,
  onDomainCreate,
  onDomainUpdate,
  onDomainDelete,
  title = 'Adhoc Goals',
  showCreateButton = true,
  showFilters = true,
  className,
}: AdhocGoalListProps) {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<
    (Doc<'goals'> & { domain?: Doc<'domains'> }) | null
  >(null);
  const [filter, setFilter] = useState<_FilterOption>('all');
  const [selectedDomainId, setSelectedDomainId] = useState<string>('all');

  // Filter goals based on selected filters
  const filteredGoals = adhocGoals.filter((goal) => {
    // Status filter
    if (filter === 'complete' && !goal.isComplete) return false;
    if (filter === 'incomplete' && goal.isComplete) return false;

    // Domain filter
    if (selectedDomainId !== 'all') {
      if (selectedDomainId === 'uncategorized') {
        if (goal.domainId) return false;
      } else {
        if (goal.domainId !== selectedDomainId) return false;
      }
    }

    return true;
  });

  // Group goals by domain for better organization
  const goalsByDomain = filteredGoals.reduce(
    (acc, goal) => {
      const domainKey = goal.domain?.name || 'Uncategorized';
      if (!acc[domainKey]) {
        acc[domainKey] = {
          domain: goal.domain,
          goals: [],
        };
      }
      acc[domainKey].goals.push(goal);
      return acc;
    },
    {} as Record<
      string,
      { domain?: Doc<'domains'>; goals: (Doc<'goals'> & { domain?: Doc<'domains'> })[] }
    >
  );

  const handleCreateGoal = async (data: Parameters<NonNullable<typeof onCreateGoal>>[0]) => {
    if (!onCreateGoal) return;

    try {
      await onCreateGoal(data);
      setIsCreateDialogOpen(false);
    } catch (error) {
      console.error('Failed to create adhoc goal:', error);
    }
  };

  const handleUpdateGoal = async (
    goalId: Id<'goals'>,
    updates: Parameters<NonNullable<typeof onUpdateGoal>>[1]
  ) => {
    if (!onUpdateGoal) return;

    try {
      await onUpdateGoal(goalId, updates);
      setEditingGoal(null);
    } catch (error) {
      console.error('Failed to update adhoc goal:', error);
    }
  };

  const handleCompleteChange = async (goalId: Id<'goals'>, isComplete: boolean) => {
    if (!onUpdateGoal) return;

    try {
      await onUpdateGoal(goalId, { isComplete });
    } catch (error) {
      console.error('Failed to update goal completion:', error);
    }
  };

  const handleUpdateGoalItem = async (
    goalId: Id<'goals'>,
    title: string,
    details?: string,
    dueDate?: number,
    domainId?: Id<'domains'> | null
  ) => {
    if (!onUpdateGoal) return;

    try {
      await onUpdateGoal(goalId, { title, details, dueDate, domainId });
    } catch (error) {
      console.error('Failed to update adhoc goal:', error);
    }
  };

  const handleDelete = async (goalId: Id<'goals'>) => {
    if (!onDeleteGoal) return;

    try {
      await onDeleteGoal(goalId);
    } catch (error) {
      console.error('Failed to delete adhoc goal:', error);
    }
  };

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>{title}</CardTitle>

          {showCreateButton && onCreateGoal && (
            <Button onClick={() => setIsCreateDialogOpen(true)} size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Add Goal
            </Button>
          )}
        </div>

        {showFilters && (
          <div className="flex gap-2">
            <Select value={filter} onValueChange={(value) => setFilter(value as _FilterOption)}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Goals</SelectItem>
                <SelectItem value="incomplete">Incomplete</SelectItem>
                <SelectItem value="complete">Complete</SelectItem>
              </SelectContent>
            </Select>

            <Select value={selectedDomainId} onValueChange={setSelectedDomainId}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Domains</SelectItem>
                <SelectItem value="uncategorized">Uncategorized</SelectItem>
                {domains.map((domain) => (
                  <SelectItem key={domain._id} value={domain._id}>
                    {domain.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </CardHeader>

      <CardContent className="space-y-6">
        {Object.entries(goalsByDomain).map(([domainName, { domain, goals }]) => (
          <div key={domainName} className="space-y-3">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-medium text-muted-foreground">{domainName}</h3>
              {domain && (
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: domain.color || '#3B82F6' }}
                />
              )}
              <span className="text-xs text-muted-foreground">({goals.length})</span>
            </div>

            <div className="space-y-2">
              {goals.map((goal) => (
                <AdhocGoalItem
                  key={goal._id}
                  goal={goal}
                  onCompleteChange={handleCompleteChange}
                  onUpdate={onUpdateGoal ? handleUpdateGoalItem : undefined}
                  onDelete={onDeleteGoal ? handleDelete : undefined}
                />
              ))}
            </div>
          </div>
        ))}

        {filteredGoals.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            {filter === 'all' && selectedDomainId === 'all'
              ? 'No adhoc goals yet. Create your first one to get started!'
              : 'No goals match the current filters.'}
          </div>
        )}
      </CardContent>

      {/* Create Goal Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create Adhoc Goal</DialogTitle>
          </DialogHeader>
          <AdhocGoalForm
            domains={domains}
            onSubmit={handleCreateGoal}
            onCancel={() => setIsCreateDialogOpen(false)}
            onDomainCreate={onDomainCreate}
            onDomainUpdate={onDomainUpdate}
            onDomainDelete={onDomainDelete}
          />
        </DialogContent>
      </Dialog>

      {/* Edit Goal Dialog */}
      <Dialog open={!!editingGoal} onOpenChange={() => setEditingGoal(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Adhoc Goal</DialogTitle>
          </DialogHeader>
          {editingGoal && (
            <AdhocGoalForm
              domains={domains}
              initialGoal={editingGoal}
              onSubmit={(data) => handleUpdateGoal(editingGoal._id, data)}
              onCancel={() => setEditingGoal(null)}
              onDomainCreate={onDomainCreate}
              onDomainUpdate={onDomainUpdate}
              onDomainDelete={onDomainDelete}
              submitLabel="Update Goal"
            />
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
}
