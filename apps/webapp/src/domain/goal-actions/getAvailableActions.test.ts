import { describe, expect, it } from 'vitest';

import { getAvailableActionIds } from './getAvailableActions';
import { GoalActionId, GoalType } from './types';

describe('getAvailableActionIds', () => {
  it('returns correct actions for quarterly goals', () => {
    const actions = getAvailableActionIds(GoalType.Quarterly);
    expect(actions).toContain(GoalActionId.ViewFullDetails);
    expect(actions).toContain(GoalActionId.ViewSummary);
    expect(actions).toContain(GoalActionId.Edit);
    expect(actions).toContain(GoalActionId.MarkPending);
    expect(actions).toContain(GoalActionId.ToggleFireStatus);
    expect(actions).toContain(GoalActionId.Delete);
    expect(actions).not.toContain(GoalActionId.MoveToWeek);
    expect(actions).not.toContain(GoalActionId.ToggleBacklog);
  });

  it('returns correct actions for weekly goals', () => {
    const actions = getAvailableActionIds(GoalType.Weekly);
    expect(actions).toContain(GoalActionId.ViewFullDetails);
    expect(actions).toContain(GoalActionId.MoveToWeek);
    expect(actions).toContain(GoalActionId.Edit);
    expect(actions).toContain(GoalActionId.MarkPending);
    expect(actions).toContain(GoalActionId.ToggleFireStatus);
    expect(actions).toContain(GoalActionId.Delete);
    expect(actions).not.toContain(GoalActionId.ViewSummary);
    expect(actions).not.toContain(GoalActionId.ToggleBacklog);
  });

  it('returns correct actions for daily goals', () => {
    const actions = getAvailableActionIds(GoalType.Daily);
    expect(actions).toContain(GoalActionId.ViewFullDetails);
    expect(actions).toContain(GoalActionId.Edit);
    expect(actions).toContain(GoalActionId.MarkPending);
    expect(actions).toContain(GoalActionId.ToggleFireStatus);
    expect(actions).toContain(GoalActionId.Delete);
    expect(actions).not.toContain(GoalActionId.ViewSummary);
    expect(actions).not.toContain(GoalActionId.MoveToWeek);
    expect(actions).not.toContain(GoalActionId.ToggleBacklog);
  });

  it('returns correct actions for adhoc goals', () => {
    const actions = getAvailableActionIds(GoalType.Adhoc);
    expect(actions).toContain(GoalActionId.ViewFullDetails);
    expect(actions).toContain(GoalActionId.Edit);
    expect(actions).toContain(GoalActionId.MarkPending);
    expect(actions).toContain(GoalActionId.ToggleFireStatus);
    expect(actions).toContain(GoalActionId.ToggleBacklog);
    expect(actions).toContain(GoalActionId.Delete);
    expect(actions).not.toContain(GoalActionId.ViewSummary);
    expect(actions).not.toContain(GoalActionId.MoveToWeek);
  });

  it('includes fire status toggle for all goal types', () => {
    for (const goalType of Object.values(GoalType)) {
      const actions = getAvailableActionIds(goalType);
      expect(actions).toContain(GoalActionId.ToggleFireStatus);
    }
  });
});
