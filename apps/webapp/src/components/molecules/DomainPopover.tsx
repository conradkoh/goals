import { api } from '@services/backend/convex/_generated/api';
import type { Doc, Id } from '@services/backend/convex/_generated/dataModel';
import { useQuery } from 'convex/react';
import { ClipboardList } from 'lucide-react';
import { useState } from 'react';
import { CreateGoalInput } from '@/components/atoms/CreateGoalInput';
import { AdhocGoalItem } from '@/components/molecules/AdhocGoalItem';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Spinner } from '@/components/ui/spinner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAdhocGoals } from '@/hooks/useAdhocGoals';
import { useSession } from '@/modules/auth/useSession';

function getCurrentISOWeekNumber(): number {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 1);
  const diff = now.getTime() - start.getTime();
  const oneWeek = 1000 * 60 * 60 * 24 * 7;
  return Math.ceil(diff / oneWeek);
}

interface DomainPopoverProps {
  domain: Doc<'domains'> | null; // null for uncategorized
  trigger: React.ReactNode;
  weekNumber?: number; // Optional week number for creating new tasks
}

type OptimisticAdhocGoal = Doc<'goals'> & {
  domain?: Doc<'domains'>;
  isOptimistic?: boolean;
};

/**
 * Popover component that displays all adhoc tasks for a specific domain
 * and allows creating new tasks with the domain pre-set.
 */
