'use client';

import type { Id } from '@workspace/backend/convex/_generated/dataModel';

import { InitiativeBadge } from '@/components/atoms/InitiativeBadge';
import { useInitiatives } from '@/hooks/useInitiatives';
import { useInitiativeColorMap } from '@/hooks/useInitiativeColorMap';
import { useInitiativeTitleMap } from '@/hooks/useInitiativeTitleMap';
import { getInitiativeColorFromMap } from '@/lib/initiative/initiative-color';
import { cn } from '@/lib/utils';
import { useSession } from '@/modules/auth/useSession';

interface InitiativeBadgeForGoalProps {
  initiativeId?: Id<'initiatives'> | null;
  isComplete?: boolean;
  className?: string;
}

/** Resolves initiative title and color, then renders badge; null if no initiative or title. */
export function InitiativeBadgeForGoal({
  initiativeId,
  isComplete = false,
  className,
}: InitiativeBadgeForGoalProps) {
  const { sessionId } = useSession();
  const { initiatives } = useInitiatives(sessionId);
  const titleMap = useInitiativeTitleMap(initiatives);
  const colorMap = useInitiativeColorMap(initiatives);
  if (!initiativeId) return null;
  const title = titleMap.get(initiativeId);
  if (!title) return null;
  const color = getInitiativeColorFromMap(initiativeId, colorMap);
  return (
    <InitiativeBadge
      title={title}
      color={color}
      muted={isComplete}
      className={cn('flex-shrink-0', className)}
    />
  );
}
