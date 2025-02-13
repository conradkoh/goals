'use client';
import { Id } from '@services/backend/convex/_generated/dataModel';
import React, { useEffect, useRef, useState } from 'react';
import { useDashboard } from '../../hooks/useDashboard';
import type {
  EditState,
  QuarterlyGoalBase,
  QuarterlyGoalState,
  WeeklyGoalBase,
  WeeklyGoalState,
  TaskBase,
  TaskState,
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
import { Search, Bell, User, Plus, ChevronsUpDown } from 'lucide-react';
import { Input } from '../ui/input';
import {
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent,
} from '../ui/collapsible';

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
  quarterlyGoals: QuarterlyGoalBase[];
  quarterlyGoalStates: QuarterlyGoalState[];
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

interface GoalInputProps {
  placeholder: string;
  onSubmit: (value: string) => void;
}

const GoalInput: React.FC<GoalInputProps> = ({ placeholder, onSubmit }) => {
  const [value, setValue] = useState('');

  const handleSubmit = () => {
    if (!value.trim()) return;
    onSubmit(value.trim());
    setValue('');
  };

  return (
    <div className="flex items-center gap-2">
      <Input
        placeholder={placeholder}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyPress={(e) => {
          if (e.key === 'Enter') {
            handleSubmit();
          }
        }}
        className="h-8 text-sm"
      />
      <Button
        size="sm"
        variant="ghost"
        className="h-8 w-8 p-0"
        onClick={handleSubmit}
      >
        <Plus className="h-4 w-4" />
      </Button>
    </div>
  );
};

const QuarterOverviewScreen = () => {
  const {
    currentYear,
    currentQuarter,
    currentDate,
    currentWeekNumber,
    weekData,
    createQuarterlyGoal,
  } = useDashboard();

  const [localGoals, setLocalGoals] = useState<WeekData[]>(weekData);
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
  const [newQuarterlyGoalTitle, setNewQuarterlyGoalTitle] = useState('');

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
          quarterlyGoals: week.quarterlyGoals.map((goal) => {
            if (goal.id !== weeklyGoalId) return goal;

            return {
              ...goal,
              weeklyGoals: goal.weeklyGoals.map((weeklyGoal) => {
                if (weeklyGoal.id !== weeklyGoalId) return weeklyGoal;

                return {
                  ...weeklyGoal,
                  tasks: weeklyGoal.tasks.map((task) => ({
                    ...task,
                  })),
                };
              }),
            };
          }),
          quarterlyGoalStates: week.quarterlyGoalStates.map((state) => {
            if (state.id !== weeklyGoalId) return state;
            return {
              ...state,
              weeklyGoalStates: state.weeklyGoalStates.map((state) => {
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
              }),
            };
          }),
        };
      })
    );
  };

  // Handler for toggling weekly goal completion
  const handleWeeklyGoalToggle = (weekIndex: number, weeklyGoalId: string) => {
    const week = localGoals[weekIndex];
    // Find the quarterly goal that contains this weekly goal
    const quarterlyGoal = week.quarterlyGoals.find((goal) =>
      goal.weeklyGoals.some((wg) => wg.id === weeklyGoalId)
    );
    if (!quarterlyGoal) return;

    const quarterlyGoalState = week.quarterlyGoalStates.find(
      (state) => state.id === quarterlyGoal.id
    );
    if (!quarterlyGoalState) return;

    const weeklyGoal = quarterlyGoal.weeklyGoals.find(
      (wg) => wg.id === weeklyGoalId
    );
    if (!weeklyGoal) return;

    const weeklyGoalState = quarterlyGoalState.weeklyGoalStates.find(
      (state) => state.id === weeklyGoalId
    );

    // If the goal is already hard complete, just toggle it off
    if (weeklyGoalState?.isHardComplete) {
      setLocalGoals((prevGoals) =>
        prevGoals.map((week, idx) => {
          if (idx !== weekIndex) return week;

          return {
            ...week,
            quarterlyGoalStates: week.quarterlyGoalStates.map((state) => {
              if (state.id !== quarterlyGoal.id) return state;
              return {
                ...state,
                weeklyGoalStates: state.weeklyGoalStates.map((wgState) => {
                  if (wgState.id !== weeklyGoalId) return wgState;
                  return {
                    ...wgState,
                    isHardComplete: false,
                  };
                }),
              };
            }),
          };
        })
      );
      return;
    }

    // Check if all tasks are complete
    const hasIncompleteTasks =
      weeklyGoalState?.taskStates.some((taskState) => !taskState.isComplete) ??
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

        return {
          ...week,
          quarterlyGoalStates: week.quarterlyGoalStates.map((state) => {
            const weeklyGoalState = state.weeklyGoalStates.find(
              (wgs) => wgs.id === weeklyGoalId
            );
            if (!weeklyGoalState) return state;

            const toggledTaskState = weeklyGoalState.taskStates.find(
              (t) => t.id === taskId
            );
            const isUnchecking = toggledTaskState?.isComplete;

            return {
              ...state,
              weeklyGoalStates: state.weeklyGoalStates.map((wgs) => {
                if (wgs.id !== weeklyGoalId) return wgs;

                const updatedTaskStates = wgs.taskStates.map((ts) =>
                  ts.id === taskId ? { ...ts, isComplete: !ts.isComplete } : ts
                );

                // Update weekly goal soft completion based on all tasks being complete
                const allTasksComplete = updatedTaskStates.every(
                  (ts) => ts.isComplete
                );

                return {
                  ...wgs,
                  taskStates: updatedTaskStates,
                  isComplete: allTasksComplete,
                  ...(isUnchecking && { isHardComplete: false }), // Remove hard completion when unchecking a task
                };
              }),
            };
          }),
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
    setLocalGoals((prev) =>
      prev.map((week, idx) => {
        if (idx !== weekIndex) return week;
        return {
          ...week,
          quarterlyGoalStates: week.quarterlyGoalStates.map((state) =>
            state.id === goalId ? { ...state, progress: newProgress } : state
          ),
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
          quarterlyGoalStates: week.quarterlyGoalStates.map((state) => ({
            ...state,
            isStarred: !state.isStarred,
            isPinned: false,
          })),
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
          quarterlyGoalStates: week.quarterlyGoalStates.map((state) => ({
            ...state,
            isPinned: !state.isPinned,
            isStarred: false,
          })),
        };
      })
    );
  };

  const handleGoalSectionOpenChange = (weekIndex: number, isOpen: boolean) => {
    setGoalSectionOpenStates((prev) => ({ ...prev, [weekIndex]: isOpen }));
  };

  const handleNewQuarterlyGoal = async (weekIndex: number) => {
    if (!newQuarterlyGoalTitle.trim()) return;

    // Create a new quarterly goal with all required properties
    const newGoal: QuarterlyGoalBase = {
      id: Math.random().toString(36).substr(2, 9),
      title: newQuarterlyGoalTitle.trim(),
      quarter: (Math.floor(weekIndex / 4) + 1) as 1 | 2 | 3 | 4,
      path: `/${weekIndex + 1}`,
      weeklyGoals: [],
    };

    // Create a new state for the quarterly goal
    const newGoalState: QuarterlyGoalState = {
      id: newGoal.id,
      progress: 0,
      isStarred: false,
      isPinned: false,
      isComplete: false,
      weeklyGoalStates: [],
    };

    setLocalGoals((prev: WeekData[]) =>
      prev.map((week) => {
        if (week.weekNumber !== weekIndex) return week;
        return {
          ...week,
          quarterlyGoals: [...week.quarterlyGoals, newGoal],
          quarterlyGoalStates: [...week.quarterlyGoalStates, newGoalState],
        };
      })
    );

    setNewQuarterlyGoalTitle('');
  };

  const handleNewWeeklyGoal = (
    weekIndex: number,
    quarterlyGoalId: string,
    title: string
  ) => {
    if (!title.trim()) return;

    setLocalGoals((prevGoals) =>
      prevGoals.map((week, idx) => {
        if (idx !== weekIndex) return week;

        const quarterlyGoal = week.quarterlyGoals.find(
          (goal) => goal.id === quarterlyGoalId
        );
        if (!quarterlyGoal) return week;

        const quarterlyGoalState = week.quarterlyGoalStates.find(
          (state) => state.id === quarterlyGoal.id
        );
        if (!quarterlyGoalState) return week;

        const newWeeklyGoal: WeeklyGoalBase = {
          id: Math.random().toString(36).substr(2, 9),
          title: title.trim(),
          path: `/quarters/${quarterlyGoal.quarter}/weeks/${week.weekNumber}`,
          weekNumber: week.weekNumber,
          tasks: [],
        };

        const newWeeklyGoalState: WeeklyGoalState = {
          id: newWeeklyGoal.id,
          isComplete: false,
          isHardComplete: false,
          taskStates: [],
        };

        return {
          ...week,
          quarterlyGoals: week.quarterlyGoals.map((goal) => {
            if (goal.id !== quarterlyGoalId) return goal;
            return {
              ...goal,
              weeklyGoals: [...goal.weeklyGoals, newWeeklyGoal],
            };
          }),
          quarterlyGoalStates: week.quarterlyGoalStates.map((state) => {
            if (state.id !== quarterlyGoalId) return state;
            return {
              ...state,
              weeklyGoalStates: [...state.weeklyGoalStates, newWeeklyGoalState],
            };
          }),
        };
      })
    );
  };

  const handleNewDailyGoal = (
    weekIndex: number,
    weeklyGoalId: string,
    dayDate: string,
    title: string
  ) => {
    if (!title.trim()) return;

    setLocalGoals((prevGoals) =>
      prevGoals.map((week, idx) => {
        if (idx !== weekIndex) return week;

        // Find the quarterly goal that contains this weekly goal
        const quarterlyGoal = week.quarterlyGoals.find((goal) =>
          goal.weeklyGoals.some((wg) => wg.id === weeklyGoalId)
        );
        if (!quarterlyGoal) return week;

        const quarterlyGoalState = week.quarterlyGoalStates.find(
          (state) => state.id === quarterlyGoal.id
        );
        if (!quarterlyGoalState) return week;

        const weeklyGoal = quarterlyGoal.weeklyGoals.find(
          (wg) => wg.id === weeklyGoalId
        );
        if (!weeklyGoal) return week;

        const newTask: TaskBase = {
          id: Math.random().toString(36).substr(2, 9),
          title: title.trim(),
          path: `${weeklyGoal.path}/task/${weeklyGoal.tasks.length + 1}`,
          date: dayDate,
        };

        const newTaskState: TaskState = {
          id: newTask.id,
          isComplete: false,
          date: dayDate,
        };

        return {
          ...week,
          quarterlyGoals: week.quarterlyGoals.map((goal) => {
            if (goal.id !== quarterlyGoal.id) return goal;
            return {
              ...goal,
              weeklyGoals: goal.weeklyGoals.map((wg) => {
                if (wg.id !== weeklyGoalId) return wg;
                return {
                  ...wg,
                  tasks: [...wg.tasks, newTask],
                };
              }),
            };
          }),
          quarterlyGoalStates: week.quarterlyGoalStates.map((state) => {
            if (state.id !== quarterlyGoal.id) return state;
            return {
              ...state,
              weeklyGoalStates: state.weeklyGoalStates.map((wgs) => {
                if (wgs.id !== weeklyGoalId) return wgs;
                return {
                  ...wgs,
                  taskStates: [...wgs.taskStates, newTaskState],
                };
              }),
            };
          }),
        };
      })
    );
  };

  const renderQuarterlyGoals = (week: WeekData) => {
    if (!week.quarterlyGoals || !week.quarterlyGoalStates) return null;

    // Separate goals into starred/pinned and regular
    const starredGoals = week.quarterlyGoals.filter(
      (goal, index) => week.quarterlyGoalStates[index].isStarred
    );
    const pinnedGoals = week.quarterlyGoals.filter(
      (goal, index) =>
        !week.quarterlyGoalStates[index].isStarred &&
        week.quarterlyGoalStates[index].isPinned
    );
    const regularGoals = week.quarterlyGoals.filter(
      (goal, index) =>
        !week.quarterlyGoalStates[index].isStarred &&
        !week.quarterlyGoalStates[index].isPinned
    );

    return (
      <div className="space-y-2">
        {/* Render starred goals first */}
        {starredGoals.map((goal) => (
          <QuarterlyGoalSection
            key={goal.id}
            goalBase={goal}
            weekState={
              week.quarterlyGoalStates[week.quarterlyGoals.indexOf(goal)]
            }
            weekIndex={week.weekNumber}
            isOpen={goalSectionOpenStates[week.weekNumber] ?? false}
            onOpenChange={(open) =>
              handleGoalSectionOpenChange(week.weekNumber, open)
            }
            editState={editState}
            onStartEditing={handleStartEditing}
            onCancelEditing={() => setEditState(null)}
            onUpdateGoal={handleUpdateGoal}
            onUpdateProgress={handleUpdateProgress}
            onToggleStar={() => handleToggleStar(week.weekNumber)}
            onTogglePin={() => handleTogglePin(week.weekNumber)}
          />
        ))}

        {/* Render pinned goals next */}
        {pinnedGoals.map((goal) => (
          <QuarterlyGoalSection
            key={goal.id}
            goalBase={goal}
            weekState={
              week.quarterlyGoalStates[week.quarterlyGoals.indexOf(goal)]
            }
            weekIndex={week.weekNumber}
            isOpen={goalSectionOpenStates[week.weekNumber] ?? false}
            onOpenChange={(open) =>
              handleGoalSectionOpenChange(week.weekNumber, open)
            }
            editState={editState}
            onStartEditing={handleStartEditing}
            onCancelEditing={() => setEditState(null)}
            onUpdateGoal={handleUpdateGoal}
            onUpdateProgress={handleUpdateProgress}
            onToggleStar={() => handleToggleStar(week.weekNumber)}
            onTogglePin={() => handleTogglePin(week.weekNumber)}
          />
        ))}

        {/* Render regular goals in a collapsible section */}
        {regularGoals.length > 0 && (
          <Collapsible
            open={goalSectionOpenStates[week.weekNumber] ?? false}
            onOpenChange={(open) =>
              handleGoalSectionOpenChange(week.weekNumber, open)
            }
          >
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500">Other Goals</span>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="sm">
                  <ChevronsUpDown className="h-4 w-4" />
                </Button>
              </CollapsibleTrigger>
            </div>
            <CollapsibleContent>
              <div className="space-y-1 mt-1">
                {regularGoals.map((goal) => (
                  <QuarterlyGoalSection
                    key={goal.id}
                    goalBase={goal}
                    weekState={
                      week.quarterlyGoalStates[
                        week.quarterlyGoals.indexOf(goal)
                      ]
                    }
                    weekIndex={week.weekNumber}
                    isOpen={goalSectionOpenStates[week.weekNumber] ?? false}
                    onOpenChange={(open) =>
                      handleGoalSectionOpenChange(week.weekNumber, open)
                    }
                    editState={editState}
                    onStartEditing={handleStartEditing}
                    onCancelEditing={() => setEditState(null)}
                    onUpdateGoal={handleUpdateGoal}
                    onUpdateProgress={handleUpdateProgress}
                    onToggleStar={() => handleToggleStar(week.weekNumber)}
                    onTogglePin={() => handleTogglePin(week.weekNumber)}
                  />
                ))}
              </div>
            </CollapsibleContent>
          </Collapsible>
        )}

        {/* Input for new quarterly goals */}
        <div className="mt-2">
          <Input
            placeholder="Add a quarterly goal..."
            value={newQuarterlyGoalTitle}
            onChange={(e) => setNewQuarterlyGoalTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && newQuarterlyGoalTitle.trim()) {
                handleNewQuarterlyGoal(week.weekNumber);
                setNewQuarterlyGoalTitle('');
              }
            }}
            className="h-8 text-sm"
          />
        </div>
      </div>
    );
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
                  {renderQuarterlyGoals(week)}

                  {/* Weekly Goals Section */}
                  <div className="space-y-4">
                    <h3 className="font-semibold">Weekly Goals</h3>
                    <div className="pl-4">
                      {week.quarterlyGoals.map(
                        (quarterlyGoal: QuarterlyGoalBase) => (
                          <div key={quarterlyGoal.id}>
                            <p className="text-sm font-medium mb-2">
                              {quarterlyGoal.title}
                            </p>
                            <GoalInput
                              placeholder="Add weekly goal..."
                              onSubmit={(value) =>
                                handleNewWeeklyGoal(
                                  weekIndex,
                                  quarterlyGoal.id,
                                  value
                                )
                              }
                            />
                            {quarterlyGoal.weeklyGoals.map(
                              (weeklyGoal: WeeklyGoalBase) => (
                                <div key={weeklyGoal.id} className="mt-2">
                                  <p className="text-sm font-medium">
                                    {weeklyGoal.title}
                                  </p>
                                </div>
                              )
                            )}
                          </div>
                        )
                      )}
                    </div>
                  </div>

                  {/* Daily Goals Section */}
                  <div className="space-y-4">
                    <h3 className="font-semibold">Daily Goals</h3>
                    {week.days.map((day) => (
                      <div key={day} className="space-y-2">
                        <h4 className="text-sm font-medium">{day}</h4>
                        {week.quarterlyGoals.map((quarterlyGoal) =>
                          quarterlyGoal.weeklyGoals.map((weeklyGoal) => (
                            <div key={weeklyGoal.id} className="pl-4 space-y-2">
                              <p className="text-sm text-muted-foreground">
                                {weeklyGoal.title}
                              </p>
                              {weeklyGoal.tasks
                                .filter((task) => task.date === day)
                                .map((task) => (
                                  <div key={task.id} className="pl-4">
                                    {task.title}
                                  </div>
                                ))}
                              <div className="mt-1">
                                <GoalInput
                                  placeholder="Add daily goal..."
                                  onSubmit={(value) =>
                                    handleNewDailyGoal(
                                      weekIndex,
                                      weeklyGoal.id,
                                      day,
                                      value
                                    )
                                  }
                                />
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    ))}
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
