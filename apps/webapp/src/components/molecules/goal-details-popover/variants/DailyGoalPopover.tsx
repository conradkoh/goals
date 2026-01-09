import type { Doc } from '@workspace/backend/convex/_generated/dataModel';
import { useCallback, type ReactNode } from 'react';

import {
  GoalActionMenuNew,
  GoalCompletionDate,
  GoalDetailsSection,
  GoalDisplayProvider,
  GoalDomainDisplay,
  GoalDueDateDisplay,
  GoalEditModal,
  GoalEditProvider,
  GoalHeader,
  useGoalDisplayContext,
  useGoalEditContext,
} from '../view/components';
import { GoalDetailsPopoverView, GoalPopoverTrigger } from '../view/GoalDetailsPopoverView';

import { GoalStatusIcons } from '@/components/atoms/GoalStatusIcons';
import { GoalLogTab } from '@/components/molecules/goal-log';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useGoalContext } from '@/contexts/GoalContext';
import { FireGoalsProvider } from '@/contexts/GoalStatusContext';
import { useDialogEscapeHandler } from '@/hooks/useDialogEscapeHandler';
import type { GoalCompletionHandler, GoalSaveHandler } from '@/models/goal-handlers';

export interface DailyGoalPopoverProps {
  /** Callback when goal is saved */
  onSave: GoalSaveHandler;
  /** Callback when completion is toggled */
  onToggleComplete?: GoalCompletionHandler;
  /** Additional class names for the trigger button */
  triggerClassName?: string;
  /** Additional class names for the title text */
  titleClassName?: string;
  /** Additional content to render (e.g., day selector) */
  additionalContent?: ReactNode;
  /** Optional domain to display */
  domain?: Doc<'domains'> | null;
  /** Week number for the domain popover context. When provided, clicking domain shows popover. */
  weekNumber?: number;
}

/**
 * Daily goal popover variant.
 * Shows goal details and optional additional content like day selection.
 * Daily goals don't have children.
 * Supports both popover and fullscreen display modes.
 *
 * Must be used within a GoalProvider context.
 */
export function DailyGoalPopover({
  onSave,
  onToggleComplete,
  triggerClassName,
  titleClassName,
  additionalContent,
  domain,
  weekNumber,
}: DailyGoalPopoverProps) {
  const { goal } = useGoalContext();
  const isComplete = goal.isComplete;

  return (
    <GoalEditProvider>
      <GoalDisplayProvider>
        <DailyGoalPopoverContentInner
          onSave={onSave}
          onToggleComplete={onToggleComplete}
          triggerClassName={triggerClassName}
          titleClassName={titleClassName}
          isComplete={isComplete}
          additionalContent={additionalContent}
          domain={domain}
          weekNumber={weekNumber}
        />
      </GoalDisplayProvider>
    </GoalEditProvider>
  );
}

/**
 * Internal props for the content component, extending the public props.
 */
interface DailyGoalPopoverContentInnerProps extends DailyGoalPopoverProps {
  /** Whether the goal is currently marked as complete */
  isComplete: boolean;
}

/**
 * Internal content component that renders the actual popover/dialog content.
 * Separated to access contexts that are provided by the parent component.
 */
function DailyGoalPopoverContentInner({
  onSave,
  onToggleComplete,
  triggerClassName,
  titleClassName,
  isComplete,
  additionalContent,
  domain,
  weekNumber,
}: DailyGoalPopoverContentInnerProps) {
  const { goal } = useGoalContext();
  const { isEditing, editingGoal, stopEditing } = useGoalEditContext();
  const { isFullScreenOpen, closeFullScreen } = useGoalDisplayContext();
  const { handleEscapeKeyDown, handleNestedActiveChange } = useDialogEscapeHandler();

  // Handler for updating goal details when task list items are toggled
  const handleDetailsChange = useCallback(
    (newDetails: string) => {
      onSave(goal.title, newDetails, goal.dueDate);
    },
    [onSave, goal.title, goal.dueDate]
  );

  // Shared content for both popover and fullscreen modes
  const goalContent = (
    <FireGoalsProvider>
      <GoalHeader
        title={goal.title}
        isComplete={isComplete}
        onToggleComplete={onToggleComplete}
        statusControls={<GoalStatusIcons goalId={goal._id} />}
        actionMenu={<GoalActionMenuNew onSave={onSave} isQuarterlyGoal={false} />}
      />

      {domain && <GoalDomainDisplay domain={domain} weekNumber={weekNumber} />}

      {isComplete && goal.completedAt && <GoalCompletionDate completedAt={goal.completedAt} />}

      {goal.dueDate && <GoalDueDateDisplay dueDate={goal.dueDate} isComplete={isComplete} />}

      {/* Tabs for Details and Log */}
      <Tabs defaultValue="details" className="mt-4">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="details">Details</TabsTrigger>
          <TabsTrigger value="log">Log</TabsTrigger>
        </TabsList>

        <TabsContent value="details" className="mt-4">
          {goal.details && (
            <GoalDetailsSection
              title={goal.title}
              details={goal.details}
              onDetailsChange={handleDetailsChange}
              showSeparator={false}
            />
          )}

          {additionalContent && (
            <>
              <Separator className="my-2" />
              <div className="pt-1">{additionalContent}</div>
            </>
          )}
        </TabsContent>

        <TabsContent value="log" className="mt-4">
          <GoalLogTab goalId={goal._id} onFormActiveChange={handleNestedActiveChange} />
        </TabsContent>
      </Tabs>
    </FireGoalsProvider>
  );

  return (
    <>
      {/* Popover mode */}
      <GoalDetailsPopoverView
        popoverKey={goal._id.toString()}
        trigger={
          <GoalPopoverTrigger
            title={goal.title}
            className={triggerClassName}
            titleClassName={titleClassName}
          />
        }
        onEscapeKeyDown={handleEscapeKeyDown}
      >
        {goalContent}
      </GoalDetailsPopoverView>

      {/* Fullscreen mode */}
      <GoalDetailsPopoverView
        popoverKey={`${goal._id.toString()}-fullscreen`}
        trigger={<span />}
        fullScreen
        open={isFullScreenOpen}
        onOpenChange={(open) => !open && closeFullScreen()}
        onEscapeKeyDown={handleEscapeKeyDown}
      >
        {goalContent}
      </GoalDetailsPopoverView>

      <GoalEditModal isOpen={isEditing} goal={editingGoal} onSave={onSave} onClose={stopEditing} />
    </>
  );
}
