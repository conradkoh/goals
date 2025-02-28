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
import { History, Pin, Star } from 'lucide-react';

interface PreviewTask {
  id: string;
  title: string;
  details?: string;
  quarterlyGoal: {
    id: string;
    title: string;
    isStarred?: boolean;
    isPinned?: boolean;
  };
  weeklyGoal: {
    id: string;
    title: string;
  };
}

interface TaskMovePreviewProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  preview: {
    previousDay: string;
    targetDay: string;
    tasks: Array<PreviewTask>;
  } | null;
  onConfirm: () => Promise<void>;
}

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
            tasks: Array<PreviewTask>;
          }
        >;
      }
    >
  );

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Move Tasks from Previous Day</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-4">
              <p>
                {!preview?.tasks.length
                  ? `There are no incomplete tasks from ${preview?.previousDay} to move to ${preview?.targetDay}.`
                  : `The following incomplete tasks from ${preview?.previousDay} will be moved to ${preview?.targetDay}. Note that tasks will be moved, not copied.`}
              </p>
              {!preview?.tasks.length ? (
                <div className="text-center py-8 text-gray-500">
                  <History className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>All tasks from the previous day are complete!</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {Object.values(groupedTasks || {}).map((quarterlyGroup) => (
                    <div
                      key={quarterlyGroup.quarterlyGoal.id}
                      className="space-y-2"
                    >
                      <h4 className="font-medium text-sm flex items-center gap-1.5">
                        {quarterlyGroup.quarterlyGoal.isStarred && (
                          <Star className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />
                        )}
                        {quarterlyGroup.quarterlyGoal.isPinned && (
                          <Pin className="h-3.5 w-3.5 fill-blue-400 text-blue-400" />
                        )}
                        <div className="font-semibold text-sm text-gray-800 px-2 py-1 rounded-md break-words">
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
                        {Object.values(quarterlyGroup.weeklyGoals).map(
                          (weeklyGroup) => (
                            <div
                              key={weeklyGroup.weeklyGoal.id}
                              className="pl-4 space-y-1 py-2"
                            >
                              <h5 className="text-sm text-muted-foreground">
                                <div className="font-semibold text-sm text-gray-800 px-2 py-1 rounded-md break-words">
                                  {weeklyGroup.weeklyGoal.title}
                                </div>
                              </h5>
                              <ul className="space-y-1">
                                {weeklyGroup.tasks.map((task) => (
                                  <li
                                    key={task.id}
                                    className="flex items-center gap-2 pl-4"
                                  >
                                    <span className="h-2 w-2 rounded-full bg-blue-500" />
                                    <div className="text-sm break-words">
                                      {task.title}
                                    </div>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Close</AlertDialogCancel>
          {preview && preview.tasks.length > 0 && (
            <AlertDialogAction onClick={onConfirm}>
              Move Tasks
            </AlertDialogAction>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
