/**
 * Goal Popover Variants
 *
 * Provides specialized popover components for different goal types:
 * - QuarterlyGoalPopover: For top-level quarterly goals with star/pin controls
 * - WeeklyGoalPopover: For weekly goals under quarterly goals
 * - DailyGoalPopover: For daily goals under weekly goals
 * - AdhocGoalPopover: For adhoc tasks with domain support
 * - StandaloneGoalModal: Self-contained modal for any goal type
 * - GoalPageContent: Full page view for any goal type
 *
 * @module
 */

export { AdhocGoalPopover, type AdhocGoalPopoverProps } from './AdhocGoalPopover';
export {
  AdhocGoalPopoverContent,
  type AdhocGoalPopoverContentProps,
} from './AdhocGoalPopoverContent';
export { DailyGoalPopover, type DailyGoalPopoverProps } from './DailyGoalPopover';
export { GoalPageContent, type GoalPageContentProps } from './GoalPageContent';
export { QuarterlyGoalPopover, type QuarterlyGoalPopoverProps } from './QuarterlyGoalPopover';
export {
  StandardGoalPopoverContent,
  type StandardGoalPopoverContentProps,
} from './StandardGoalPopoverContent';
export { StandaloneGoalModal, type StandaloneGoalModalProps } from './StandaloneGoalModal';
export { WeeklyGoalPopover, type WeeklyGoalPopoverProps } from './WeeklyGoalPopover';
export { WeeklyGoalPageContent, type WeeklyGoalPageContentProps } from './WeeklyGoalPageContent';
