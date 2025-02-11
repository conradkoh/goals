'use client';
import React, { useState, useRef, useEffect } from 'react';
import { DateTime } from 'luxon';
import NavigationHeader from './NavigationHeader';
import { DailyGoalSection } from './goals/DailyGoalSection';
import { WeeklyGoalSection } from './goals/WeeklyGoalSection';
import { GoalSection } from './goals/GoalSection';
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

interface WeekData {
  weekLabel: string;
  weekNumber: number;
  days: string[];
  quarterlyGoals: QuarterlyGoal[];
}

interface QuarterlyGoal {
  id: string;
  title: string;
  path: string;
  quarter: 1 | 2 | 3 | 4;
  progress: number;
  isStarred?: boolean;
  isPinned?: boolean;
  weeklyGoals: {
    id: string;
    title: string;
    path: string;
    isComplete: boolean;
    isHardComplete: boolean;
    tasks: {
      id: string;
      title: string;
      isComplete: boolean;
      path: string;
      date: string;
    }[];
  }[];
}

interface EditState {
  weekIndex: number;
  goalId: string;
  type: 'title' | 'progress';
  originalValue: string;
}

// Mock data structure
const mockWeekData: WeekData[] = [
  {
    weekLabel: 'Prev Week',
    weekNumber: 1,
    days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
    quarterlyGoals: [
      {
        id: 'q1',
        title: 'Increase Sales',
        path: '/q1',
        quarter: 1,
        progress: 0,
        weeklyGoals: [
          {
            id: 'w1',
            title: 'Improve Customer Acquisition',
            path: '/q1/w1',
            isComplete: false,
            isHardComplete: false,
            tasks: [
              {
                id: 't1',
                title: 'Review marketing analytics',
                isComplete: true,
                path: '/q1/w1/t1',
                date: '2024-03-01',
              },
              {
                id: 't2',
                title: 'Update social media strategy',
                isComplete: false,
                path: '/q1/w1/t2',
                date: '2024-03-01',
              },
            ],
          },
          {
            id: 'w2',
            title: 'Optimize Sales Funnel',
            path: '/q1/w2',
            isComplete: false,
            isHardComplete: false,
            tasks: [
              {
                id: 't3',
                title: 'Analyze conversion rates',
                isComplete: false,
                path: '/q1/w2/t3',
                date: '2024-03-01',
              },
            ],
          },
        ],
      },
      {
        id: 'q2',
        title: 'Launch New Product',
        path: '/q2',
        quarter: 1,
        progress: 0,
        weeklyGoals: [
          {
            id: 'w3',
            title: 'Complete MVP Development',
            path: '/q2/w3',
            isComplete: false,
            isHardComplete: false,
            tasks: [
              {
                id: 't4',
                title: 'Finalize feature list',
                isComplete: true,
                path: '/q2/w3/t4',
                date: '2024-03-01',
              },
              {
                id: 't5',
                title: 'Run integration tests',
                isComplete: false,
                path: '/q2/w3/t5',
                date: '2024-03-01',
              },
            ],
          },
        ],
      },
    ],
  },
  {
    weekLabel: 'Last Week',
    weekNumber: 2,
    days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
    quarterlyGoals: [
      {
        id: 'q1',
        title: 'Increase Sales',
        path: '/q1',
        quarter: 1,
        progress: 0,
        weeklyGoals: [
          {
            id: 'w1',
            title: 'Improve Customer Acquisition',
            path: '/q1/w1',
            isComplete: true,
            isHardComplete: false,
            tasks: [
              {
                id: 't1',
                title: 'Review marketing analytics',
                isComplete: true,
                path: '/q1/w1/t1',
                date: '2024-03-08',
              },
              {
                id: 't2',
                title: 'Update social media strategy',
                isComplete: true,
                path: '/q1/w1/t2',
                date: '2024-03-08',
              },
            ],
          },
          {
            id: 'w2',
            title: 'Optimize Sales Funnel',
            path: '/q1/w2',
            isComplete: false,
            isHardComplete: false,
            tasks: [
              {
                id: 't3',
                title: 'Analyze conversion rates',
                isComplete: false,
                path: '/q1/w2/t3',
                date: '2024-03-08',
              },
            ],
          },
        ],
      },
      {
        id: 'q2',
        title: 'Launch New Product',
        path: '/q2',
        quarter: 1,
        progress: 0,
        weeklyGoals: [
          {
            id: 'w3',
            title: 'Complete MVP Development',
            path: '/q2/w3',
            isComplete: false,
            isHardComplete: false,
            tasks: [
              {
                id: 't4',
                title: 'Finalize feature list',
                isComplete: true,
                path: '/q2/w3/t4',
                date: '2024-03-08',
              },
              {
                id: 't5',
                title: 'Run integration tests',
                isComplete: false,
                path: '/q2/w3/t5',
                date: '2024-03-08',
              },
            ],
          },
        ],
      },
    ],
  },
  {
    weekLabel: 'This Week',
    weekNumber: 3,
    days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
    quarterlyGoals: [
      {
        id: 'q1',
        title: 'Increase Sales',
        path: '/q1',
        quarter: 1,
        progress: 0,
        weeklyGoals: [
          {
            id: 'w1',
            title: 'Improve Customer Acquisition',
            path: '/q1/w1',
            isComplete: false,
            isHardComplete: false,
            tasks: [
              {
                id: 't1',
                title: 'Review marketing analytics',
                isComplete: false,
                path: '/q1/w1/t1',
                date: '2024-03-15',
              },
              {
                id: 't2',
                title: 'Update social media strategy',
                isComplete: false,
                path: '/q1/w1/t2',
                date: '2024-03-15',
              },
            ],
          },
          {
            id: 'w2',
            title: 'Optimize Sales Funnel',
            path: '/q1/w2',
            isComplete: false,
            isHardComplete: false,
            tasks: [
              {
                id: 't3',
                title: 'Analyze conversion rates',
                isComplete: false,
                path: '/q1/w2/t3',
                date: '2024-03-15',
              },
            ],
          },
        ],
      },
      {
        id: 'q2',
        title: 'Launch New Product',
        path: '/q2',
        quarter: 1,
        progress: 0,
        weeklyGoals: [
          {
            id: 'w3',
            title: 'Complete MVP Development',
            path: '/q2/w3',
            isComplete: false,
            isHardComplete: false,
            tasks: [
              {
                id: 't4',
                title: 'Finalize feature list',
                isComplete: false,
                path: '/q2/w3/t4',
                date: '2024-03-15',
              },
              {
                id: 't5',
                title: 'Run integration tests',
                isComplete: false,
                path: '/q2/w3/t5',
                date: '2024-03-15',
              },
            ],
          },
        ],
      },
    ],
  },
  {
    weekLabel: 'Next Week',
    weekNumber: 4,
    days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
    quarterlyGoals: [
      {
        id: 'q1',
        title: 'Increase Sales',
        path: '/q1',
        quarter: 1,
        progress: 0,
        weeklyGoals: [
          {
            id: 'w1',
            title: 'Improve Customer Acquisition',
            path: '/q1/w1',
            isComplete: false,
            isHardComplete: false,
            tasks: [
              {
                id: 't1',
                title: 'Review marketing analytics',
                isComplete: false,
                path: '/q1/w1/t1',
                date: '2024-03-22',
              },
              {
                id: 't2',
                title: 'Update social media strategy',
                isComplete: false,
                path: '/q1/w1/t2',
                date: '2024-03-22',
              },
            ],
          },
          {
            id: 'w2',
            title: 'Optimize Sales Funnel',
            path: '/q1/w2',
            isComplete: false,
            isHardComplete: false,
            tasks: [
              {
                id: 't3',
                title: 'Analyze conversion rates',
                isComplete: false,
                path: '/q1/w2/t3',
                date: '2024-03-22',
              },
            ],
          },
        ],
      },
      {
        id: 'q2',
        title: 'Launch New Product',
        path: '/q2',
        quarter: 1,
        progress: 0,
        weeklyGoals: [
          {
            id: 'w3',
            title: 'Complete MVP Development',
            path: '/q2/w3',
            isComplete: false,
            isHardComplete: false,
            tasks: [
              {
                id: 't4',
                title: 'Finalize feature list',
                isComplete: false,
                path: '/q2/w3/t4',
                date: '2024-03-22',
              },
              {
                id: 't5',
                title: 'Run integration tests',
                isComplete: false,
                path: '/q2/w3/t5',
                date: '2024-03-22',
              },
            ],
          },
        ],
      },
    ],
  },
  {
    weekLabel: 'Next Next Week',
    weekNumber: 5,
    days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
    quarterlyGoals: [
      {
        id: 'q1',
        title: 'Increase Sales',
        path: '/q1',
        quarter: 1,
        progress: 0,
        weeklyGoals: [
          {
            id: 'w1',
            title: 'Improve Customer Acquisition',
            path: '/q1/w1',
            isComplete: false,
            isHardComplete: false,
            tasks: [
              {
                id: 't1',
                title: 'Review marketing analytics',
                isComplete: false,
                path: '/q1/w1/t1',
                date: '2024-03-29',
              },
              {
                id: 't2',
                title: 'Update social media strategy',
                isComplete: false,
                path: '/q1/w1/t2',
                date: '2024-03-29',
              },
            ],
          },
          {
            id: 'w2',
            title: 'Optimize Sales Funnel',
            path: '/q1/w2',
            isComplete: false,
            isHardComplete: false,
            tasks: [
              {
                id: 't3',
                title: 'Analyze conversion rates',
                isComplete: false,
                path: '/q1/w2/t3',
                date: '2024-03-29',
              },
            ],
          },
        ],
      },
      {
        id: 'q2',
        title: 'Launch New Product',
        path: '/q2',
        quarter: 1,
        progress: 0,
        weeklyGoals: [
          {
            id: 'w3',
            title: 'Complete MVP Development',
            path: '/q2/w3',
            isComplete: false,
            isHardComplete: false,
            tasks: [
              {
                id: 't4',
                title: 'Finalize feature list',
                isComplete: false,
                path: '/q2/w3/t4',
                date: '2024-03-29',
              },
              {
                id: 't5',
                title: 'Run integration tests',
                isComplete: false,
                path: '/q2/w3/t5',
                date: '2024-03-29',
              },
            ],
          },
        ],
      },
    ],
  },
];

