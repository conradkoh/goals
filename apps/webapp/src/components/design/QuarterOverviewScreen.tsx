'use client';
import React, {
  useState,
  useEffect,
  useRef,
  ChangeEvent,
  KeyboardEvent,
  MouseEvent,
} from 'react';
import NavigationHeader from './NavigationHeader';
import { Star, Pin, ChevronsUpDown, Check, X } from 'lucide-react';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '../ui/collapsible';
import { Button } from '../ui/button';
import { Input } from '../ui/input';

interface Goal {
  id: string;
  title: string;
  progress: number;
  isStarred?: boolean;
  isPinned?: boolean;
}

interface WeekData {
  weekLabel: string;
  days: string[];
  goals: Goal[];
}

interface EditState {
  weekIndex: number;
  goalId: string;
  type: 'title' | 'progress';
  originalValue: string;
}

const mockGoals: Goal[] = [
  { id: '1', title: 'Increase Sales', progress: 7, isStarred: true },
  {
    id: '2',
    title: 'Improve Customer Satisfaction',
    progress: 5,
    isPinned: true,
  },
  { id: '3', title: 'Launch New Product', progress: 3 },
];

const weekData: WeekData[] = [
  {
    weekLabel: 'Prev Week',
    days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
    goals: mockGoals,
  },
  {
    weekLabel: 'Last Week',
    days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
    goals: mockGoals,
  },
  {
    weekLabel: 'This Week',
    days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
    goals: mockGoals,
  },
  {
    weekLabel: 'Next Week',
    days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
    goals: mockGoals,
  },
  {
    weekLabel: 'Next Next Week',
    days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
    goals: mockGoals,
  },
];

