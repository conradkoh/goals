'use client';

import type { Id } from '@workspace/backend/convex/_generated/dataModel';
import { DateTime } from 'luxon';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

import { CreateGoalInput } from '@/components/atoms/CreateGoalInput';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAdhocGoals } from '@/hooks/useAdhocGoals';
import { useWeek } from '@/hooks/useWeek';
import { DayOfWeek, getDayName } from '@/lib/constants';
import {
  formatInitiativeParentGoalLabel,
  getInitiativeCreateBlockedMessage,
  pickDefaultParentGoal,
  type GoalsByInitiative,
  type InitiativeGoalsTab,
} from '@/lib/initiative/initiative-details-goals';
import { resolveWeekNumberForParent } from '@/lib/initiative/resolve-week-number-for-parent';
import { useSession } from '@/modules/auth/useSession';

export interface InitiativeGoalTabCreateProps {
  tab: InitiativeGoalsTab;
  initiativeId: Id<'initiatives'>;
  goalsByType: GoalsByInitiative;
}

const placeholders: Record<InitiativeGoalsTab, string> = {
  quarterly: 'Add a quarterly goal…',
  weekly: 'Add a weekly goal…',
  daily: 'Add a daily goal…',
  adhoc: 'Add a task…',
};

/**
 * Inline goal creation for a tab in the initiative details dialog.
 *
 * MUST be rendered inside a `WeekProvider` (it relies on `useWeek` for the
 * focused year/quarter/weekNumber and the structured create mutations). The
 * initiative details dialog is only opened from `FocusedInitiativesSection`,
 * which lives inside the `WeekProvider` in `FocusModeFocusedView`.
 */
// fallow-ignore-next-line complexity
export function InitiativeGoalTabCreate({
  tab,
  initiativeId,
  goalsByType,
}: InitiativeGoalTabCreateProps) {
  const { year, quarter, weekNumber, createQuarterlyGoal, createWeeklyGoal, createDailyGoal } =
    useWeek();
  const { sessionId } = useSession();
  const { createAdhocGoal } = useAdhocGoals(sessionId);

  const [newGoalTitle, setNewGoalTitle] = useState('');
  const [selectedDayOfWeek, setSelectedDayOfWeek] = useState<DayOfWeek>(
    DateTime.local().weekday as DayOfWeek
  );

  const blockedMessage =
    tab === 'weekly' || tab === 'daily'
      ? getInitiativeCreateBlockedMessage(tab, goalsByType)
      : null;

  const parents =
    tab === 'weekly' ? goalsByType.quarterly : tab === 'daily' ? goalsByType.weekly : [];
  const defaultParent = pickDefaultParentGoal(parents, year, quarter);
  const [selectedParentId, setSelectedParentId] = useState<Id<'goals'> | null>(
    defaultParent?._id ?? null
  );

  useEffect(() => {
    const next = pickDefaultParentGoal(parents, year, quarter);
    setSelectedParentId(next?._id ?? null);
  }, [parents, year, quarter]);

  if (blockedMessage) {
    return (
      <div className="flex-shrink-0 border-t px-4 py-3 bg-background text-sm text-muted-foreground">
        {blockedMessage}
      </div>
    );
  }

  // fallow-ignore-next-line complexity
  const handleSubmit = async () => {
    const trimmed = newGoalTitle.trim();
    if (!trimmed) return;
    const previousTitle = newGoalTitle;
    try {
      if (tab === 'quarterly') {
        await createQuarterlyGoal({ title: trimmed, year, quarter, weekNumber, initiativeId });
      } else if (tab === 'weekly') {
        const parent = parents.find((g) => g._id === selectedParentId);
        if (!parent) return;
        await createWeeklyGoal({
          title: trimmed,
          parentId: parent._id,
          weekNumber: resolveWeekNumberForParent(parent, year, quarter, weekNumber),
          initiativeId,
        });
      } else if (tab === 'daily') {
        const parent = parents.find((g) => g._id === selectedParentId);
        if (!parent) return;
        await createDailyGoal({
          title: trimmed,
          parentId: parent._id,
          weekNumber: resolveWeekNumberForParent(parent, year, quarter, weekNumber),
          dayOfWeek: selectedDayOfWeek,
          initiativeId,
        });
      } else if (tab === 'adhoc') {
        await createAdhocGoal(
          trimmed,
          undefined,
          undefined,
          year,
          weekNumber,
          selectedDayOfWeek,
          undefined,
          undefined,
          initiativeId
        );
      }
      setNewGoalTitle('');
    } catch {
      setNewGoalTitle(previousTitle);
      toast.error('Failed to create goal', { description: 'Please try again.' });
    }
  };

  const hasParentSelect = tab === 'weekly' || tab === 'daily';

  return (
    <div className="flex-shrink-0 border-t px-4 py-2 bg-background">
      <CreateGoalInput
        placeholder={placeholders[tab]}
        value={newGoalTitle}
        onChange={setNewGoalTitle}
        onSubmit={handleSubmit}
        onEscape={() => setNewGoalTitle('')}
      >
        {hasParentSelect && (
          <div className="mt-2">
            <Select
              value={selectedParentId?.toString() ?? ''}
              onValueChange={(value) => value != null && setSelectedParentId(value as Id<'goals'>)}
            >
              <SelectTrigger className="h-9 text-xs">
                <SelectValue placeholder="Select parent goal" />
              </SelectTrigger>
              <SelectContent>
                {parents.map((goal) => (
                  <SelectItem key={goal._id} value={goal._id}>
                    {formatInitiativeParentGoalLabel(goal)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
        {tab === 'daily' && (
          <div className="mt-2">
            <Select
              value={selectedDayOfWeek.toString()}
              onValueChange={(value) =>
                value != null && setSelectedDayOfWeek(Number.parseInt(value) as DayOfWeek)
              }
            >
              <SelectTrigger className="h-9 text-xs">
                <SelectValue placeholder="Select day" />
              </SelectTrigger>
              <SelectContent>
                {Object.values(DayOfWeek).map((value) => (
                  <SelectItem key={value} value={value.toString()}>
                    {getDayName(value)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </CreateGoalInput>
    </div>
  );
}
