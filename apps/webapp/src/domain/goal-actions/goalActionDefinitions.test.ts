import { describe, expect, it } from 'vitest';

import { getActionLabel } from './goalActionDefinitions';
import { GoalActionId, type GoalActionState } from './types';

describe('getActionLabel', () => {
  const baseState: GoalActionState = {
    isOnFire: false,
    isPending: false,
    isBacklog: false,
    isComplete: false,
  };

  it('returns static labels for simple actions', () => {
    expect(getActionLabel(GoalActionId.ViewFullDetails, baseState)).toBe('View Full Details');
    expect(getActionLabel(GoalActionId.Edit, baseState)).toBe('Edit');
    expect(getActionLabel(GoalActionId.Delete, baseState)).toBe('Delete');
  });

  it('returns dynamic label for pending based on state', () => {
    expect(getActionLabel(GoalActionId.MarkPending, baseState)).toBe('Mark Pending');
    expect(getActionLabel(GoalActionId.MarkPending, { ...baseState, isPending: true })).toBe(
      'Update Pending'
    );
  });

  it('returns dynamic label for fire status based on state', () => {
    expect(getActionLabel(GoalActionId.ToggleFireStatus, baseState)).toBe('Mark Urgent');
    expect(getActionLabel(GoalActionId.ToggleFireStatus, { ...baseState, isOnFire: true })).toBe(
      'Remove Urgent'
    );
  });

  it('returns dynamic label for backlog based on state', () => {
    expect(getActionLabel(GoalActionId.ToggleBacklog, baseState)).toBe('Move to Backlog');
    expect(getActionLabel(GoalActionId.ToggleBacklog, { ...baseState, isBacklog: true })).toBe(
      'Move to Active'
    );
  });
});
