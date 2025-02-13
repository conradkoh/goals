'use client';
import { Id } from '@services/backend/convex/_generated/dataModel';
import React, { useEffect, useRef, useState } from 'react';
import { useDashboard } from '../../hooks/useDashboard';
import type {
  EditState,
  QuarterlyGoalBase,
  QuarterlyGoalState,
} from '../../types/goals';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../ui/alert-dialog';
import NavigationHeader from './NavigationHeader';
import { DailyGoalSection } from './goals/DailyGoalSection';
import { QuarterlyGoalSection } from './goals/QuarterlyGoalSection';
import { WeeklyGoalSection } from './goals/WeeklyGoalSection';
import { Button } from '../ui/button';
import { Search, Bell, User } from 'lucide-react';
import { Input } from '../ui/input';

// Backend types
interface BackendGoal {
  _id: Id<'goals'>;
  userId: Id<'users'>;
  year: number;
  quarter: number;
  title: string;
  parentId?: Id<'goals'>;
  inPath: string;
  depth: number;
}

interface BackendWeeklyGoal {
  _id: Id<'goalsWeekly'>;
  userId: Id<'users'>;
  year: number;
  quarter: number;
  goalId: Id<'goals'>;
  weekNumber: number;
  progress: string;
  isStarred: boolean;
  isPinned: boolean;
  isComplete: boolean;
}

interface WeekData {
  weekLabel: string;
  weekNumber: number;
  days: string[];
  quarterlyGoal: QuarterlyGoalBase;
  quarterlyGoalState: QuarterlyGoalState;
  mondayDate: string;
}

interface IncompleteTasksWarningProps {
  isOpen: boolean;
  weeklyGoalTitle: string;
  onConfirm: () => void;
  onCancel: () => void;
}

const IncompleteTasksWarning: React.FC<IncompleteTasksWarningProps> = ({
  isOpen,
  weeklyGoalTitle,
  onConfirm,
  onCancel,
}) => (
  <AlertDialog open={isOpen} onOpenChange={(open) => !open && onCancel()}>
    <AlertDialogContent>
      <AlertDialogHeader>
        <AlertDialogTitle>Incomplete Tasks</AlertDialogTitle>
        <AlertDialogDescription>
          Some tasks in &quot;{weeklyGoalTitle}&quot; are not yet complete.
          Would you like to mark all tasks as complete?
        </AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter>
        <AlertDialogCancel onClick={onCancel}>Cancel</AlertDialogCancel>
        <AlertDialogAction
          onClick={onConfirm}
          className="bg-green-500 hover:bg-green-600"
        >
          Mark All Complete
        </AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
);

