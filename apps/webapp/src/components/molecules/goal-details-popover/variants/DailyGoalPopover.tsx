import type { Doc, Id } from '@workspace/backend/convex/_generated/dataModel';
import type { ReactNode } from 'react';
import { useCallback } from 'react';

import {
  GoalActionMenuNew,
  GoalBreadcrumb,
  GoalCompletionDate,
  GoalCreatedDate,
  GoalDetailsSection,
  GoalDisplayProvider,
  GoalDomainDisplay,
  GoalDueDateDisplay,
  GoalEditModal,
  GoalEditProvider,
  GoalHeader,
  GoalInitiativeField,
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
import { GoalType } from '@/domain/goal-actions';
import { useDialogEscapeHandler } from '@/hooks/useDialogEscapeHandler';
import { useStructuredGoalDetailsSave } from '@/hooks/useGoalDetailsSave';
import { useWeek } from '@/hooks/useWeek';
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
  const { year, quarter } = useWeek();

  const handleDetailsChange = useStructuredGoalDetailsSave(onSave, goal);

  const handleInitiativeChange = useCallback(
    async (initiativeId: Id<'initiatives'> | null) => {
      await onSave(goal.title, goal.details, goal.dueDate, goal.domainId ?? null, initiativeId);
    },
    [goal.title, goal.details, goal.dueDate, goal.domainId, onSave]
  );

  // Shared content for both popover and fullscreen modes
  const goalContent = (
    <FireGoalsProvider>
      <GoalBreadcrumb quarter={quarter} year={year} weekNumber={weekNumber} domain={domain} />
      <GoalHeader
        title={goal.title}
        isComplete={isComplete}
        onToggleComplete={onToggleComplete}
        statusControls={<GoalStatusIcons goalId={goal._id} />}
        actionMenu={<GoalActionMenuNew onSave={onSave} goalType={GoalType.Daily} />}
      />

      {domain && <GoalDomainDisplay domain={domain} weekNumber={weekNumber} />}

      <GoalCreatedDate createdAt={goal._creationTime} />
      {isComplete && goal.completedAt && <GoalCompletionDate completedAt={goal.completedAt} />}

      {goal.dueDate && <GoalDueDateDisplay dueDate={goal.dueDate} isComplete={isComplete} />}

      <GoalInitiativeField
        selectedInitiativeId={goal.initiativeId ?? null}
        onInitiativeChange={handleInitiativeChange}
        className="mt-3 space-y-2"
      />

      {/* Tabs for Details and Log */}
      {/* flex-1 min-h-0 ensures Tabs takes remaining height and can shrink for Log tab scrolling */}
      <Tabs defaultValue="details" className="mt-4 flex-1 min-h-0">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="details">Details</TabsTrigger>
          <TabsTrigger value="log">Log</TabsTrigger>
        </TabsList>

        {/* overflow-y-auto allows Details content to scroll if it overflows */}
        <TabsContent value="details" className="mt-4 overflow-y-auto">
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

        {/* flex flex-col passes height constraint to GoalLogTab for internal scrolling */}
        <TabsContent value="log" className="mt-4 flex flex-col">
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