export function DomainPopover({ domain, trigger, weekNumber }: DomainPopoverProps) {
  const { sessionId } = useSession();
  const [isOpen, setIsOpen] = useState(false);
  const [newGoalTitle, setNewGoalTitle] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [optimisticGoals, setOptimisticGoals] = useState<OptimisticAdhocGoal[]>([]);

  // Query adhoc goals for this domain
  const domainGoals =
    useQuery(api.adhocGoal.getAdhocGoalsByDomain, {
      sessionId,
      domainId: domain?._id ?? null,
    }) || [];

  const { createAdhocGoal, updateAdhocGoal, deleteAdhocGoal } = useAdhocGoals(sessionId);

  // Combine real and optimistic goals
  const allGoals = [...optimisticGoals, ...domainGoals];

  const handleSubmit = async () => {
    if (!newGoalTitle.trim()) return;

    const title = newGoalTitle.trim();
    const tempId = `temp-${Date.now()}` as Id<'goals'>;

    // Create optimistic goal
    const currentYear = new Date().getFullYear();
    const optimisticGoal: OptimisticAdhocGoal = {
      _id: tempId,
      _creationTime: Date.now(),
      userId: '' as Id<'users'>, // Placeholder for optimistic update
      year: currentYear,
      quarter: Math.ceil((new Date().getMonth() + 1) / 3),
      title,
      inPath: '/',
      depth: -1,
      isComplete: false,
      isOptimistic: true,
      domainId: domain?._id || undefined, // Store domain at goal level
      adhoc: {
        weekNumber: weekNumber || getCurrentISOWeekNumber(),
      },
      domain: domain || undefined,
    };

    // Add optimistic goal immediately
    setOptimisticGoals((prev) => [optimisticGoal, ...prev]);
    setNewGoalTitle('');
    setIsCreating(true);

    try {
      await createAdhocGoal(
        title,
        undefined, // details
        domain?._id, // domainId (undefined if uncategorized)
        weekNumber || getCurrentISOWeekNumber(), // weekNumber
        undefined, // dayOfWeek
        undefined // dueDate
      );

      // Remove optimistic goal after successful creation
      setOptimisticGoals((prev) => prev.filter((g) => g._id !== tempId));
    } catch (error) {
      console.error('Failed to create adhoc goal:', error);
      // Remove optimistic goal on error
      setOptimisticGoals((prev) => prev.filter((g) => g._id !== tempId));
    } finally {
      setIsCreating(false);
    }
  };

  const handleEscape = () => {
    setNewGoalTitle('');
  };

  const handleCompleteChange = async (goalId: Id<'goals'>, isComplete: boolean) => {
    try {
      await updateAdhocGoal(goalId, { isComplete });
    } catch (error) {
      console.error('Failed to update goal completion:', error);
    }
  };

  const handleUpdate = async (
    goalId: Id<'goals'>,
    title: string,
    details?: string,
    dueDate?: number,
    domainId?: Id<'domains'> | null
  ) => {
    try {
      await updateAdhocGoal(goalId, { title, details, dueDate, domainId });
    } catch (error) {
      console.error('Failed to update adhoc goal:', error);
    }
  };

  const handleDelete = async (goalId: Id<'goals'>) => {
    try {
      await deleteAdhocGoal(goalId);
    } catch (error) {
      console.error('Failed to delete adhoc goal:', error);
    }
  };

  const domainName = domain?.name || 'Uncategorized';

  // Separate incomplete and completed goals
  const incompleteGoals = allGoals
    .filter((goal) => !goal.isComplete)
    .sort((a, b) => (b._creationTime || 0) - (a._creationTime || 0));

  const completedGoals = allGoals
    .filter((goal) => goal.isComplete)
    .sort(
      (a, b) => (b.completedAt || b._creationTime || 0) - (a.completedAt || a._creationTime || 0)
    );

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>{trigger}</PopoverTrigger>
      <PopoverContent className="w-[400px] max-w-[calc(100vw-32px)] p-0" align="start">
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center gap-2 px-4 pt-4 pb-3 border-b">
            <ClipboardList className="h-4 w-4 text-muted-foreground" />
            <h3 className="font-semibold text-sm">{domainName}</h3>
            <span className="text-xs text-muted-foreground">({allGoals.length})</span>
          </div>

          {/* Tabs */}
          <Tabs defaultValue="active" className="flex-1 flex flex-col">
            <TabsList className="grid w-full grid-cols-2 rounded-none border-b">
              <TabsTrigger value="active" className="rounded-none">
                Active ({incompleteGoals.length})
              </TabsTrigger>
              <TabsTrigger value="completed" className="rounded-none">
                Completed ({completedGoals.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="active" className="flex-1 mt-0 p-4 space-y-3">
              {/* Goals List */}
              <div className="space-y-1 max-h-[300px] overflow-y-auto">
                {incompleteGoals.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground text-sm">
                    No active tasks. Create one below!
                  </div>
                ) : (
                  incompleteGoals.map((goal) => (
                    <AdhocGoalItem
                      key={goal._id}
                      goal={goal}
                      onCompleteChange={handleCompleteChange}
                      onUpdate={handleUpdate}
                      onDelete={handleDelete}
                      showDueDate={true}
                      showDomain={false}
                    />
                  ))
                )}
              </div>

              {/* Create Input */}
              <div className="border-t pt-3">
                <CreateGoalInput
                  placeholder={`Add a task to ${domainName.toLowerCase()}...`}
                  value={newGoalTitle}
                  onChange={setNewGoalTitle}
                  onSubmit={handleSubmit}
                  onEscape={handleEscape}
                >
                  {isCreating && (
                    <div className="flex items-center justify-center pt-2">
                      <Spinner className="h-4 w-4" />
                    </div>
                  )}
                </CreateGoalInput>
              </div>
            </TabsContent>

            <TabsContent value="completed" className="flex-1 mt-0 p-4">
              <div className="space-y-1 max-h-[400px] overflow-y-auto">
                {completedGoals.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground text-sm">
                    No completed tasks yet.
                  </div>
                ) : (
                  completedGoals.map((goal) => (
                    <AdhocGoalItem
                      key={goal._id}
                      goal={goal}
                      onCompleteChange={handleCompleteChange}
                      onUpdate={handleUpdate}
                      onDelete={handleDelete}
                      showDueDate={true}
                      showDomain={false}
                    />
                  ))
                )}
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </PopoverContent>
    </Popover>
  );
}
