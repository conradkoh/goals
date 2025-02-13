import { describe, it, expect } from 'vitest';
import { Id } from '../../convex/_generated/dataModel';

// Import the buildGoalTree function
// Since it's not exported, we'll need to test through getWeekDetails
// Let's create a test-only export of buildGoalTree
import { buildGoalTree } from './getWeekDetails';
describe('buildGoalTree', () => {
  it('should build a tree with quarterly and weekly goals', () => {
    const goals = [
      {
        _id: 'quarterly1' as Id<'goals'>,
        _creationTime: 1234567890,
        userId: 'user1' as Id<'users'>,
        year: 2024,
        quarter: 1,
        depth: 0,
        inPath: '/',
        title: 'Quarterly Goal 1',
      },
      {
        _id: 'weekly1' as Id<'goals'>,
        _creationTime: 1234567890,
        userId: 'user1' as Id<'users'>,
        year: 2024,
        quarter: 1,
        depth: 1,
        inPath: '/quarterly1',
        parentId: 'quarterly1' as Id<'goals'>,
        title: 'Weekly Goal 1',
      },
      {
        _id: 'weekly2' as Id<'goals'>,
        _creationTime: 1234567890,
        userId: 'user1' as Id<'users'>,
        year: 2024,
        quarter: 1,
        depth: 1,
        inPath: '/quarterly1',
        parentId: 'quarterly1' as Id<'goals'>,
        title: 'Weekly Goal 2',
      },
    ];

    const { tree, index } = buildGoalTree(goals, (n) => ({
      ...n,
      weeklyGoal: undefined,
    }));

    // Verify tree structure
    expect(tree).toHaveLength(1);
    expect(tree[0]._id).toBe('quarterly1');
    expect(tree[0].children).toHaveLength(2);
    expect(tree[0].children[0]._id).toBe('weekly1');
    expect(tree[0].children[1]._id).toBe('weekly2');

    // Verify paths
    expect(tree[0].path).toBe('/quarterly1');
    expect(tree[0].children[0].path).toBe('/quarterly1/weekly1');
    expect(tree[0].children[1].path).toBe('/quarterly1/weekly2');
  });

  it('should handle multiple quarterly goals', () => {
    const goals = [
      {
        _id: 'quarterly1' as Id<'goals'>,
        _creationTime: 1234567890,
        userId: 'user1' as Id<'users'>,
        year: 2024,
        quarter: 1,
        depth: 0,
        inPath: '/',
        title: 'Quarterly Goal 1',
      },
      {
        _id: 'quarterly2' as Id<'goals'>,
        _creationTime: 1234567890,
        userId: 'user1' as Id<'users'>,
        year: 2024,
        quarter: 1,
        depth: 0,
        inPath: '/',
        title: 'Quarterly Goal 2',
      },
      {
        _id: 'weekly1' as Id<'goals'>,
        _creationTime: 1234567890,
        userId: 'user1' as Id<'users'>,
        year: 2024,
        quarter: 1,
        depth: 1,
        inPath: '/quarterly1',
        parentId: 'quarterly1' as Id<'goals'>,
        title: 'Weekly Goal 1',
      },
      {
        _id: 'weekly2' as Id<'goals'>,
        _creationTime: 1234567890,
        userId: 'user1' as Id<'users'>,
        year: 2024,
        quarter: 1,
        depth: 1,
        inPath: '/quarterly2',
        parentId: 'quarterly2' as Id<'goals'>,
        title: 'Weekly Goal 2',
      },
    ];

    const { tree } = buildGoalTree(goals, (n) => ({
      ...n,
      weeklyGoal: undefined,
    }));

    expect(tree).toHaveLength(2);
    expect(tree[0].children).toHaveLength(1);
    expect(tree[1].children).toHaveLength(1);
  });

  it('should throw error for weekly goal without parent', () => {
    const goals = [
      {
        _id: 'weekly1' as Id<'goals'>,
        _creationTime: 1234567890,
        userId: 'user1' as Id<'users'>,
        year: 2024,
        quarter: 1,
        depth: 1,
        inPath: '/quarterly1',
        title: 'Weekly Goal 1',
      },
    ];

    expect(() =>
      buildGoalTree(goals, (n) => ({
        ...n,
        weeklyGoal: undefined,
      }))
    ).toThrow('depth 1 goal has no parent');
  });

  it('should throw error for weekly goal with non-existent parent', () => {
    const goals = [
      {
        _id: 'weekly1' as Id<'goals'>,
        _creationTime: 1234567890,
        userId: 'user1' as Id<'users'>,
        year: 2024,
        quarter: 1,
        depth: 1,
        inPath: '/quarterly1',
        parentId: 'nonexistent' as Id<'goals'>,
        title: 'Weekly Goal 1',
      },
    ];

    expect(() =>
      buildGoalTree(goals, (n) => ({
        ...n,
        weeklyGoal: undefined,
      }))
    ).toThrow('depth 1 goal has no parent');
  });
});
