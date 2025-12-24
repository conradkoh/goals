import { api } from '@workspace/backend/convex/_generated/api';
import type { Doc, Id } from '@workspace/backend/convex/_generated/dataModel';
import type { AdhocGoalWithChildren } from '@workspace/backend/convex/adhocGoal';
import { useQuery } from 'convex/react';
import { ClipboardList } from 'lucide-react';
import { useCallback, useState } from 'react';

import { CreateGoalInput } from '@/components/atoms/CreateGoalInput';
import { AdhocGoalItem } from '@/components/molecules/AdhocGoalItem';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Spinner } from '@/components/ui/spinner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAdhocGoals } from '@/hooks/useAdhocGoals';
import { useDeviceScreenInfo } from '@/hooks/useDeviceScreenInfo';
import { cn } from '@/lib/utils';
import { useSession } from '@/modules/auth/useSession';

/**
 * Props for the DomainPopover component.
 */
export interface DomainPopoverProps {
  /** The domain to display (null for uncategorized) */
  domain: Doc<'domains'> | null;
  /** React node to use as the popover trigger */
  trigger: React.ReactNode;
  /** ISO week year for creating new tasks */
  year: number;
  /** ISO week number for creating new tasks */
  weekNumber: number;
  /** Optional controlled open state */
  open?: boolean;
  /** Optional callback when open state changes */
  onOpenChange?: (open: boolean) => void;
}

/**
 * Adhoc goal with optimistic update tracking and children.
 */
type _OptimisticAdhocGoal = Doc<'goals'> & {
  domain?: Doc<'domains'>;
  isOptimistic?: boolean;
  children?: AdhocGoalWithChildren[];
};

/**
 * Popover component that displays all adhoc tasks for a specific domain
 * and allows creating new tasks with the domain pre-set.
 */
