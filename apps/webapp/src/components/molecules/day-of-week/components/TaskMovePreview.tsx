import { History, Pin, Star } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { cn } from '@/lib/utils';

/**
 * Represents a task to be previewed in the move dialog.
 */
export interface PreviewTask {
  /** Unique task identifier */
  id: string;
  /** Task title */
  title: string;
  /** Optional task details */
  details?: string;
  /** Parent quarterly goal information */
  quarterlyGoal: {
    id: string;
    title: string;
    isStarred?: boolean;
    isPinned?: boolean;
  };
  /** Parent weekly goal information */
  weeklyGoal: {
    id: string;
    title: string;
  };
  /** Nested sub-tasks (for adhoc goals hierarchy) */
  children?: PreviewTask[];
  /** Depth level for indentation (0 = root) */
  depth?: number;
}

/**
 * Data structure for the task move preview dialog.
 */
export interface TaskMovePreviewData {
  /** Description of source day/week */
  previousDay: string;
  /** Description of target day/week */
  targetDay: string;
  /** Tasks to be moved */
  tasks: PreviewTask[];
}

/**
 * Props for the TaskMovePreview dialog component.
 */
interface TaskMovePreviewProps {
  /** Whether the dialog is open */
  open: boolean;
  /** Callback when open state changes */
  onOpenChange: (open: boolean) => void;
  /** Preview data to display */
  preview: TaskMovePreviewData | null;
  /** Callback when user confirms the move */
  onConfirm: () => void;
}

/**
 * Recursive component for rendering a task and its nested children.
 * Displays indentation based on depth level.
 */
function _TaskPreviewItem({ task, depth = 0 }: { task: PreviewTask; depth?: number }) {
  return (
    <>
      <li className="flex items-center gap-2" style={{ paddingLeft: `${(depth + 1) * 16}px` }}>
        <span className="h-2 w-2 rounded-full bg-blue-500 flex-shrink-0" />
        <div className="text-sm break-words">{task.title}</div>
      </li>
      {task.children &&
        task.children.length > 0 &&
        task.children.map((child) => (
          <_TaskPreviewItem key={child.id} task={child} depth={depth + 1} />
        ))}
    </>
  );
}

/**
 * Dialog component for previewing and confirming task moves.
 * Displays tasks grouped by quarterly and weekly goals with visual hierarchy.
 */
export const TaskMovePreview = ({
  open,
  onOpenChange,
  preview,
  onConfirm,
}: TaskMovePreviewProps) => {
  // Group tasks by quarterly and weekly goals
  const groupedTasks = preview?.tasks.reduce(
    (acc, task) => {
      const quarterlyId = task.quarterlyGoal.id;
      const weeklyId = task.weeklyGoal.id;

      if (!acc[quarterlyId]) {
        acc[quarterlyId] = {
          quarterlyGoal: task.quarterlyGoal,
          weeklyGoals: {},
        };
      }

      if (!acc[quarterlyId].weeklyGoals[weeklyId]) {
        acc[quarterlyId].weeklyGoals[weeklyId] = {
          weeklyGoal: task.weeklyGoal,
          tasks: [],
        };
      }

      acc[quarterlyId].weeklyGoals[weeklyId].tasks.push(task);
      return acc;
    },
    {} as Record<
      string,
      {
        quarterlyGoal: {
          id: string;
          title: string;
          isStarred?: boolean;
          isPinned?: boolean;
        };
        weeklyGoals: Record<
          string,
          {
            weeklyGoal: { id: string; title: string };
            tasks: PreviewTask[];
          }
        >;
      }
    >
  );

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Pull Incomplete Goals</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-4">
              <p>
                {!preview?.tasks.length
                  ? `There are no incomplete goals to pull forward to ${preview?.targetDay}.`
                  : `The following incomplete goals from ${preview?.previousDay} will be moved to ${preview?.targetDay}. Note that goals will be moved, not copied.`}
              </p>
              {!preview?.tasks.length ? (
                <div className="text-center py-8 text-muted-foreground">
                  <History className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>All previous goals are complete!</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {Object.values(groupedTasks || {}).map((quarterlyGroup) => (
                    <div key={quarterlyGroup.quarterlyGoal.id} className="space-y-2">
                      <h4 className="font-medium text-sm flex items-center gap-1.5">
                        {quarterlyGroup.quarterlyGoal.isStarred && (
                          <Star className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />
                        )}
                        {quarterlyGroup.quarterlyGoal.isPinned && (
                          <Pin className="h-3.5 w-3.5 fill-blue-400 text-blue-400" />
                        )}
                        <div className="font-semibold text-sm text-foreground px-2 py-1 rounded-md break-words">
                          {quarterlyGroup.quarterlyGoal.title}
                        </div>
                      </h4>
                      <div
                        className={cn(
                          'rounded-md overflow-hidden',
                          quarterlyGroup.quarterlyGoal.isStarred
                            ? 'bg-yellow-50 border border-yellow-200'
                            : quarterlyGroup.quarterlyGoal.isPinned
                              ? 'bg-blue-50 border border-blue-200'
                              : ''
                        )}
                      >
                        {Object.values(quarterlyGroup.weeklyGoals).map((weeklyGroup) => (
                          <div key={weeklyGroup.weeklyGoal.id} className="pl-4 space-y-1 py-2">
                            <h5 className="text-sm text-muted-foreground">
                              <div className="font-semibold text-sm text-foreground px-2 py-1 rounded-md break-words">
                                {weeklyGroup.weeklyGoal.title}
                              </div>
                            </h5>
                            <ul className="space-y-1">
                              {weeklyGroup.tasks.map((task) => (
                                <_TaskPreviewItem key={task.id} task={task} />
                              ))}
                            </ul>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          {preview && preview.tasks.length > 0 && (
            <AlertDialogAction onClick={onConfirm}>Pull Goals</AlertDialogAction>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
