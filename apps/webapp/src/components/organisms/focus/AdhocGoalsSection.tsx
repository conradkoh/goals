import type { Id } from '@services/backend/convex/_generated/dataModel';
import { Plus } from 'lucide-react';
import { useState } from 'react';
import { AdhocGoalForm } from '@/components/molecules/AdhocGoalForm';
import { AdhocGoalItem } from '@/components/molecules/AdhocGoalItem';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useAdhocGoals } from '@/hooks/useAdhocGoals';
import { useDomains } from '@/hooks/useDomains';
import type { DayOfWeek } from '@/lib/constants';
import { useSession } from '@/modules/auth/useSession';

interface AdhocGoalsSectionProps {
  weekNumber: number;
  dayOfWeek?: DayOfWeek;
}

export function AdhocGoalsSection({ weekNumber, dayOfWeek }: AdhocGoalsSectionProps) {
  const { sessionId } = useSession();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

  const { adhocGoals, createAdhocGoal, updateAdhocGoal, deleteAdhocGoal } =
    useAdhocGoals(sessionId);
  const { domains, createDomain } = useDomains(sessionId);

  const filteredAdhocGoals = dayOfWeek
    ? adhocGoals.filter((goal) => {
        return goal.adhoc?.weekNumber === weekNumber && goal.adhoc?.dayOfWeek === dayOfWeek;
      })
    : adhocGoals.filter((goal) => goal.adhoc?.weekNumber === weekNumber);

  const handleCreateGoal = async (data: {
    title: string;
    details?: string;
    domainId?: Id<'domains'> | null;
    weekNumber?: number;
    dayOfWeek?: any;
    dueDate?: number;
  }) => {
    await createAdhocGoal(
      data.title,
      data.details,
      data.domainId || undefined,
      data.weekNumber || weekNumber,
      data.dayOfWeek,
      data.dueDate
    );
    setIsCreateDialogOpen(false);
  };

  const handleCompleteChange = async (goalId: string, isComplete: boolean) => {
    await updateAdhocGoal(goalId as Id<'goals'>, { isComplete });
  };

  const handleDelete = async (goalId: string) => {
    if (confirm('Are you sure you want to delete this adhoc goal?')) {
      await deleteAdhocGoal(goalId as Id<'goals'>);
    }
  };

  const handleDomainCreate = async (name: string, description?: string, color?: string) => {
    await createDomain(name, description, color);
  };

  return (
    <div className="mt-8 pt-6 border-t border-border">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-foreground">Adhoc Tasks</h3>
        <Button onClick={() => setIsCreateDialogOpen(true)} size="sm" variant="outline">
          <Plus className="h-4 w-4 mr-1" />
          Add Task
        </Button>
      </div>

      {filteredAdhocGoals.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-4">
          No adhoc tasks for this {dayOfWeek ? 'day' : 'week'}
        </p>
      ) : (
        <div className="space-y-2">
          {filteredAdhocGoals.map((goal) => (
            <AdhocGoalItem
              key={goal._id}
              goal={goal}
              onCompleteChange={handleCompleteChange}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create Adhoc Task</DialogTitle>
          </DialogHeader>
          <AdhocGoalForm
            domains={domains}
            onSubmit={handleCreateGoal}
            onCancel={() => setIsCreateDialogOpen(false)}
            onDomainCreate={handleDomainCreate}
            initialGoal={{
              adhoc: {
                weekNumber,
                dayOfWeek,
              },
            }}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