export function DomainPopover({
  domain,
  trigger,
  year,
  weekNumber,
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
}: DomainPopoverProps) {
  const { sessionId } = useSession();
  const { isHydrated, preferFullscreenDialogs } = useDeviceScreenInfo();
  const [internalOpen, setInternalOpen] = useState(false);
  const [newGoalTitle, setNewGoalTitle] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [optimisticGoals, setOptimisticGoals] = useState<_OptimisticAdhocGoal[]>([]);

  // Use controlled state if provided, otherwise use internal state
  const isOpen = controlledOpen !== undefined ? controlledOpen : internalOpen;
  const setIsOpen = controlledOnOpenChange || setInternalOpen;

  // Query adhoc goals for this domain with hierarchical structure
  const domainGoals =
    useQuery(api.adhocGoal.getAdhocGoalsByDomainHierarchical, {
      sessionId,
      domainId: domain?._id ?? null,
    }) || [];

  const { createAdhocGoal, updateAdhocGoal, deleteAdhocGoal } = useAdhocGoals(sessionId);

  // Combine real and optimistic goals (optimistic at end for correct ordering)
  const allGoals = [...domainGoals, ...optimisticGoals];

  const handleSubmit = async () => {
    if (!newGoalTitle.trim()) return;

    const title = newGoalTitle.trim();
    const tempId = `temp-${Date.now()}` as Id<'goals'>;

    // Create optimistic goal
    const optimisticGoal: _OptimisticAdhocGoal = {
      _id: tempId,
      _creationTime: Date.now(),
      userId: '' as Id<'users'>, // Placeholder for optimistic update
      year,
      quarter: Math.ceil((new Date().getMonth() + 1) / 3),
      title,
      inPath: '/',
      depth: -1,
      isComplete: false,
      isOptimistic: true,
      domainId: domain?._id || undefined, // Store domain at goal level
      adhoc: {
        weekNumber,
      },
      domain: domain || undefined,
      children: [], // Add empty children array
    };

    // Add optimistic goal immediately (append to end for correct ordering)
    setOptimisticGoals((prev) => [...prev, optimisticGoal]);
    setNewGoalTitle('');
    setIsCreating(true);

    try {
      await createAdhocGoal(
        title,
        undefined, // details
        domain?._id, // domainId (undefined if uncategorized)
        year, // year
        weekNumber, // weekNumber
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

  /** Handles creating a child adhoc goal. */
  const handleCreateChild = useCallback(
    async (parentId: Id<'goals'>, title: string) => {
      await createAdhocGoal(
        title,
        undefined, // details
        domain?._id, // domainId - inherit from parent's domain
        year,
        weekNumber,
        undefined, // dayOfWeek
        undefined, // dueDate
        parentId // parent goal ID
      );
    },
    [createAdhocGoal, domain?._id, year, weekNumber]
  );

  const domainName = domain?.name || 'Uncategorized';

  // Separate incomplete and completed goals (oldest first)
  const incompleteGoals = allGoals
    .filter((goal) => !goal.isComplete)
    .sort((a, b) => (a._creationTime || 0) - (b._creationTime || 0));

  const completedGoals = allGoals
    .filter((goal) => goal.isComplete)
    .sort(
      (a, b) => (a.completedAt || a._creationTime || 0) - (b.completedAt || b._creationTime || 0)
    );

  // Shared content for both popover and dialog
  const content = (
    <div className="flex flex-col h-full w-full">
      {/* Tabs */}
      <Tabs defaultValue="active" className="flex-1 flex flex-col w-full">
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
                  onCreateChild={handleCreateChild}
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
                  onCreateChild={handleCreateChild}
                  showDueDate={true}
                  showDomain={false}
                />
              ))
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );

  // Use fullscreen dialog on touch devices
  if (isHydrated && preferFullscreenDialogs) {
    return (
      <>
        {/* biome-ignore lint/a11y/useKeyWithClickEvents: The trigger itself handles keyboard events */}
        {/* biome-ignore lint/a11y/noStaticElementInteractions: The trigger contains interactive elements */}
        <span className="contents" onClick={() => setIsOpen(true)}>
          {trigger}
        </span>
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogContent
            fullscreenSafe
            className={cn(
              // Width: full width minus small margin
              'w-[calc(100vw-16px)] max-w-none',
              // Height: use dvh for iOS Safari dynamic viewport
              'h-[calc(100dvh-32px)] max-h-none',
              // Safe area padding for notch and home indicator
              'pb-[env(safe-area-inset-bottom,0px)]',
              'overflow-hidden flex flex-col p-0'
            )}
          >
            <DialogHeader className="flex-row items-center gap-2 px-4 pt-4 pb-3 border-b space-y-0">
              <ClipboardList className="h-4 w-4 text-muted-foreground" />
              <DialogTitle className="font-semibold text-sm">{domainName}</DialogTitle>
              <span className="text-xs text-muted-foreground">({allGoals.length})</span>
            </DialogHeader>
            {/* pb-4 ensures content can scroll past keyboard on iOS */}
            <div className="flex-1 overflow-y-auto w-full pb-4 overscroll-contain">{content}</div>
          </DialogContent>
        </Dialog>
      </>
    );
  }

  // Desktop: Use a modal dialog instead of popover
  return (
    <>
      {/* biome-ignore lint/a11y/useKeyWithClickEvents: The trigger itself handles keyboard events */}
      {/* biome-ignore lint/a11y/noStaticElementInteractions: The trigger contains interactive elements */}
      <span className="contents" onClick={() => setIsOpen(true)}>
        {trigger}
      </span>
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="w-full max-w-[min(48rem,calc(100vw-32px))] max-h-[90vh] overflow-hidden flex flex-col p-0">
          <DialogHeader className="flex-row items-center gap-2 px-4 pt-4 pb-3 border-b space-y-0">
            <ClipboardList className="h-4 w-4 text-muted-foreground" />
            <DialogTitle className="font-semibold text-sm">{domainName}</DialogTitle>
            <span className="text-xs text-muted-foreground">({allGoals.length})</span>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto">{content}</div>
        </DialogContent>
      </Dialog>
    </>
  );
}
