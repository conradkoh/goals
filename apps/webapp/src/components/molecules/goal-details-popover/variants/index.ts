/**
 * Goal Popover Variants
 *
 * Provides specialized popover components for different goal types:
 * - QuarterlyGoalPopover: For top-level quarterly goals with star/pin controls
 * - WeeklyGoalPopover: For weekly goals under quarterly goals
 * - DailyGoalPopover: For daily goals under weekly goals
 * - AdhocGoalPopover: For adhoc tasks with domain support
 * - StandaloneGoalPopover: Self-contained modal for any goal type
 *
 * @module
 */

export { AdhocGoalPopover, type AdhocGoalPopoverProps } from './AdhocGoalPopover';
export {
  AdhocGoalPopoverContent,
  type AdhocGoalPopoverContentProps,
} from './AdhocGoalPopoverContent';
export { DailyGoalPopover, type DailyGoalPopoverProps } from './DailyGoalPopover';
export { QuarterlyGoalPopover, type QuarterlyGoalPopoverProps } from './QuarterlyGoalPopover';
export {
  QuarterlyGoalPopoverContent,
  type QuarterlyGoalPopoverContentProps,
} from './QuarterlyGoalPopoverContent';
export { StandaloneGoalPopover, type StandaloneGoalPopoverProps } from './StandaloneGoalPopover';
export { WeeklyGoalPopover, type WeeklyGoalPopoverProps } from './WeeklyGoalPopover';
