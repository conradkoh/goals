import type { Id } from '@services/backend/convex/_generated/dataModel';
import { AlertCircle, CheckSquare, Square } from 'lucide-react';
import React from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
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
      onSelectionChange(goals.map((goal) => goal._id));
    }
  }, [goals, onSelectionChange]);

  const handleDeselectAll = React.useCallback(() => {
    onSelectionChange([]);
  }, [onSelectionChange]);

  const isAllSelected = React.useMemo(() => {
    return goals && goals.length > 0 && goals.every((goal) => selectedGoalIds.includes(goal._id));
  }, [goals, selectedGoalIds]);

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
        <h3 className="text-lg font-semibold text-gray-900">
          Select Goals ({selectedGoalIds.length} of {goals.length} selected)
        </h3>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleSelectAll}
            disabled={isAllSelected}
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

      {/* Goal selection list */}
      <div className="space-y-3 max-h-96 overflow-y-auto border rounded-lg p-4">
        {goals.map((goal) => {
          const isSelected = selectedGoalIds.includes(goal._id);
          return (
            <div
              key={goal._id}
              className="flex items-start space-x-3 p-2 rounded-lg hover:bg-gray-50"
            >
              <Checkbox
                checked={isSelected}
                onCheckedChange={(checked) => handleGoalToggle(goal._id, checked === true)}
                className="mt-0.5 flex-shrink-0"
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span
                    className={cn(
                      'font-medium',
                      goal.isComplete && 'line-through text-muted-foreground'
                    )}
                  >
                    {goal.title}
                  </span>
                  {goal.isComplete && (
                    <span className="text-xs text-green-600 bg-green-100 px-2 py-0.5 rounded-full">
                      Completed
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

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
