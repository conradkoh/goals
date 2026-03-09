'use client';

import type { Doc, Id } from '@workspace/backend/convex/_generated/dataModel';
import { useState } from 'react';

import { StandaloneGoalModal } from '../../variants/StandaloneGoalModal';

import { useGoalContext } from '@/contexts/GoalContext';

export interface GoalBreadcrumbProps {
  /** Optional domain for adhoc goals */
  domain?: Doc<'domains'> | null;
  /** Quarter number (1-4), for normal goals */
  quarter?: number;
  /** Year, for normal goals */
  year?: number;
  /** Week number, needed for opening ancestor modals */
  weekNumber?: number;
}

interface BreadcrumbSegment {
  label: string;
  type: 'quarter' | 'parent' | 'grandparent' | 'domain';
  goalId?: Id<'goals'>;
}

function buildBreadcrumbSegments(
  goal: {
    depth: number;
    parentId?: Id<'goals'>;
    parentTitle?: string;
    grandParentTitle?: string;
    grandParentId?: Id<'goals'>;
    adhoc?: { weekNumber?: number } | null;
    domainId?: string | null;
  },
  opts: {
    domain?: Doc<'domains'> | null;
    quarter?: number;
    year?: number;
  }
): BreadcrumbSegment[] {
  const segments: BreadcrumbSegment[] = [];
  const isAdhoc = !!goal.adhoc || !!goal.domainId;

  if (isAdhoc) {
    if (opts.domain) {
      segments.push({ label: opts.domain.name, type: 'domain' });
    }
    if (goal.parentTitle) {
      segments.push({ label: goal.parentTitle, type: 'parent', goalId: goal.parentId });
    }
  } else {
    if (opts.quarter !== undefined && opts.year !== undefined) {
      segments.push({
        label: `Q${opts.quarter} ${opts.year}`,
        type: 'quarter',
      });
    }

    if (goal.depth === 1 && goal.parentTitle) {
      segments.push({ label: goal.parentTitle, type: 'parent', goalId: goal.parentId });
    }

    if (goal.depth === 2) {
      if (goal.grandParentTitle) {
        segments.push({
          label: goal.grandParentTitle,
          type: 'grandparent',
          goalId: goal.grandParentId,
        });
      }
      if (goal.parentTitle) {
        segments.push({ label: goal.parentTitle, type: 'parent', goalId: goal.parentId });
      }
    }
  }

  return segments;
}

const SEPARATOR = '›';

/**
 * Compact breadcrumb showing hierarchy context above goal titles.
 * Renders path segments like: Q2 2026 › Quarterly Goal › Weekly Goal
 * or for adhoc: Domain › Parent Goal
 *
 * Goal segments (parent/grandparent) are clickable and open a StandaloneGoalModal.
 */
export function GoalBreadcrumb({ domain, quarter, year, weekNumber }: GoalBreadcrumbProps) {
  const { goal } = useGoalContext();
  const segments = buildBreadcrumbSegments(goal, { domain, quarter, year });
  const [selectedGoalId, setSelectedGoalId] = useState<Id<'goals'> | null>(null);

  if (segments.length === 0) {
    return null;
  }

  return (
    <>
      <nav aria-label="Goal hierarchy" className="flex items-center gap-1 flex-wrap min-w-0 mb-1">
        {segments.map((segment, index) => (
          <span key={`${segment.type}-${index}`} className="flex items-center gap-1 min-w-0">
            {index > 0 && (
              <span className="text-[10px] text-muted-foreground/50 flex-shrink-0" aria-hidden>
                {SEPARATOR}
              </span>
            )}
            {segment.goalId ? (
              <button
                type="button"
                onClick={() => setSelectedGoalId(segment.goalId!)}
                className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground truncate hover:text-foreground transition-colors cursor-pointer"
              >
                {segment.label}
              </button>
            ) : (
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground truncate">
                {segment.label}
              </span>
            )}
          </span>
        ))}
      </nav>

      <StandaloneGoalModal
        open={!!selectedGoalId}
        onOpenChange={(open) => !open && setSelectedGoalId(null)}
        goalId={selectedGoalId}
        goalCategory="standard"
        year={year ?? goal.year}
        quarter={quarter ?? goal.quarter}
        weekNumber={weekNumber}
      />
    </>
  );
}
