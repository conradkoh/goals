import type { Doc, Id } from '@workspace/backend/convex/_generated/dataModel';
import { useMemo } from 'react';

export function useInitiativeTitleMap(
  initiatives: Doc<'initiatives'>[]
): Map<Id<'initiatives'>, string> {
  return useMemo(() => {
    return new Map(initiatives.map((i) => [i._id, i.title]));
  }, [initiatives]);
}
