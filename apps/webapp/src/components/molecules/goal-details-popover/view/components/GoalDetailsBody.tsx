import type { Id } from '@workspace/backend/convex/_generated/dataModel';
import type { ReactNode } from 'react';

import { GoalDetailsSection } from './GoalDetailsSection';

import { GoalLogSection } from '@/components/molecules/goal-log';
import { isHTMLEmpty } from '@/components/ui/rich-text-editor';
import { Separator } from '@/components/ui/separator';

/**
 * Props for the shared goal details body.
 */
export interface GoalDetailsBodyProps {
  /** The goal whose details and log are shown. */
  goalId: Id<'goals'>;
  /** Goal title, passed to the details section. */
  title: string;
  /** HTML details content. */
  details: string;
  /** Saves details edits. Omit for read-only details. */
  onDetailsChange?: (html: string) => void;
  /** Surface-specific child section: GoalChildrenSection, AdhocSubGoalsList or the Daily additionalContent. Omit when none. */
  childrenSection?: ReactNode;
  /** Wire to useDialogEscapeHandler().handleNestedActiveChange. */
  onFormActiveChange?: (isActive: boolean) => void;
}

/**
 * Single-scroll goal details body: Details, optional child goals, then the Log section.
 * Shared by all goal details surfaces so their layout cannot drift.
 */
export function GoalDetailsBody({
  goalId,
  title,
  details,
  onDetailsChange,
  childrenSection,
  onFormActiveChange,
}: GoalDetailsBodyProps) {
  // GoalDetailsSection renders nothing when details are empty and not editable.
  const hasDetailsBlock = !isHTMLEmpty(details) || Boolean(onDetailsChange);
  return (
    <div data-slot="goal-details-body" className="mt-4 flex w-full min-w-0 shrink-0 flex-col">
      <GoalDetailsSection
        title={title}
        details={details}
        onDetailsChange={onDetailsChange}
        showSeparator={false}
      />
      {childrenSection && (
        <>
          {hasDetailsBlock && <Separator className="my-2" />}
          <div data-slot="goal-details-children" className="pt-1">
            {childrenSection}
          </div>
        </>
      )}
      <Separator className="my-2" />
      <GoalLogSection goalId={goalId} onFormActiveChange={onFormActiveChange} />
    </div>
  );
}
