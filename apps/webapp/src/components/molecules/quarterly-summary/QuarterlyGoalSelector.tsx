import type { Id } from '@workspace/backend/convex/_generated/dataModel';
import type { QuarterlyGoalOption } from '@workspace/backend/src/usecase/getWeekDetails';
import { AlertCircle, Check, CheckSquare, ChevronDown, ChevronRight, Square } from 'lucide-react';
import React from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Skeleton } from '@/components/ui/skeleton';
import { useQuarterlyGoalsList } from '@/hooks/useQuarterlyGoalsList';
import { cn } from '@/lib/utils';

interface QuarterlyGoalSelectorProps {
  year: number;
  quarter: number;
  selectedGoalIds: Id<'goals'>[];
  onSelectionChange: (ids: Id<'goals'>[]) => void;
  className?: string;
  onGenerateSummary?: () => void;
  showGenerateButton: boolean;
}

function QuarterlyGoalSelectorSkeleton() {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-8 w-24" />
      </div>
      {Array.from({ length: 3 }).map((_, i) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: Static skeleton loading items don't need unique keys
        <div key={i} className="flex items-center space-x-3">
          <Skeleton className="h-4 w-4" />
          <Skeleton className="h-4 w-full" />
        </div>
      ))}
    </div>
  );
}

interface GoalItemProps {
  goal: QuarterlyGoalOption;
  isSelected: boolean;
  onToggle: (goalId: Id<'goals'>, checked: boolean) => void;
}

