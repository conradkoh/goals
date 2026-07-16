'use client';

import type { Id } from '@workspace/backend/convex/_generated/dataModel';
import type { FocusedGoalItem } from '@workspace/backend/convex/bff/focus';

import { FocusedGoalListItem } from './FocusedGoalListItem';

type FocusedGoalListItemFromGoalProps = {
  goal: FocusedGoalItem;
  onToggleComplete: (goalId: FocusedGoalItem['_id'], isComplete: boolean) => void;
  initiativeTitleMap: Map<Id<'initiatives'>, string>;
  initiativeColorMap: Map<Id<'initiatives'>, string>;
  isAdhoc?: boolean;
  indentLevel?: number;
  leadingIndicator?: React.ReactNode;
  incompleteClassName?: string;
};

function getInitiativeDisplay(
  initiativeId: Id<'initiatives'> | undefined,
  initiativeTitleMap: Map<Id<'initiatives'>, string>,
  initiativeColorMap: Map<Id<'initiatives'>, string>
) {
  if (!initiativeId) {
    return { initiativeTitle: undefined, initiativeColor: undefined };
  }
  return {
    initiativeTitle: initiativeTitleMap.get(initiativeId),
    initiativeColor: initiativeColorMap.get(initiativeId),
  };
}

export function FocusedGoalListItemFromGoal({
  goal,
  onToggleComplete,
  initiativeTitleMap,
  initiativeColorMap,
  isAdhoc = goal.isAdhoc,
  indentLevel,
  leadingIndicator,
  incompleteClassName,
}: FocusedGoalListItemFromGoalProps) {
  const initiative = getInitiativeDisplay(
    goal.initiativeId,
    initiativeTitleMap,
    initiativeColorMap
  );

  return (
    <FocusedGoalListItem
      goalId={goal._id}
      title={goal.title}
      isComplete={goal.isComplete}
      isAdhoc={isAdhoc}
      year={goal.year}
      quarter={goal.quarter as 1 | 2 | 3 | 4}
      weekNumber={goal.weekNumber ?? undefined}
      onToggleComplete={onToggleComplete}
      indentLevel={indentLevel ?? goal.indentLevel}
      leadingIndicator={leadingIndicator}
      incompleteClassName={incompleteClassName}
      initiativeTitle={initiative.initiativeTitle}
      initiativeColor={initiative.initiativeColor}
    />
  );
}
