import { ChevronRight } from 'lucide-react';
import type { ReactNode } from 'react';

import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

/** One count inside a collapsed-state summary, e.g. 5 weekly goals. */
interface ChildCountPhrase {
  /** Number of child goals of this kind. */
  count: number;
  /** Noun used when count is exactly 1, e.g. "weekly goal". */
  singular: string;
  /** Noun used for any other count, e.g. "weekly goals". */
  plural: string;
}

function formatChildCount({ count, singular, plural }: ChildCountPhrase): string {
  return `${count} ${count === 1 ? singular : plural}`;
}

/**
 * Builds the collapsed-state summary: "5 weekly goals" or "5 weekly goals · 12 daily goals".
 * The secondary part is omitted when its count is 0.
 */
export function formatChildSummary(
  primary: ChildCountPhrase,
  secondary?: ChildCountPhrase
): string {
  const parts = [formatChildCount(primary)];
  if (secondary && secondary.count > 0) {
    parts.push(formatChildCount(secondary));
  }
  return parts.join(' · ');
}

interface GoalChildrenDisclosureProps {
  /** Section title on the left of the trigger bar, e.g. "Weekly Goals". */
  title: string;
  /** Summary on the right of the trigger bar, e.g. "5 weekly goals". Build it with formatChildSummary. */
  summary: string;
  /** The child list. Stays mounted while collapsed. */
  children: ReactNode;
}

/**
 * Collapsible child-goal section for goal details.
 * - Collapsed by default. State is local and resets when the dialog unmounts. Nothing is persisted.
 * - The panel is keepMounted, so children (and any in-progress edit inside them) survive a toggle.
 * - Adds no scroll container; the dialog content stays the only scroll region.
 */
export function GoalChildrenDisclosure({ title, summary, children }: GoalChildrenDisclosureProps) {
  return (
    <Collapsible data-slot="goal-children-disclosure">
      <CollapsibleTrigger className="group/children-trigger flex w-full items-center gap-2 rounded-md bg-muted px-4 py-1.5 text-left text-sm font-semibold text-foreground transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
        <ChevronRight className="size-4 shrink-0 text-muted-foreground transition-transform group-data-[panel-open]/children-trigger:rotate-90" />
        <span className="min-w-0 truncate">{title}</span>
        <span className="ml-auto min-w-0 truncate text-xs font-normal text-muted-foreground">
          {summary}
        </span>
      </CollapsibleTrigger>
      <CollapsibleContent keepMounted className="pt-3">
        {children}
      </CollapsibleContent>
    </Collapsible>
  );
}
