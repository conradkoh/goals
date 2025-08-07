import React, { useCallback } from "react";
import { Flame } from "lucide-react";
import { Id } from "@services/backend/convex/_generated/dataModel";
import { cn } from "@/lib/utils";
import { useFireGoalStatus } from "@/contexts/GoalStatusContext";

/**
 * Props for the fire icon component.
 */
export interface FireIconProps {
  goalId: Id<"goals">;
  className?: string;
}

/**
 * Displays a clickable fire icon that toggles the urgent status of a goal.
 */
export const FireIcon: React.FC<FireIconProps> = ({ goalId, className }) => {
  const { isOnFire, toggleFireStatus } = useFireGoalStatus(goalId);

  /**
   * Handles click events on the fire icon to toggle goal fire status.
   */
  const _handleClick = useCallback(
    (event: React.MouseEvent<HTMLButtonElement>) => {
      event.stopPropagation();
      toggleFireStatus(goalId);
    },
    [goalId, toggleFireStatus]
  );

  return (
    <button
      onClick={_handleClick}
      className={cn(
        "text-muted-foreground opacity-0 group-hover/title:opacity-100 transition-opacity",
        isOnFire ? "text-red-500 opacity-100" : "hover:text-red-500",
        className
      )}
      title={isOnFire ? "Remove from urgent" : "Mark as urgent"}
    >
      <Flame className="h-3.5 w-3.5" />
    </button>
  );
};
