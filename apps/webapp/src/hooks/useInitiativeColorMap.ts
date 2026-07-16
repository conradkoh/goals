import type { Doc, Id } from '@workspace/backend/convex/_generated/dataModel';
import { useMemo } from 'react';

import { buildInitiativeColorMap } from '@/lib/initiative/initiative-color';

export function useInitiativeColorMap(
  initiatives: Doc<'initiatives'>[]
): Map<Id<'initiatives'>, string> {
  return useMemo(() => buildInitiativeColorMap(initiatives), [initiatives]);
}
