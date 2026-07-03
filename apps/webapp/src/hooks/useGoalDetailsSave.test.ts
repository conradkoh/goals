import { renderHook, act } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import {
  useAdhocGoalDetailsSave,
  useAdhocGoalDetailsSaveViaHandler,
  useStructuredGoalDetailsSave,
} from './useGoalDetailsSave';

describe('useStructuredGoalDetailsSave', () => {
  it('calls onSave with title, new details, and dueDate from goal snapshot', () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    const goal = { title: 'My goal', dueDate: 123 };
    const { result } = renderHook(() => useStructuredGoalDetailsSave(onSave, goal));

    act(() => result.current('updated details'));

    expect(onSave).toHaveBeenCalledWith('My goal', 'updated details', 123);
  });

  it('does not pass domainId or initiativeId', () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    const goal = { title: 'G' };
    const { result } = renderHook(() => useStructuredGoalDetailsSave(onSave, goal));
    act(() => result.current('d'));
    expect(onSave.mock.calls[0]).toHaveLength(3);
  });
});

describe('useAdhocGoalDetailsSave', () => {
  it('calls updateAdhocGoal with details-only args', () => {
    const updateAdhocGoal = vi.fn().mockResolvedValue(undefined);
    const goalId = 'goal123' as any;
    const { result } = renderHook(() => useAdhocGoalDetailsSave(goalId, updateAdhocGoal));

    act(() => result.current('checkbox toggled'));

    expect(updateAdhocGoal).toHaveBeenCalledWith(goalId, { details: 'checkbox toggled' });
  });
});

describe('useAdhocGoalDetailsSaveViaHandler', () => {
  it('calls onSave with title, details, and adhoc dueDate', () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    const goal = { title: 'Adhoc', adhoc: { dueDate: 456 } };
    const { result } = renderHook(() => useAdhocGoalDetailsSaveViaHandler(onSave, goal));

    act(() => result.current('new details'));

    expect(onSave).toHaveBeenCalledWith('Adhoc', 'new details', 456);
  });
});
