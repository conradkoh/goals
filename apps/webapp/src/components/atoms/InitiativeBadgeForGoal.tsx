'use client';

import type { Id } from '@workspace/backend/convex/_generated/dataModel';

import { InitiativeBadge } from '@/components/atoms/InitiativeBadge';
import { useInitiatives } from '@/hooks/useInitiatives';
import { useInitiativeTitleMap } from '@/hooks/useInitiativeTitleMap';
import { cn } from '@/lib/utils';
import { useSession } from '@/modules/auth/useSession';

interface InitiativeBadgeForGoalProps {
  initiativeId?: Id<'initiatives'> | null;
  isComplete?: boolean;
  className?: string;
}

/** Resolves initiative title and renders badge; null if no initiative or title. */
export function InitiativeBadgeForGoal({
  initiativeId,
  isComplete = false,
  className,
}: InitiativeBadgeForGoalProps) {
  const { sessionId } = useSession();
  const { initiatives } = useInitiatives(sessionId);
  const titleMap = useInitiativeTitleMap(initiatives);
  if (!initiativeId) return null;
  const title = titleMap.get(initiativeId);
  if (!title) return null;
  return (
    <InitiativeBadge
      title={title}
      className={cn('flex-shrink-0', isComplete && 'bg-muted text-muted-foreground', className)}
    />
  );
}
