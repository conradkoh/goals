'use client';
import React, { useEffect, useRef, useState } from 'react';
import { DateTime } from 'luxon';
import {
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

interface WeekData {
  weekLabel: string;
  weekNumber: number;
  days: string[];
  quarterlyGoal: QuarterlyGoalBase;
  quarterlyGoalState: QuarterlyGoalState;
}

interface IncompleteTasksWarningProps {
  isOpen: boolean;
  weeklyGoalTitle: string;
  onConfirm: () => void;
  onCancel: () => void;
}

const generateMockData = (): WeekData[] => {
  // Define the base quarterly goals
  const salesGoal: QuarterlyGoalBase = {
    id: 'q1',
    title: 'Increase Sales',
    path: '/q1',
    quarter: 1,
    weeklyGoals: [
      {
        id: 'w1',
        title: 'Improve Customer Acquisition',
        path: '/q1/w1',
        weekNumber: 1,
        tasks: [
          {
            id: 't1',
            title: 'Research competitor pricing',
            path: '/q1/w1/t1',
          },
          {
            id: 't2',
            title: 'Analyze customer feedback',
            path: '/q1/w1/t2',
          },
        ],
      },
      {
        id: 'w2',
        title: 'Optimize Sales Funnel',
        path: '/q1/w2',
        weekNumber: 2,
        tasks: [
          {
            id: 't3',
            title: 'Review conversion rates',
            path: '/q1/w2/t3',
          },
        ],
      },
    ],
  };

  const productGoal: QuarterlyGoalBase = {
    id: 'q2',
    title: 'Launch New Product',
    path: '/q2',
    quarter: 1,
    weeklyGoals: [
      {
        id: 'w3',
        title: 'Complete MVP Development',
        path: '/q2/w3',
        weekNumber: 3,
        tasks: [
          {
            id: 't4',
            title: 'Finalize feature list',
            path: '/q2/w3/t4',
          },
          {
            id: 't5',
            title: 'Run integration tests',
            path: '/q2/w3/t5',
          },
        ],
      },
    ],
  };

  // Create week data with states
  const weeks: WeekData[] = [
    {
      weekLabel: 'Week 1',
      weekNumber: 1,
      days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
      quarterlyGoal: salesGoal,
      quarterlyGoalState: {
        id: salesGoal.id,
        isComplete: false,
        progress: 7,
        isStarred: true,
        isPinned: false,
        weeklyGoalStates: [
          {
            id: 'w1',
            isComplete: true,
            isHardComplete: true,
            taskStates: [
              { id: 't1', isComplete: true, date: '2024-03-01' },
              { id: 't2', isComplete: false, date: '2024-03-01' },
            ],
          },
          {
            id: 'w2',
            isComplete: false,
            isHardComplete: false,
            taskStates: [{ id: 't3', isComplete: false, date: '2024-03-01' }],
          },
        ],
      },
    },
    {
      weekLabel: 'Week 2',
      weekNumber: 2,
      days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
      quarterlyGoal: productGoal,
      quarterlyGoalState: {
        id: productGoal.id,
        isComplete: true,
        progress: 10,
        isStarred: false,
        isPinned: true,
        weeklyGoalStates: [
          {
            id: 'w3',
            isComplete: true,
            isHardComplete: true,
            taskStates: [
              { id: 't4', isComplete: true, date: '2024-03-08' },
              { id: 't5', isComplete: true, date: '2024-03-08' },
            ],
          },
        ],
      },
    },
    {
      weekLabel: 'Week 3',
      weekNumber: 3,
      days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
      quarterlyGoal: salesGoal,
      quarterlyGoalState: {
        id: salesGoal.id,
        isComplete: false,
        progress: 5,
        isStarred: false,
        isPinned: false,
        weeklyGoalStates: [
          {
            id: 'w1',
            isComplete: false,
            isHardComplete: false,
            taskStates: [
              { id: 't1', isComplete: false, date: '2024-03-15' },
              { id: 't2', isComplete: false, date: '2024-03-15' },
            ],
          },
          {
            id: 'w2',
            isComplete: false,
            isHardComplete: false,
            taskStates: [{ id: 't3', isComplete: false, date: '2024-03-15' }],
          },
        ],
      },
    },
    {
      weekLabel: 'Week 4',
      weekNumber: 4,
      days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
      quarterlyGoal: productGoal,
      quarterlyGoalState: {
        id: productGoal.id,
        isComplete: false,
        progress: 2,
        isStarred: false,
        isPinned: false,
        weeklyGoalStates: [
          {
            id: 'w3',
            isComplete: false,
            isHardComplete: false,
            taskStates: [
              { id: 't4', isComplete: false, date: '2024-03-22' },
              { id: 't5', isComplete: false, date: '2024-03-22' },
            ],
          },
        ],
      },
    },
  ];

  return weeks;
};

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
  const [localGoals, setLocalGoals] = useState<WeekData[]>(() =>
    generateMockData()
  );
  const [isTeamCollapsed, setIsTeamCollapsed] = useState(false);
  const [editState, setEditState] = useState<EditState | null>(null);
  const [goalSectionOpenStates, setGoalSectionOpenStates] = useState<
    Record<number, boolean>
  >({});
  const containerRef = useRef<HTMLDivElement>(null);
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

  // Initialize open states when localGoals changes
  useEffect(() => {
    setGoalSectionOpenStates(
      Object.fromEntries(localGoals.map((_, index) => [index, false]))
    );
  }, [localGoals.length]);

  // Center the scroll position on current week when component mounts
  useEffect(() => {
    if (containerRef.current) {
      const scrollToCenter = () => {
        const containerWidth = containerRef.current?.clientWidth || 0;
        const cardWidth = containerWidth / 4; // Each card takes up 25% of the container

        // Find the index of the current week
        const now = DateTime.now();
        const currentWeekNumber = now.weekNumber;
        const currentWeekIndex = localGoals.findIndex(
          (week) => week.weekNumber === currentWeekNumber
        );

        // Calculate scroll position to center on current week
        const scrollPosition =
          cardWidth * currentWeekIndex - (containerWidth - cardWidth) / 2;

        containerRef.current?.scrollTo({
          left: scrollPosition,
          behavior: 'smooth',
        });
      };

      scrollToCenter();
      // Reapply centering after a short delay to ensure all content is loaded
      setTimeout(scrollToCenter, 100);
    }
  }, [localGoals]); // Run when localGoals changes

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
                isHardComplete: true,
                ...(completeAllTasks && {
                  isComplete: true,
                  tasks: weeklyGoal.tasks.map((task) => ({
                    ...task,
                    isComplete: true,
                  })),
                }),
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
    <div className="min-h-screen bg-gray-50">
      <NavigationHeader />
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
      <div className="w-full h-[calc(100vh-64px)] px-4 py-4">
        <div
          ref={containerRef}
          className="w-full h-full overflow-x-auto scrollbar-hide"
          style={{
            scrollSnapType: 'x mandatory',
            WebkitOverflowScrolling: 'touch',
          }}
        >
          <div className="flex h-full" style={{ gap: '1rem', padding: '0' }}>
            {localGoals.map((week, weekIndex) => (
              <div
                key={weekIndex}
                style={{
                  width: 'calc(25vw - 1.5rem)',
                  flexShrink: 0,
                  scrollSnapAlign: 'center',
                }}
                className="flex flex-col border rounded shadow bg-white p-4 h-full overflow-y-auto"
              >
                <h2 className="font-bold text-lg mb-2 sticky top-0 bg-white z-10 py-2">
                  {week.weekLabel}
                </h2>

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
                <section className="mb-4">
                  <div className="flex justify-between items-center">
                    <h3 className="font-semibold">Team Coordination</h3>
                    <button
                      onClick={() => setIsTeamCollapsed(!isTeamCollapsed)}
                      className="text-blue-500 text-sm"
                    >
                      {isTeamCollapsed ? 'Expand' : 'Collapse'}
                    </button>
                  </div>
                  {!isTeamCollapsed && (
                    <div className="mt-2">
                      <p className="text-sm">
                        OOO Status: Jane Doe, John Smith
                      </p>
                    </div>
                  )}
                </section>
                {/* Weekly Goals Section */}
                <section className="mb-4">
                  <h3 className="font-semibold mb-3">Weekly Goals</h3>
                  <WeeklyGoalSection
                    quarterlyGoal={week.quarterlyGoal}
                    weekState={week.quarterlyGoalState}
                    onWeeklyGoalToggle={(goalId) =>
                      handleWeeklyGoalToggle(weekIndex, goalId)
                    }
                  />
                </section>

                {/* Daily Goals Section */}
                <section>
                  <h3 className="font-semibold mb-4">Daily Goals</h3>
                  <DailyGoalSection
                    quarterlyGoal={week.quarterlyGoal}
                    weekState={week.quarterlyGoalState}
                    onTaskToggle={(taskId, weeklyGoalId) =>
                      handleTaskToggle(weekIndex, taskId, weeklyGoalId)
                    }
                  />
                </section>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default QuarterOverviewScreen;