function GoalItem({ goal, isSelected, onToggle }: GoalItemProps) {
  const hasWeeklyGoals = goal.weeklyGoalCount > 0;
  const allWeeklyComplete =
    hasWeeklyGoals && goal.completedWeeklyGoalCount === goal.weeklyGoalCount;

  return (
    <div
      className={cn(
        'flex items-start space-x-3 p-3 rounded-lg transition-colors',
        'hover:bg-accent/50 dark:hover:bg-accent/30',
        isSelected && 'bg-accent/30 dark:bg-accent/20'
      )}
    >
      <Checkbox
        checked={isSelected}
        onCheckedChange={(checked) => onToggle(goal._id, checked === true)}
        className="mt-0.5 flex-shrink-0"
      />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span
            className={cn(
              'font-medium text-foreground',
              goal.isComplete && 'line-through text-muted-foreground'
            )}
          >
            {goal.title}
          </span>
          {/* Weekly goal count badge */}
          <span
            className={cn(
              'text-xs px-2 py-0.5 rounded-full',
              hasWeeklyGoals
                ? allWeeklyComplete
                  ? 'bg-green-100 text-green-700 dark:bg-green-950/50 dark:text-green-400'
                  : 'bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-400'
                : 'bg-muted text-muted-foreground'
            )}
          >
            {goal.completedWeeklyGoalCount}/{goal.weeklyGoalCount} weekly goals
          </span>
          {/* Quarterly goal completion status */}
          {goal.isComplete && (
            <span className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-950/50 px-2 py-0.5 rounded-full">
              <Check className="h-3 w-3" />
              Completed
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

export function QuarterlyGoalSelector({
  year,
  quarter,
  selectedGoalIds,
  onSelectionChange,
  className,
  onGenerateSummary,
  showGenerateButton,
}: QuarterlyGoalSelectorProps) {
  const { goals, isLoading, error } = useQuarterlyGoalsList({ year, quarter });
  const [isEmptyGoalsOpen, setIsEmptyGoalsOpen] = React.useState(false);
  const hasInitializedSelection = React.useRef(false);

  // Separate goals into those with weekly goals and those without
  const { goalsWithWeekly, emptyGoals } = React.useMemo(() => {
    if (!goals) return { goalsWithWeekly: [], emptyGoals: [] };
    return {
      goalsWithWeekly: goals.filter((g) => g.weeklyGoalCount > 0),
      emptyGoals: goals.filter((g) => g.weeklyGoalCount === 0),
    };
  }, [goals]);

  // Auto-select non-empty goals on initial load
  React.useEffect(() => {
    if (goals && !hasInitializedSelection.current && selectedGoalIds.length === 0) {
      hasInitializedSelection.current = true;
      // Select all goals that have at least one weekly goal
      const nonEmptyGoalIds = goals.filter((g) => g.weeklyGoalCount > 0).map((g) => g._id);
      if (nonEmptyGoalIds.length > 0) {
        onSelectionChange(nonEmptyGoalIds);
      }
    }
  }, [goals, selectedGoalIds.length, onSelectionChange]);

  const handleGoalToggle = React.useCallback(
    (goalId: Id<'goals'>, checked: boolean) => {
      if (checked) {
        onSelectionChange([...selectedGoalIds, goalId]);
      } else {
        onSelectionChange(selectedGoalIds.filter((id) => id !== goalId));
      }
    },
    [selectedGoalIds, onSelectionChange]
  );

  const handleSelectAll = React.useCallback(() => {
    if (goals) {
      // Select all non-empty goals only
      const nonEmptyGoalIds = goals.filter((g) => g.weeklyGoalCount > 0).map((g) => g._id);
      onSelectionChange(nonEmptyGoalIds);
    }
  }, [goals, onSelectionChange]);

  const handleDeselectAll = React.useCallback(() => {
    onSelectionChange([]);
  }, [onSelectionChange]);

  const isAllNonEmptySelected = React.useMemo(() => {
    return (
      goalsWithWeekly.length > 0 &&
      goalsWithWeekly.every((goal) => selectedGoalIds.includes(goal._id))
    );
  }, [goalsWithWeekly, selectedGoalIds]);

  const isNoneSelected = React.useMemo(() => {
    return selectedGoalIds.length === 0;
  }, [selectedGoalIds]);

  if (isLoading) {
    return (
      <div className={className}>
        <QuarterlyGoalSelectorSkeleton />
      </div>
    );
  }

  if (error || !goals) {
    return (
      <div className={className}>
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error || 'Failed to load quarterly goals'}</AlertDescription>
        </Alert>
      </div>
    );
  }

  if (goals.length === 0) {
    return (
      <div className={className}>
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            No quarterly goals found for Q{quarter} {year}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className={cn('space-y-4', className)}>
      {/* Header with select all/none buttons */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-foreground">
          Select Goals ({selectedGoalIds.length} of {goals.length} selected)
        </h3>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleSelectAll}
            disabled={isAllNonEmptySelected}
            className="flex items-center gap-1"
          >
            <CheckSquare className="h-4 w-4" />
            Select All
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleDeselectAll}
            disabled={isNoneSelected}
            className="flex items-center gap-1"
          >
            <Square className="h-4 w-4" />
            Deselect All
          </Button>
        </div>
      </div>

      {/* Goals with weekly goals */}
      {goalsWithWeekly.length > 0 && (
        <div className="space-y-2 max-h-72 overflow-y-auto border rounded-lg p-3 bg-card">
          {goalsWithWeekly.map((goal) => (
            <GoalItem
              key={goal._id}
              goal={goal}
              isSelected={selectedGoalIds.includes(goal._id)}
              onToggle={handleGoalToggle}
            />
          ))}
        </div>
      )}

      {/* Empty goals in collapsed section */}
      {emptyGoals.length > 0 && (
        <Collapsible open={isEmptyGoalsOpen} onOpenChange={setIsEmptyGoalsOpen}>
          <CollapsibleTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-between text-muted-foreground hover:text-foreground"
            >
              <span className="flex items-center gap-2">
                {isEmptyGoalsOpen ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
                Empty Goals ({emptyGoals.length})
              </span>
              <span className="text-xs">No weekly goals assigned</span>
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="space-y-2 border rounded-lg p-3 mt-2 bg-muted/30">
              {emptyGoals.map((goal) => (
                <GoalItem
                  key={goal._id}
                  goal={goal}
                  isSelected={selectedGoalIds.includes(goal._id)}
                  onToggle={handleGoalToggle}
                />
              ))}
            </div>
          </CollapsibleContent>
        </Collapsible>
      )}

      {/* Selection summary and generate button */}
      {selectedGoalIds.length > 0 && (
        <div className="flex items-center justify-between pt-4 border-t">
          <div className="text-sm text-muted-foreground">
            {selectedGoalIds.length} goal{selectedGoalIds.length === 1 ? '' : 's'} selected for
            summary
          </div>
          {showGenerateButton && onGenerateSummary && (
            <Button onClick={onGenerateSummary} className="ml-4">
              Generate Summary
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
