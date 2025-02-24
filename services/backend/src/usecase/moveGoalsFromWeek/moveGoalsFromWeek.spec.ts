import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Id } from '../../../convex/_generated/dataModel';
import { moveGoalsFromWeekUsecase } from './moveGoalsFromWeek';
import { GoalDepth } from './types';

describe('moveGoalsFromWeekUsecase', () => {
  // Mock database context
  const mockCtx = {
    db: {
      query: vi.fn(),
      get: vi.fn(),
      insert: vi.fn(),
      patch: vi.fn(),
    },
  };

  // Helper to create a mock goal
  const createMockGoal = (
    id: string,
    depth: GoalDepth,
    parentId?: string,
    isComplete = false
  ) => ({
    _id: id as Id<'goals'>,
    _creationTime: 1234567890,
    userId: 'user1' as Id<'users'>,
    year: 2024,
    quarter: 1,
    depth,
    inPath: parentId ? `/${parentId}` : '/',
    ...(parentId && { parentId: parentId as Id<'goals'> }),
    title: `Goal ${id}`,
  });

  // Helper to create a mock weekly state
  const createMockWeeklyState = (
    goalId: string,
    isComplete = false,
    isStarred = false,
    isPinned = false
  ) => ({
    _id: `weekly_${goalId}` as Id<'goalsWeekly'>,
    userId: 'user1' as Id<'users'>,
    year: 2024,
    quarter: 1,
    weekNumber: 1,
    goalId: goalId as Id<'goals'>,
    progress: '',
    isComplete,
    isStarred,
    isPinned,
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should handle dry run preview', async () => {
    // Setup mock data
    const quarterlyGoal = createMockGoal('q1', GoalDepth.Quarterly);
    const weeklyGoal = createMockGoal('w1', GoalDepth.Weekly, 'q1');
    const dailyGoal = createMockGoal('d1', GoalDepth.Daily, 'w1');

    const quarterlyState = createMockWeeklyState('q1', false, true, true);
    const weeklyState = createMockWeeklyState('w1', false);
    const dailyState = createMockWeeklyState('d1', false);

    // Setup mock responses for different queries
    mockCtx.db.query.mockImplementation((table) => {
      const mockQuery = {
        withIndex: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        filter: vi.fn().mockReturnThis(),
        first: vi.fn(),
        collect: vi.fn(),
      };

      // For the initial goals query
      if (table === 'goalsWeekly') {
        mockQuery.collect.mockReturnValue([
          quarterlyState,
          weeklyState,
          dailyState,
        ]);
        mockQuery.first.mockImplementation(() => dailyState);
      }

      // For the child goals query
      if (table === 'goals') {
        mockQuery.collect.mockReturnValue([dailyGoal]);
      }

      return {
        withIndex: () => ({
          eq: mockQuery.eq,
          filter: mockQuery.filter,
          first: mockQuery.first,
          collect: mockQuery.collect,
        }),
      };
    });

    // Mock goal lookups
    mockCtx.db.get.mockImplementation((id) => {
      const goals = {
        q1: quarterlyGoal,
        w1: weeklyGoal,
        d1: dailyGoal,
      };
      return goals[id as keyof typeof goals];
    });

    // Execute the usecase
    const result = await moveGoalsFromWeekUsecase(mockCtx as any, {
      userId: 'user1' as Id<'users'>,
      from: { year: 2024, quarter: 1, weekNumber: 1 },
      to: { year: 2024, quarter: 1, weekNumber: 2 },
      dryRun: true,
    });

    // Verify the preview data
    expect(result).toEqual({
      canPull: true,
      weeklyGoalsToCopy: [
        {
          title: 'Goal w1',
          carryOver: {
            type: 'week',
            numWeeks: 1,
            fromGoal: 'w1',
          },
          dailyGoalsCount: 1,
        },
      ],
      dailyGoalsToMove: [
        {
          title: 'Goal d1',
          weeklyGoalTitle: 'Goal w1',
        },
      ],
      quarterlyGoalsToUpdate: [
        {
          title: 'Goal q1',
          isStarred: true,
          isPinned: true,
        },
      ],
    });
  });

  it('should perform actual updates', async () => {
    // Setup mock data
    const quarterlyGoal = createMockGoal('q1', GoalDepth.Quarterly);
    const weeklyGoal = createMockGoal('w1', GoalDepth.Weekly, 'q1');
    const dailyGoal = createMockGoal('d1', GoalDepth.Daily, 'w1');

    const quarterlyState = createMockWeeklyState('q1', false, true, true);
    const weeklyState = createMockWeeklyState('w1', false);
    const dailyState = createMockWeeklyState('d1', false);

    // Setup mock responses for different queries
    mockCtx.db.query.mockImplementation((table) => {
      const mockQuery = {
        withIndex: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        filter: vi.fn().mockReturnThis(),
        first: vi.fn(),
        collect: vi.fn(),
      };

      // For the initial goals query
      if (table === 'goalsWeekly') {
        mockQuery.collect.mockReturnValue([
          quarterlyState,
          weeklyState,
          dailyState,
        ]);
        mockQuery.first.mockImplementation(() => dailyState);
      }

      // For the child goals query
      if (table === 'goals') {
        mockQuery.collect.mockReturnValue([dailyGoal]);
      }

      return {
        withIndex: () => ({
          eq: mockQuery.eq,
          filter: mockQuery.filter,
          first: mockQuery.first,
          collect: mockQuery.collect,
        }),
      };
    });

    // Mock goal lookups
    mockCtx.db.get.mockImplementation((id) => {
      const goals = {
        q1: quarterlyGoal,
        w1: weeklyGoal,
        d1: dailyGoal,
      };
      return goals[id as keyof typeof goals];
    });

    mockCtx.db.insert.mockReturnValue('new_goal_id' as Id<'goals'>);

    // Execute the usecase
    const result = await moveGoalsFromWeekUsecase(mockCtx as any, {
      userId: 'user1' as Id<'users'>,
      from: { year: 2024, quarter: 1, weekNumber: 1 },
      to: { year: 2024, quarter: 1, weekNumber: 2 },
      dryRun: false,
    });

    // Verify the actual updates
    expect(result).toEqual({
      weeklyGoalsCopied: 1,
      dailyGoalsMoved: 1,
      quarterlyGoalsUpdated: 1,
    });

    // Verify database operations
    expect(mockCtx.db.patch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        isStarred: true,
        isPinned: true,
      })
    );

    expect(mockCtx.db.insert).toHaveBeenCalledWith(
      'goals',
      expect.objectContaining({
        userId: 'user1',
        year: 2024,
        quarter: 1,
      })
    );

    expect(mockCtx.db.patch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        weekNumber: 2,
      })
    );
  });
});
