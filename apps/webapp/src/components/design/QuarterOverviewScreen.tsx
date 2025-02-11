'use client';
import React, { useState, useEffect, useRef } from 'react';
import NavigationHeader from './NavigationHeader';
import { Goal, EditState } from './goals/GoalCard';
import { GoalSection } from './goals/GoalSection';

interface WeekData {
  weekLabel: string;
  days: string[];
  goals: Goal[];
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
                <GoalSection
                  goals={week.goals}
                  weekIndex={weekIndex}
                  isOpen={isGoalsOpen[weekIndex]}
                  onOpenChange={(open) =>
                    setIsGoalsOpen((prev) => ({ ...prev, [weekIndex]: open }))
                  }
                  editState={editingGoal}
                  onStartEditing={startEditing}
                  onCancelEditing={cancelEditing}
                  onUpdateGoal={handleGoalUpdate}
                  onUpdateProgress={handleProgressUpdate}
                  onToggleStar={toggleStar}
                  onTogglePin={togglePin}
                />

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
