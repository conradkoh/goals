import type { ReactNode } from 'react';
import { Separator } from '@/components/ui/separator';

export interface GoalChildrenSectionProps {
  /** Section title (e.g., "Weekly Goals", "Daily Goals") */
  title: string;
  /** Children list component */
  childrenList?: ReactNode;
  /** Create input component */
  createInput?: ReactNode;
  /** Whether to show the separator above this section */
  showSeparator?: boolean;
}

/**
 * Composable section for displaying and creating child goals.
 * Used within goal detail popovers to show hierarchical goal structure.
 *
 * @example
 * ```tsx
 * <GoalChildrenSection
 *   title="Weekly Goals"
 *   childrenList={<GoalDetailsChildrenList parentGoal={goal} title="Weekly Goals" />}
 *   createInput={
 *     <CreateGoalInput
 *       placeholder="Add a new weekly goal..."
 *       value={newGoalTitle}
 *       onChange={setNewGoalTitle}
 *       onSubmit={handleCreate}
 *       onEscape={() => setNewGoalTitle('')}
 *     />
 *   }
 * />
 * ```
 */
export function GoalChildrenSection({
  title: _title,
  childrenList,
  createInput,
  showSeparator = true,
}: GoalChildrenSectionProps) {
  // Don't render if there's nothing to show
  if (!childrenList && !createInput) {
    return null;
  }

  return (
    <>
      {showSeparator && <Separator className="my-2" />}
      <div className="pt-1 space-y-3">
        {childrenList}
        {createInput && <div className="pl-4 pt-1">{createInput}</div>}
      </div>
    </>
  );
}