// Generate mock data based on current date
const generateMockData = (): WeekData[] => {
  const now = DateTime.now();
  const currentQuarter = Math.ceil(now.month / 3) as 1 | 2 | 3 | 4;

  return mockWeekData.map((week, index) => {
    // Calculate the date for this week relative to current week
    const weekOffset = index - 2; // index 2 is "This Week"
    const weekDate = now.plus({ weeks: weekOffset });

    return {
      ...week,
      weekNumber: weekDate.weekNumber,
      quarterlyGoals: week.quarterlyGoals.map((goal) => ({
        ...goal,
        quarter: currentQuarter,
        weeklyGoals: goal.weeklyGoals.map((weeklyGoal) => ({
          ...weeklyGoal,
          tasks: weeklyGoal.tasks.map((task) => ({
            ...task,
            date: weekDate.toISODate() as string,
          })),
        })),
      })),
    };
  });
};

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
  const [localGoals, setLocalGoals] = useState<WeekData[]>(generateMockData());
  const [isTeamCollapsed, setIsTeamCollapsed] = useState(false);
  const [editState, setEditState] = useState<EditState | null>(null);
  const [goalSectionOpenStates, setGoalSectionOpenStates] = useState<boolean[]>(
    []
  );
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
    setGoalSectionOpenStates(new Array(localGoals.length).fill(false));
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
          quarterlyGoals: week.quarterlyGoals.map((quarterlyGoal) => ({
            ...quarterlyGoal,
            weeklyGoals: quarterlyGoal.weeklyGoals.map((weeklyGoal) => {
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
          })),
        };
      })
    );
  };

  // Handler for toggling weekly goal completion
  const handleWeeklyGoalToggle = (weekIndex: number, weeklyGoalId: string) => {
    const week = localGoals[weekIndex];
    const weeklyGoal = week.quarterlyGoals
      .flatMap((q) => q.weeklyGoals)
      .find((wg) => wg.id === weeklyGoalId);

    if (!weeklyGoal) return;

    // If the goal is already hard complete, just toggle it off
    if (weeklyGoal.isHardComplete) {
      setLocalGoals((prevGoals) =>
        prevGoals.map((week, idx) => {
          if (idx !== weekIndex) return week;

          return {
            ...week,
            quarterlyGoals: week.quarterlyGoals.map((quarterlyGoal) => ({
              ...quarterlyGoal,
              weeklyGoals: quarterlyGoal.weeklyGoals.map((wg) => {
                if (wg.id !== weeklyGoalId) return wg;
                return {
                  ...wg,
                  isHardComplete: false,
                };
              }),
            })),
          };
        })
      );
      return;
    }

    // Check if all tasks are complete
    const hasIncompleteTasks = weeklyGoal.tasks.some(
      (task) => !task.isComplete
    );

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

        return {
          ...week,
          quarterlyGoals: week.quarterlyGoals.map((quarterlyGoal) => ({
            ...quarterlyGoal,
            weeklyGoals: quarterlyGoal.weeklyGoals.map((weeklyGoal) => {
              if (weeklyGoal.id !== weeklyGoalId) return weeklyGoal;

              const updatedTasks = weeklyGoal.tasks.map((task) =>
                task.id === taskId
                  ? { ...task, isComplete: !task.isComplete }
                  : task
              );

              // Find the task being toggled
              const toggledTask = weeklyGoal.tasks.find((t) => t.id === taskId);
              if (!toggledTask) return weeklyGoal;

              // If we're unchecking a task, also uncheck the weekly goal's hard completion
              const isUnchecking = toggledTask.isComplete;

              // Update weekly goal soft completion based on all tasks being complete
              const allTasksComplete = updatedTasks.every(
                (task) => task.isComplete
              );

              return {
                ...weeklyGoal,
                tasks: updatedTasks,
                isComplete: allTasksComplete,
                ...(isUnchecking && { isHardComplete: false }), // Remove hard completion when unchecking a task
              };
            }),
          })),
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
    const goal = localGoals[weekIndex].quarterlyGoals.find(
      (g) => g.id === goalId
    );
    if (!goal) return;

    setEditState({
      weekIndex,
      goalId,
      type,
      originalValue:
        type === 'title' ? goal.title : `[${goal.weeklyGoals.length}/10]`,
    });
  };

  const handleUpdateGoal = (
    weekIndex: number,
    goalId: string,
    newTitle: string
  ) => {
    setLocalGoals((prevGoals) =>
      prevGoals.map((week, idx) => {
        if (idx !== weekIndex) return week;
        return {
          ...week,
          quarterlyGoals: week.quarterlyGoals.map((goal) =>
            goal.id === goalId ? { ...goal, title: newTitle } : goal
          ),
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
    setLocalGoals((prevGoals) =>
      prevGoals.map((week, idx) => {
        if (idx !== weekIndex) return week;
        return {
          ...week,
          quarterlyGoals: week.quarterlyGoals.map((goal) =>
            goal.id === goalId
              ? {
                  ...goal,
                  weeklyGoals: goal.weeklyGoals.map((wg, i) =>
                    i < newProgress
                      ? { ...wg, isComplete: true }
                      : { ...wg, isComplete: false }
                  ),
                }
              : goal
          ),
        };
      })
    );
    setEditState(null);
  };

  const handleToggleStar = (weekIndex: number, goalId: string) => {
    setLocalGoals((prevGoals) =>
      prevGoals.map((week, idx) => {
        if (idx !== weekIndex) return week;
        return {
          ...week,
          quarterlyGoals: week.quarterlyGoals.map((goal) =>
            goal.id === goalId
              ? { ...goal, isStarred: !goal.isStarred, isPinned: false }
              : goal
          ),
        };
      })
    );
  };

  const handleTogglePin = (weekIndex: number, goalId: string) => {
    setLocalGoals((prevGoals) =>
      prevGoals.map((week, idx) => {
        if (idx !== weekIndex) return week;
        return {
          ...week,
          quarterlyGoals: week.quarterlyGoals.map((goal) =>
            goal.id === goalId
              ? { ...goal, isPinned: !goal.isPinned, isStarred: false }
              : goal
          ),
        };
      })
    );
  };

  const handleGoalSectionOpenChange = (weekIndex: number, isOpen: boolean) => {
    setGoalSectionOpenStates((prev) => {
      const newStates = [...prev];
      newStates[weekIndex] = isOpen;
      return newStates;
    });
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
      <div className="w-full px-4 py-4">
        <div
          ref={containerRef}
          className="w-full overflow-x-auto scrollbar-hide"
          style={{
            scrollSnapType: 'x mandatory',
            WebkitOverflowScrolling: 'touch',
          }}
        >
          <div className="flex" style={{ gap: '1rem', padding: '0' }}>
            {localGoals.map((week, weekIndex) => (
              <div
                key={weekIndex}
                style={{
                  width: 'calc(25vw - 1.5rem)',
                  flexShrink: 0,
                  scrollSnapAlign: 'center',
                }}
                className="flex flex-col border rounded shadow bg-white p-4"
              >
                <h2 className="font-bold text-lg mb-2">{week.weekLabel}</h2>

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

                {/* Quarter Goals Section */}
                <GoalSection
                  goals={week.quarterlyGoals}
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
                  onToggleStar={handleToggleStar}
                  onTogglePin={handleTogglePin}
                />

                {/* Weekly Goals Section */}
                <section className="mb-4">
                  <h3 className="font-semibold mb-3">Weekly Goals</h3>
                  <WeeklyGoalSection
                    quarterlyGoals={week.quarterlyGoals}
                    onWeeklyGoalToggle={(goalId) =>
                      handleWeeklyGoalToggle(weekIndex, goalId)
                    }
                  />
                </section>

                {/* Daily Goals Section */}
                <section>
                  <h3 className="font-semibold mb-4">Daily Goals</h3>
                  <DailyGoalSection
                    quarterlyGoals={week.quarterlyGoals}
                    onTaskToggle={(taskId, weeklyGoalId) =>
                      handleTaskToggle(weekIndex, taskId, weeklyGoalId)
                    }
                    onWeeklyGoalToggle={(weeklyGoalId) =>
                      handleWeeklyGoalToggle(weekIndex, weeklyGoalId)
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