const QuarterOverviewScreen = () => {
  const [isTeamCollapsed, setIsTeamCollapsed] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const [editingGoal, setEditingGoal] = useState<EditState | null>(null);
  const [localGoals, setLocalGoals] = useState<WeekData[]>(weekData);
  const [isGoalsOpen, setIsGoalsOpen] = useState<{ [key: number]: boolean }>(
    {}
  );

  const toggleTeamCoordination = () => {
    setIsTeamCollapsed(!isTeamCollapsed);
  };

  // Center the scroll position on "This Week" when component mounts
  useEffect(() => {
    if (containerRef.current) {
      const scrollToCenter = () => {
        const containerWidth = containerRef.current?.clientWidth || 0;
        const cardWidth = containerWidth / 4;
        const numCardsBefore = 2;
        // Calculate scroll position to center on "This Week" (index 2)
        const scrollPosition =
          cardWidth * numCardsBefore - (containerWidth - cardWidth) / 2;
        containerRef.current?.scrollTo({
          left: scrollPosition,
          behavior: 'smooth',
        });
      };

      scrollToCenter();
      // Reapply centering after a short delay to ensure all content is loaded
      setTimeout(scrollToCenter, 100);
    }
  }, []);

  const handleGoalUpdate = (
    weekIndex: number,
    goalId: string,
    newTitle: string
  ) => {
    setLocalGoals((prevGoals) =>
      prevGoals.map((week, idx) =>
        idx === weekIndex
          ? {
              ...week,
              goals: week.goals.map((goal) =>
                goal.id === goalId ? { ...goal, title: newTitle } : goal
              ),
            }
          : week
      )
    );
    setEditingGoal(null);
  };

  const handleProgressUpdate = (
    weekIndex: number,
    goalId: string,
    newProgress: number
  ) => {
    setLocalGoals((prevGoals) =>
      prevGoals.map((week, idx) =>
        idx === weekIndex
          ? {
              ...week,
              goals: week.goals.map((goal) =>
                goal.id === goalId
                  ? {
                      ...goal,
                      progress: Math.min(10, Math.max(0, newProgress)),
                    }
                  : goal
              ),
            }
          : week
      )
    );
  };

  const toggleStar = (weekIndex: number, goalId: string) => {
    setLocalGoals((prevGoals) =>
      prevGoals.map((week, idx) =>
        idx === weekIndex
          ? {
              ...week,
              goals: week.goals.map((goal) =>
                goal.id === goalId
                  ? {
                      ...goal,
                      isStarred: !goal.isStarred,
                      isPinned: goal.isStarred ? goal.isPinned : false,
                    }
                  : goal
              ),
            }
          : week
      )
    );
  };

  const togglePin = (weekIndex: number, goalId: string) => {
    setLocalGoals((prevGoals) =>
      prevGoals.map((week, idx) =>
        idx === weekIndex
          ? {
              ...week,
              goals: week.goals.map((goal) =>
                goal.id === goalId
                  ? {
                      ...goal,
                      isPinned: !goal.isPinned,
                      isStarred: goal.isStarred,
                    }
                  : goal
              ),
            }
          : week
      )
    );
  };

  const startEditing = (
    weekIndex: number,
    goalId: string,
    type: 'title' | 'progress'
  ) => {
    const goal = localGoals[weekIndex].goals.find((g) => g.id === goalId);
    if (!goal) return;

    setEditingGoal({
      weekIndex,
      goalId,
      type,
      originalValue: type === 'title' ? goal.title : `[${goal.progress}/10]`,
    });
  };

  const cancelEditing = () => {
    setEditingGoal(null);
  };

  const renderActionButtons = (goal: Goal, weekIndex: number) => {
    const renderIconSlot = (
      icon: React.ReactNode,
      onClick: () => void,
      className: string
    ) => (
      <button
        onClick={onClick}
        className={`w-4 flex justify-center items-center transition-colors ${className}`}
        data-testid="goal-action-button"
      >
        {icon}
      </button>
    );

    if (goal.isStarred) {
      return (
        <div
          className="flex items-center gap-1"
          data-testid="goal-starred-actions"
        >
          {renderIconSlot(
            <Pin className="h-3.5 w-3.5" />,
            () => {
              toggleStar(weekIndex, goal.id);
              togglePin(weekIndex, goal.id);
            },
            'text-gray-400 hover:text-blue-500 opacity-0 group-hover:opacity-100'
          )}
          {renderIconSlot(
            <Star className="h-3.5 w-3.5" />,
            () => toggleStar(weekIndex, goal.id),
            'text-yellow-500 hover:text-yellow-600'
          )}
        </div>
      );
    }

    if (goal.isPinned) {
      return (
        <div
          className="flex items-center gap-1"
          data-testid="goal-pinned-actions"
        >
          {renderIconSlot(
            <Star className="h-3.5 w-3.5" />,
            () => {
              togglePin(weekIndex, goal.id);
              toggleStar(weekIndex, goal.id);
            },
            'text-gray-400 hover:text-yellow-500 opacity-0 group-hover:opacity-100'
          )}
          {renderIconSlot(
            <Pin className="h-3.5 w-3.5" />,
            () => togglePin(weekIndex, goal.id),
            'text-blue-500 hover:text-blue-600'
          )}
        </div>
      );
    }

    return (
      <div
        className="flex items-center gap-1 opacity-0 group-hover:opacity-100"
        data-testid="goal-default-actions"
      >
        {renderIconSlot(
          <Star className="h-3.5 w-3.5" />,
          () => toggleStar(weekIndex, goal.id),
          'text-gray-400 hover:text-yellow-500'
        )}
        {renderIconSlot(
          <Pin className="h-3.5 w-3.5" />,
          () => togglePin(weekIndex, goal.id),
          'text-gray-400 hover:text-blue-500'
        )}
      </div>
    );
  };

  const renderEditableField = (
    value: string,
    onConfirm: (value: string) => void,
    inputClassName: string,
    goal: Goal,
    weekIndex: number
  ) => (
    <div className="relative">
      <Input
        type="text"
        className={inputClassName}
        value={value}
        onChange={(e: ChangeEvent<HTMLInputElement>) => {
          if (editingGoal?.type === 'progress') {
            const match = e.target.value.match(/\[?(\d+)(?:\/10)?\]?/);
            if (match) {
              const value = parseInt(match[1]);
              handleProgressUpdate(weekIndex, goal.id, value);
            }
          }
        }}
        onKeyDown={(e: KeyboardEvent<HTMLInputElement>) => {
          if (e.key === 'Enter') {
            onConfirm(e.currentTarget.value);
          } else if (e.key === 'Escape') {
            cancelEditing();
          }
        }}
        autoFocus
        onClick={(e: MouseEvent) => e.stopPropagation()}
      />
      <div className="absolute -bottom-6 left-0 flex items-center gap-1">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onConfirm(
              e.currentTarget.form?.querySelector('input')?.value || ''
            );
          }}
          className="p-1 hover:bg-green-50 rounded text-green-600"
          aria-label="Confirm"
        >
          <Check className="h-3 w-3" />
        </button>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            cancelEditing();
          }}
          className="p-1 hover:bg-red-50 rounded text-red-600"
          aria-label="Cancel"
        >
          <X className="h-3 w-3" />
        </button>
      </div>
    </div>
  );

  const renderGoal = (goal: Goal, weekIndex: number) => {
    const isEditingTitle =
      editingGoal?.weekIndex === weekIndex &&
      editingGoal?.goalId === goal.id &&
      editingGoal?.type === 'title';
    const isEditingProgress =
      editingGoal?.weekIndex === weekIndex &&
      editingGoal?.goalId === goal.id &&
      editingGoal?.type === 'progress';

    return (
      <div
        key={goal.id}
        className="group flex items-center p-2 hover:bg-gray-50 rounded"
        data-testid={`goal-item-${goal.id}`}
      >
        {/* Action buttons container - always reserve space for two icons with consistent gap */}
        <div className="flex items-center" data-testid="goal-actions-container">
          <div
            className="flex items-center gap-2"
            data-testid="goal-icons-container"
          >
            {renderActionButtons(goal, weekIndex)}
          </div>
          {/* Add a spacer with the same gap */}
          <div className="w-2" data-testid="goal-icons-spacer" />
        </div>

        {/* Main content */}
        <div className="flex-1 min-w-0" data-testid="goal-content">
          {isEditingTitle ? (
            renderEditableField(
              editingGoal?.originalValue || goal.title,
              (value) => handleGoalUpdate(weekIndex, goal.id, value),
              'h-8',
              goal,
              weekIndex
            )
          ) : (
            <div
              className="flex items-center justify-between cursor-pointer"
              onClick={() => startEditing(weekIndex, goal.id, 'title')}
              data-testid="goal-display"
            >
              <span className="truncate" data-testid="goal-title">
                {goal.title}
              </span>
              {/* Progress indicator */}
              {isEditingProgress ? (
                renderEditableField(
                  editingGoal?.originalValue || `[${goal.progress}/10]`,
                  (value) => {
                    const match = value.match(/\[?(\d+)(?:\/10)?\]?/);
                    if (match) {
                      handleProgressUpdate(
                        weekIndex,
                        goal.id,
                        parseInt(match[1])
                      );
                    }
                    cancelEditing();
                  },
                  'w-16 h-6 text-center px-1 text-sm',
                  goal,
                  weekIndex
                )
              ) : (
                <span
                  className="text-gray-500 cursor-pointer text-sm ml-2 flex-shrink-0"
                  onClick={(e) => {
                    e.stopPropagation();
                    startEditing(weekIndex, goal.id, 'progress');
                  }}
                  data-testid="goal-progress"
                >
                  [{goal.progress}/10]
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderGoalsSection = (week: WeekData, weekIndex: number) => {
    const starredGoals = week.goals.filter((g) => g.isStarred);
    const pinnedGoals = week.goals.filter((g) => g.isPinned && !g.isStarred);
    const regularGoals = week.goals.filter((g) => !g.isStarred && !g.isPinned);

    return (
      <section className="mb-4">
        <h3 className="font-semibold mb-2">Quarter Goals Progress</h3>

        {/* Starred Goals */}
        {starredGoals.map((goal) => renderGoal(goal, weekIndex))}

        {/* Pinned Goals */}
        {pinnedGoals.map((goal) => renderGoal(goal, weekIndex))}

        {/* Regular Goals in Collapsible */}
        {regularGoals.length > 0 && (
          <Collapsible
            open={isGoalsOpen[weekIndex]}
            onOpenChange={(open: boolean) =>
              setIsGoalsOpen((prev) => ({ ...prev, [weekIndex]: open }))
            }
          >
            <div className="flex items-center justify-between py-2">
              <span className="text-sm text-gray-500">
                {regularGoals.length} more items
              </span>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="sm">
                  <ChevronsUpDown className="h-4 w-4" />
                </Button>
              </CollapsibleTrigger>
            </div>
            <CollapsibleContent>
              {regularGoals.map((goal) => renderGoal(goal, weekIndex))}
            </CollapsibleContent>
          </Collapsible>
        )}
      </section>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <NavigationHeader />
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
                {renderGoalsSection(week, weekIndex)}

                {/* Team Coordination Section */}
                <section className="mb-4">
                  <div className="flex justify-between items-center">
                    <h3 className="font-semibold">Team Coordination</h3>
                    <button
                      onClick={toggleTeamCoordination}
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
                  <h3 className="font-semibold">Weekly Goals</h3>
                  <ul className="list-disc list-inside text-sm">
                    <li>Complete report</li>
                    <li>Client meeting</li>
                    <li>Update roadmap</li>
                  </ul>
                </section>

                {/* Daily Goals Section */}
                <section>
                  <h3 className="font-semibold">Daily Goals</h3>
                  <div className="space-y-1">
                    {week.days.map((day, idx) => (
                      <div key={idx} className="border-t pt-1 text-sm">
                        {day}: Task overview for {day}
                      </div>
                    ))}
                  </div>
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