const QuarterOverviewScreen = () => {
  const {
    currentYear,
    currentQuarter,
    currentDate,
    currentWeekNumber,
    weekData,
  } = useDashboard();

  const [localGoals, setLocalGoals] = useState<WeekData[]>(() => weekData);
  const [isTeamCollapsed, setIsTeamCollapsed] = useState(false);
  const [editState, setEditState] = useState<EditState | null>(null);
  const [goalSectionOpenStates, setGoalSectionOpenStates] = useState<
    Record<number, boolean>
  >({});
  const containerRef = useRef<HTMLDivElement>(null);
  const hasScrolledToCenter = useRef(false);
  const [warningDialog, setWarningDialog] = useState<{
    isOpen: boolean;
    weekIndex: number;
    weeklyGoalId: string;
    weeklyGoalTitle: string;
  }>({
    isOpen: false,
    weekIndex: -1,
    weeklyGoalId: '',
    weeklyGoalTitle: '',
  });

  // Update localGoals when weekData changes
  useEffect(() => {
    setLocalGoals(weekData);
  }, [weekData]);

  // Initialize open states when localGoals changes
  useEffect(() => {
    setGoalSectionOpenStates(
      Object.fromEntries(localGoals.map((_, index) => [index, false]))
    );
  }, [localGoals.length]);

  // Update the scroll to center effect to be more reliable
  useEffect(() => {
    if (
      containerRef.current &&
      !hasScrolledToCenter.current &&
      localGoals.length > 0
    ) {
      const scrollToCenter = () => {
        const container = containerRef.current;
        if (!container) return;

        // Calculate card width based on container width
        // Container should show 6 weeks
        const containerWidth = container.clientWidth;
        const cardWidth = Math.floor(containerWidth / 6); // Each card takes 1/6 of the container

        // Find the index of the current week
        const currentWeekIndex = localGoals.findIndex(
          (week) => week.weekNumber === currentWeekNumber
        );

        if (currentWeekIndex !== -1) {
          // Calculate scroll position to place current week as second week
          const targetPosition = cardWidth; // One card width from the left
          const scrollPosition = Math.max(
            0,
            cardWidth * currentWeekIndex - targetPosition
          );

          container.scrollTo({
            left: scrollPosition,
          });
        }
      };

      // Initial scroll
      scrollToCenter();

      // Ensure layout is complete before final scroll
      setTimeout(scrollToCenter, 100);
      hasScrolledToCenter.current = true;
    }
  }, [localGoals.length, currentWeekNumber]);

  const completeWeeklyGoal = (
    weekIndex: number,
    weeklyGoalId: string,
    completeAllTasks: boolean
  ) => {
    setLocalGoals((prevGoals) =>
      prevGoals.map((week, idx) => {
        if (idx !== weekIndex) return week;

        return {
          ...week,
          quarterlyGoal: {
            ...week.quarterlyGoal,
            weeklyGoals: week.quarterlyGoal.weeklyGoals.map((weeklyGoal) => {
              if (weeklyGoal.id !== weeklyGoalId) return weeklyGoal;

              return {
                ...weeklyGoal,
                tasks: weeklyGoal.tasks.map((task) => ({
                  ...task,
                })),
              };
            }),
          },
          quarterlyGoalState: {
            ...week.quarterlyGoalState,
            weeklyGoalStates: week.quarterlyGoalState.weeklyGoalStates.map(
              (state) => {
                if (state.id !== weeklyGoalId) return state;
                return {
                  ...state,
                  isHardComplete: true,
                  ...(completeAllTasks && {
                    isComplete: true,
                    taskStates: state.taskStates.map((taskState) => ({
                      ...taskState,
                      isComplete: true,
                    })),
                  }),
                };
              }
            ),
          },
        };
      })
    );
  };

  // Handler for toggling weekly goal completion
  const handleWeeklyGoalToggle = (weekIndex: number, weeklyGoalId: string) => {
    const week = localGoals[weekIndex];
    const weeklyGoal = week.quarterlyGoal.weeklyGoals.find(
      (wg) => wg.id === weeklyGoalId
    );
    const weeklyGoalState = week.quarterlyGoalState.weeklyGoalStates.find(
      (state) => state.id === weeklyGoalId
    );

    if (!weeklyGoal) return;

    // If the goal is already hard complete, just toggle it off
    if (weeklyGoalState?.isHardComplete) {
      setLocalGoals((prevGoals) =>
        prevGoals.map((week, idx) => {
          if (idx !== weekIndex) return week;

          return {
            ...week,
            quarterlyGoalState: {
              ...week.quarterlyGoalState,
              weeklyGoalStates: week.quarterlyGoalState.weeklyGoalStates.map(
                (state) => {
                  if (state.id !== weeklyGoalId) return state;
                  return {
                    ...state,
                    isHardComplete: false,
                  };
                }
              ),
            },
          };
        })
      );
      return;
    }

    // Check if all tasks are complete
    const weeklyGoalState2 = week.quarterlyGoalState.weeklyGoalStates.find(
      (state) => state.id === weeklyGoalId
    );
    const hasIncompleteTasks =
      weeklyGoalState2?.taskStates.some((taskState) => !taskState.isComplete) ??
      true;

    if (hasIncompleteTasks) {
      // Show warning dialog
      setWarningDialog({
        isOpen: true,
        weekIndex,
        weeklyGoalId,
        weeklyGoalTitle: weeklyGoal.title,
      });
    } else {
      // If all tasks are complete, just mark the goal as hard complete
      completeWeeklyGoal(weekIndex, weeklyGoalId, false);
    }
  };

  // Handler for toggling individual task completion
  const handleTaskToggle = (
    weekIndex: number,
    taskId: string,
    weeklyGoalId: string
  ) => {
    setLocalGoals((prevGoals) =>
      prevGoals.map((week, idx) => {
        if (idx !== weekIndex) return week;

        const weeklyGoalState = week.quarterlyGoalState.weeklyGoalStates.find(
          (state) => state.id === weeklyGoalId
        );
        const toggledTaskState = weeklyGoalState?.taskStates.find(
          (t) => t.id === taskId
        );
        const isUnchecking = toggledTaskState?.isComplete;

        return {
          ...week,
          quarterlyGoalState: {
            ...week.quarterlyGoalState,
            weeklyGoalStates: week.quarterlyGoalState.weeklyGoalStates.map(
              (state) => {
                if (state.id !== weeklyGoalId) return state;

                const updatedTaskStates = state.taskStates.map((taskState) =>
                  taskState.id === taskId
                    ? { ...taskState, isComplete: !taskState.isComplete }
                    : taskState
                );

                // Update weekly goal soft completion based on all tasks being complete
                const allTasksComplete = updatedTaskStates.every(
                  (taskState) => taskState.isComplete
                );

                return {
                  ...state,
                  taskStates: updatedTaskStates,
                  isComplete: allTasksComplete,
                  ...(isUnchecking && { isHardComplete: false }), // Remove hard completion when unchecking a task
                };
              }
            ),
          },
        };
      })
    );
  };

  // New handlers for GoalSection
  const handleStartEditing = (
    weekIndex: number,
    goalId: string,
    type: 'title' | 'progress'
  ) => {
    const goal = localGoals[weekIndex].quarterlyGoal;
    if (!goal) return;

    setEditState({
      weekIndex,
      goalId,
      type,
      originalValue:
        type === 'title' ? goal.title : String(goal.weeklyGoals.length),
    });
  };

  const handleUpdateGoal = (
    weekIndex: number,
    goalId: string,
    newTitle: string
  ) => {
    setLocalGoals((prev) =>
      prev.map((week, idx) => {
        if (idx !== weekIndex) return week;
        return {
          ...week,
          quarterlyGoal: {
            ...week.quarterlyGoal,
            title: newTitle,
          },
        };
      })
    );
    setEditState(null);
  };

  const handleUpdateProgress = (
    weekIndex: number,
    goalId: string,
    newProgress: number
  ) => {
    setLocalGoals((prev) =>
      prev.map((week, idx) => {
        if (idx !== weekIndex) return week;
        return {
          ...week,
          quarterlyGoalState: {
            ...week.quarterlyGoalState,
            progress: newProgress,
          },
        };
      })
    );
    setEditState(null);
  };

  const handleToggleStar = (weekIndex: number) => {
    setLocalGoals((prev) =>
      prev.map((week, idx) => {
        if (idx !== weekIndex) return week;
        return {
          ...week,
          quarterlyGoalState: {
            ...week.quarterlyGoalState,
            isStarred: !week.quarterlyGoalState.isStarred,
            isPinned: false,
          },
        };
      })
    );
  };

  const handleTogglePin = (weekIndex: number) => {
    setLocalGoals((prev) =>
      prev.map((week, idx) => {
        if (idx !== weekIndex) return week;
        return {
          ...week,
          quarterlyGoalState: {
            ...week.quarterlyGoalState,
            isPinned: !week.quarterlyGoalState.isPinned,
            isStarred: false,
          },
        };
      })
    );
  };

  const handleGoalSectionOpenChange = (weekIndex: number, isOpen: boolean) => {
    setGoalSectionOpenStates((prev) => ({ ...prev, [weekIndex]: isOpen }));
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="w-full flex h-16 items-center justify-between px-6">
          <div className="flex items-center gap-6">
            <h1 className="text-xl font-semibold">Goals Dashboard</h1>
          </div>
          <div className="flex items-center gap-4">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search..."
                className="w-64 pl-8"
              />
            </div>
            <Button variant="ghost" size="icon">
              <Bell className="h-5 w-5" />
            </Button>
            <Button variant="ghost" size="icon">
              <User className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </header>

      <main className="flex flex-col h-[calc(100vh-4rem)] mt-2">
        <div
          ref={containerRef}
          className="flex-1 overflow-x-auto overflow-y-hidden px-0"
        >
          <div className="flex gap-4 h-full pb-4">
            {localGoals.map((week, weekIndex) => (
              <div
                key={weekIndex}
                className="w-[calc(100%/6)] shrink-0 flex flex-col border rounded-lg shadow bg-white h-full"
              >
                <div className="border-b p-4">
                  <div className="flex items-baseline justify-between">
                    <p className="text-sm text-muted-foreground">
                      {week.mondayDate}
                    </p>
                    <h2 className="text-lg font-semibold">{week.weekLabel}</h2>
                  </div>
                </div>
                <div className="flex-1 p-4 space-y-6 overflow-y-auto">
                  {/* Quarter Goals Section */}
                  <QuarterlyGoalSection
                    goalBase={week.quarterlyGoal}
                    weekState={week.quarterlyGoalState}
                    weekIndex={weekIndex}
                    isOpen={goalSectionOpenStates[weekIndex] ?? false}
                    onOpenChange={(isOpen) =>
                      handleGoalSectionOpenChange(weekIndex, isOpen)
                    }
                    editState={editState}
                    onStartEditing={handleStartEditing}
                    onCancelEditing={() => setEditState(null)}
                    onUpdateGoal={handleUpdateGoal}
                    onUpdateProgress={handleUpdateProgress}
                    onToggleStar={() => handleToggleStar(weekIndex)}
                    onTogglePin={() => handleTogglePin(weekIndex)}
                  />

                  {/* Team Coordination Section */}
                  <div>
                    <div className="mb-2 flex items-center justify-between">
                      <h3 className="font-semibold">Team Coordination</h3>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setIsTeamCollapsed(!isTeamCollapsed)}
                      >
                        {isTeamCollapsed ? 'Expand' : 'Collapse'}
                      </Button>
                    </div>
                    {!isTeamCollapsed && (
                      <div className="space-y-2">
                        <p className="text-sm text-muted-foreground">
                          OOO Status: Jane Doe, John Smith
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Weekly Goals Section */}
                  <div>
                    <h3 className="font-semibold mb-3">Weekly Goals</h3>
                    <WeeklyGoalSection
                      quarterlyGoal={week.quarterlyGoal}
                      weekState={week.quarterlyGoalState}
                      onWeeklyGoalToggle={(goalId) =>
                        handleWeeklyGoalToggle(weekIndex, goalId)
                      }
                    />
                  </div>

                  {/* Daily Goals Section */}
                  <div>
                    <h3 className="font-semibold mb-3">Daily Goals</h3>
                    <DailyGoalSection
                      quarterlyGoal={week.quarterlyGoal}
                      weekState={week.quarterlyGoalState}
                      onTaskToggle={(taskId, weeklyGoalId) =>
                        handleTaskToggle(weekIndex, taskId, weeklyGoalId)
                      }
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>

      <IncompleteTasksWarning
        isOpen={warningDialog.isOpen}
        weeklyGoalTitle={warningDialog.weeklyGoalTitle}
        onConfirm={() => {
          completeWeeklyGoal(
            warningDialog.weekIndex,
            warningDialog.weeklyGoalId,
            true
          );
          setWarningDialog((prev) => ({ ...prev, isOpen: false }));
        }}
        onCancel={() => {
          setWarningDialog((prev) => ({ ...prev, isOpen: false }));
        }}
      />
    </div>
  );
};

export default QuarterOverviewScreen;
