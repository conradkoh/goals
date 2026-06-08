/**
 * @file Composable building blocks for goal list items.
 *
 * These components can be mixed and matched to create custom goal list item layouts.
 * Use the GoalListItemProvider to enable pending state tracking.
 */

export { GoalActionButtons, type GoalActionButtonsProps } from './GoalActionButtons';

export { GoalCheckbox, type GoalCheckboxProps } from './GoalCheckbox';
export {
  GoalListItemProvider,
  useGoalListItemContext,
  useGoalListItemContextOptional,
} from './GoalListItemContext';

export { GoalPendingIndicator, type GoalPendingIndicatorProps } from './GoalPendingIndicator';

// Re-export GoalStatusIcons from atoms (single source of truth)
export { GoalStatusIcons, type GoalStatusIconsProps } from '@/components/atoms/GoalStatusIcons';
