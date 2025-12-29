/**
 * Quarter Goal Move Preview
 *
 * Provides a dialog for previewing and selecting goals to move from
 * a previous quarter to the current quarter. Users can select which
 * quarterly goals and adhoc tasks to pull, and view/edit goals before moving.
 *
 * @module
 */

import type { Id } from '@workspace/backend/convex/_generated/dataModel';
import {
  ArrowRightLeft,
  Calendar,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  History,
  Loader2,
  Pin,
  Star,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import type {
  AdhocGoalToCopy,
  DailyGoalToCopy,
  QuarterlyGoalToCopy,
  WeeklyGoalToCopy,
} from '@/hooks/useMoveGoalsForQuarter';
import { cn } from '@/lib/utils';

/**
 * Props for the QuarterGoalMovePreview component.
 *
 * @public
 */
export interface QuarterGoalMovePreviewProps {
  /** Whether the dialog is open */
  open: boolean;
  /** Callback fired when the dialog open state changes */
  onOpenChange: (open: boolean) => void;
  /** Preview data containing goals to potentially move */
  preview: {
    quarterlyGoals: QuarterlyGoalToCopy[];
    weeklyGoals: WeeklyGoalToCopy[];
    dailyGoals: DailyGoalToCopy[];
    adhocGoals?: AdhocGoalToCopy[];
  } | null;
  /** Callback fired when user confirms the move */
  onConfirm: (
    selectedQuarterlyGoalIds?: Id<'goals'>[],
    selectedAdhocGoalIds?: Id<'goals'>[]
  ) => void;
  /** Whether the move operation is in progress */
  isConfirming?: boolean;
  /** Year of the source quarter */
  sourceYear?: number;
  /** Quarter number of the source quarter */
  sourceQuarter?: number;
  /** Whether preview data is loading */
  isLoading?: boolean;
}

/**
 * Adhoc goals grouped by their associated domain.
 *
 * @internal
 */
interface AdhocGoalsByDomain {
  /** Domain ID or null for uncategorized */
  domainId: string | null;
  /** Display name of the domain */
  domainName: string;
  /** Goals within this domain */
  goals: AdhocGoalToCopy[];
}

/**
 * Dialog for previewing and selecting goals to move from a previous quarter.
 * Allows users to:
 * - Select which quarterly goals to pull
 * - Select which adhoc tasks to pull (grouped by domain)
 * - Navigate to the previous quarter to view goals in their full context
 *
 * @public
 * @param props - Component props
 * @returns Rendered dialog component
 */
export function QuarterGoalMovePreview({
  open,
  onOpenChange,
  preview,
  onConfirm,
  isConfirming = false,
  sourceYear,
  sourceQuarter,
  isLoading = false,
}: QuarterGoalMovePreviewProps) {
  const [selectedQuarterlyIds, setSelectedQuarterlyIds] = useState<Set<string>>(new Set());
  const [selectedAdhocIds, setSelectedAdhocIds] = useState<Set<string>>(new Set());
  const [collapsedDomains, setCollapsedDomains] = useState<Set<string>>(new Set());
  const [hasInitializedSelections, setHasInitializedSelections] = useState(false);

  const hasQuarterlyGoals = Boolean(preview?.quarterlyGoals && preview.quarterlyGoals.length > 0);
  const hasWeeklyGoals = Boolean(preview?.weeklyGoals && preview.weeklyGoals.length > 0);
  const hasDailyGoals = Boolean(preview?.dailyGoals && preview.dailyGoals.length > 0);
  const hasAdhocGoals = Boolean(preview?.adhocGoals && preview.adhocGoals.length > 0);
  const hasContent = hasQuarterlyGoals || hasWeeklyGoals || hasDailyGoals || hasAdhocGoals;

  // Initialize selection when preview first loads, or update to remove stale selections
  useEffect(() => {
    if (preview) {
      const availableQuarterlyIds = new Set(preview.quarterlyGoals.map((g) => g.id.toString()));
      const availableAdhocIds = new Set((preview.adhocGoals ?? []).map((g) => g.id.toString()));

      if (!hasInitializedSelections) {
        // First time loading - select all by default
        setSelectedQuarterlyIds(availableQuarterlyIds);
        setSelectedAdhocIds(availableAdhocIds);
        setHasInitializedSelections(true);
      } else {
        // Subsequent updates - remove selections for goals that no longer exist
        setSelectedQuarterlyIds((prev) => {
          const next = new Set<string>();
          for (const id of prev) {
            if (availableQuarterlyIds.has(id)) {
              next.add(id);
            }
          }
          return next;
        });
        setSelectedAdhocIds((prev) => {
          const next = new Set<string>();
          for (const id of prev) {
            if (availableAdhocIds.has(id)) {
              next.add(id);
            }
          }
          return next;
        });
      }
    }
  }, [preview, hasInitializedSelections]);

  // Reset initialization state when dialog closes
  useEffect(() => {
    if (!open) {
      setHasInitializedSelections(false);
    }
  }, [open]);

  const adhocGoalsByDomain = useMemo((): AdhocGoalsByDomain[] => {
    if (!preview?.adhocGoals) return [];

    const grouped = new Map<string | null, AdhocGoalToCopy[]>();

    for (const goal of preview.adhocGoals) {
      const key = goal.domainId?.toString() ?? null;
      if (!grouped.has(key)) {
        grouped.set(key, []);
      }
      grouped.get(key)!.push(goal);
    }

    const result: AdhocGoalsByDomain[] = [];
    for (const [domainId, goals] of grouped.entries()) {
      result.push({
        domainId,
        domainName: goals[0]?.domainName ?? 'Uncategorized',
        goals,
      });
    }

    return result.sort((a, b) => {
      if (a.domainId === null) return 1;
      if (b.domainId === null) return -1;
      return a.domainName.localeCompare(b.domainName);
    });
  }, [preview?.adhocGoals]);

  const activeQuarterlyGoals = useMemo(() => {
    if (!preview?.quarterlyGoals) return [];
    return preview.quarterlyGoals;
  }, [preview?.quarterlyGoals]);

  const handleQuarterlyToggle = useCallback((goalId: string, checked: boolean) => {
    setSelectedQuarterlyIds((prev) => {
      const next = new Set(prev);
      if (checked) {
        next.add(goalId);
      } else {
        next.delete(goalId);
      }
      return next;
    });
  }, []);

  const handleAdhocToggle = useCallback((goalId: string, checked: boolean) => {
    setSelectedAdhocIds((prev) => {
      const next = new Set(prev);
      if (checked) {
        next.add(goalId);
      } else {
        next.delete(goalId);
      }
      return next;
    });
  }, []);

  const handleDomainGroupToggle = useCallback(
    (_domainId: string | null, goals: AdhocGoalToCopy[], checked: boolean) => {
      setSelectedAdhocIds((prev) => {
        const next = new Set(prev);
        for (const goal of goals) {
          if (checked) {
            next.add(goal.id.toString());
          } else {
            next.delete(goal.id.toString());
          }
        }
        return next;
      });
    },
    []
  );

  const handleSelectAllQuarterly = useCallback(
    (checked: boolean) => {
      if (checked) {
        setSelectedQuarterlyIds(new Set(activeQuarterlyGoals.map((g) => g.id.toString())));
      } else {
        setSelectedQuarterlyIds(new Set());
      }
    },
    [activeQuarterlyGoals]
  );

  const handleSelectAllAdhoc = useCallback(
    (checked: boolean) => {
      const allAdhocIds = adhocGoalsByDomain.flatMap((d) => d.goals.map((g) => g.id.toString()));
      if (checked) {
        setSelectedAdhocIds(new Set(allAdhocIds));
      } else {
        setSelectedAdhocIds(new Set());
      }
    },
    [adhocGoalsByDomain]
  );

  const toggleDomainCollapse = useCallback((domainKey: string) => {
    setCollapsedDomains((prev) => {
      const next = new Set(prev);
      if (next.has(domainKey)) {
        next.delete(domainKey);
      } else {
        next.add(domainKey);
      }
      return next;
    });
  }, []);

  /**
   * Opens the goal's dedicated page in a new tab with the source quarter context.
   * Allows the user to see all details and interact with the goal
   * without leaving the current dialog.
   */
  const handleViewGoal = useCallback(
    (goalId: Id<'goals'>, _type: 'quarterly' | 'adhoc') => {
      if (sourceYear === undefined || sourceQuarter === undefined) return;

      // Build the URL for the quarterly pull preview page
      // This shows only goals from the last non-empty week
      const params = new URLSearchParams();
      params.set('year', sourceYear.toString());
      params.set('quarter', sourceQuarter.toString());

      // Open in a new tab
      window.open(`/app/quarterly-pull-preview/goals/${goalId}?${params.toString()}`, '_blank');
    },
    [sourceYear, sourceQuarter]
  );

  const handleConfirm = useCallback(() => {
    const selectedQuarterly = Array.from(selectedQuarterlyIds).map((id) => id as Id<'goals'>);
    const selectedAdhoc = Array.from(selectedAdhocIds).map((id) => id as Id<'goals'>);
    onConfirm(selectedQuarterly, selectedAdhoc);
  }, [selectedQuarterlyIds, selectedAdhocIds, onConfirm]);

  const hasSelection = selectedQuarterlyIds.size > 0 || selectedAdhocIds.size > 0;

  const allQuarterlySelected =
    activeQuarterlyGoals.length > 0 &&
    activeQuarterlyGoals.every((g) => selectedQuarterlyIds.has(g.id.toString()));
  const someQuarterlySelected =
    activeQuarterlyGoals.some((g) => selectedQuarterlyIds.has(g.id.toString())) &&
    !allQuarterlySelected;

  const totalAdhocGoals = adhocGoalsByDomain.reduce((sum, d) => sum + d.goals.length, 0);
  const allAdhocSelected =
    totalAdhocGoals > 0 &&
    adhocGoalsByDomain.every((d) => d.goals.every((g) => selectedAdhocIds.has(g.id.toString())));
  const someAdhocSelected =
    adhocGoalsByDomain.some((d) => d.goals.some((g) => selectedAdhocIds.has(g.id.toString()))) &&
    !allAdhocSelected;

  // Show loading state while preview data is being fetched
  if (isLoading) {
    return (
      <AlertDialog open={open} onOpenChange={onOpenChange}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Pull Goals from Previous Quarter</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="flex flex-col items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground mb-4" />
                <span className="text-muted-foreground">
                  Loading goals from previous quarter...
                </span>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    );
  }

  if (!hasContent) {
    return (
      <AlertDialog open={open} onOpenChange={onOpenChange}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Pull Goals from Previous Quarter</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-4">
                <span className="block">
                  There are no incomplete goals from the previous quarter to move to this quarter.
                </span>
                <div className="text-center py-8 text-muted-foreground">
                  <History className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <span className="block">All goals from the previous quarter are complete!</span>
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Close</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    );
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <AlertDialogHeader>
          <AlertDialogTitle>Pull Goals from Previous Quarter</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-6">
              <ExplanationSection hasAdhocGoals={hasAdhocGoals} />
              <InstructionsSection />
              <QuarterlyGoalsSection
                goals={activeQuarterlyGoals}
                selectedIds={selectedQuarterlyIds}
                allSelected={allQuarterlySelected}
                someSelected={someQuarterlySelected}
                onToggle={handleQuarterlyToggle}
                onSelectAll={handleSelectAllQuarterly}
                onViewGoal={handleViewGoal}
              />
              <AdhocGoalsSection
                goalsByDomain={adhocGoalsByDomain}
                selectedIds={selectedAdhocIds}
                collapsedDomains={collapsedDomains}
                totalGoals={totalAdhocGoals}
                allSelected={allAdhocSelected}
                someSelected={someAdhocSelected}
                onToggle={handleAdhocToggle}
                onSelectAll={handleSelectAllAdhoc}
                onDomainToggle={handleDomainGroupToggle}
                onCollapseToggle={toggleDomainCollapse}
                onViewGoal={handleViewGoal}
              />
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>

        <AlertDialogFooter className="gap-2 sm:gap-0">
          <AlertDialogCancel disabled={isConfirming}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            disabled={!hasSelection || isConfirming}
            className="min-w-[140px]"
          >
            {isConfirming ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Moving...
              </>
            ) : (
              `Pull ${selectedQuarterlyIds.size + selectedAdhocIds.size} Goals`
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

/**
 * Props for the ExplanationSection component.
 *
 * @internal
 */
interface ExplanationSectionProps {
  /** Whether there are adhoc goals to display */
  hasAdhocGoals: boolean;
}

/**
 * Renders the explanation of what the move operation will do.
 *
 * @internal
 */
function ExplanationSection({ hasAdhocGoals }: ExplanationSectionProps) {
  return (
    <div className="space-y-2">
      <h3 className="font-semibold text-sm">What will happen:</h3>
      <div className="space-y-3">
        <div className="flex items-start gap-2">
          <ArrowRightLeft className="h-4 w-4 mt-0.5 text-muted-foreground" />
          <p className="text-sm">
            All hierarchies and relationships between goals will be preserved
          </p>
        </div>
        <div className="flex items-start gap-2">
          <div className="h-5 w-5 flex-shrink-0 mt-0.5">
            <Star className="h-4 w-4 text-yellow-500" />
          </div>
          <p className="text-sm text-muted-foreground">
            <span className="font-medium text-foreground">Quarterly Goals</span> that are incomplete
            will be copied to this quarter with their pinned and starred status
          </p>
        </div>
        {hasAdhocGoals && (
          <div className="flex items-start gap-2">
            <div className="h-5 w-5 flex-shrink-0 mt-0.5">
              <Calendar className="h-4 w-4 text-purple-500" />
            </div>
            <p className="text-sm text-muted-foreground">
              <span className="font-medium text-foreground">Adhoc Tasks</span> that are incomplete
              will be moved to the first week of this quarter
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Renders the instructions section.
 *
 * @internal
 */
function InstructionsSection() {
  return (
    <div className="bg-muted/50 dark:bg-muted/30 rounded-lg p-3">
      <p className="text-sm text-muted-foreground">
        <span className="font-medium text-foreground">Select goals to pull:</span> Check the goals
        you want to move to this quarter. Click &quot;View&quot; to open the previous quarter and
        see the goal in its full context.
      </p>
    </div>
  );
}

/**
 * Props for the QuarterlyGoalsSection component.
 *
 * @internal
 */
interface QuarterlyGoalsSectionProps {
  /** List of quarterly goals to display */
  goals: QuarterlyGoalToCopy[];
  /** Set of selected goal IDs */
  selectedIds: Set<string>;
  /** Whether all goals are selected */
  allSelected: boolean;
  /** Whether some but not all goals are selected */
  someSelected: boolean;
  /** Handler for toggling individual goal selection */
  onToggle: (goalId: string, checked: boolean) => void;
  /** Handler for selecting/deselecting all goals */
  onSelectAll: (checked: boolean) => void;
  /** Handler for viewing goal details */
  onViewGoal: (goalId: Id<'goals'>, type: 'quarterly' | 'adhoc') => void;
}

/**
 * Renders the quarterly goals selection section.
 *
 * @internal
 */
function QuarterlyGoalsSection({
  goals,
  selectedIds,
  allSelected,
  someSelected,
  onToggle,
  onSelectAll,
  onViewGoal,
}: QuarterlyGoalsSectionProps) {
  if (goals.length === 0) return null;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="font-semibold text-sm flex items-center gap-2">
          <Star className="h-4 w-4 text-yellow-500" />
          Quarterly Goals
          <span className="text-muted-foreground font-normal">
            ({selectedIds.size}/{goals.length} selected)
          </span>
        </h4>
        <div className="flex items-center gap-2">
          <Checkbox
            checked={allSelected}
            onCheckedChange={onSelectAll}
            className={cn(someSelected && 'data-[state=checked]:bg-primary/50')}
          />
          <span className="text-xs text-muted-foreground">Select all</span>
        </div>
      </div>

      <div className="space-y-2">
        {goals.map((goal) => {
          const isSelected = selectedIds.has(goal.id.toString());
          return (
            <div
              key={goal.id.toString()}
              className={cn(
                'flex items-start gap-3 p-3 rounded-lg border transition-colors',
                isSelected
                  ? 'bg-primary/5 dark:bg-primary/10 border-primary/20'
                  : 'bg-muted/30 dark:bg-muted/20 border-transparent hover:border-border'
              )}
            >
              <Checkbox
                checked={isSelected}
                onCheckedChange={(checked) => onToggle(goal.id.toString(), checked === true)}
                className="mt-0.5"
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  {goal.isStarred && (
                    <Star className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400 flex-shrink-0" />
                  )}
                  {goal.isPinned && (
                    <Pin className="h-3.5 w-3.5 fill-blue-400 text-blue-400 flex-shrink-0" />
                  )}
                  <span className="font-medium text-foreground break-words">{goal.title}</span>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="flex-shrink-0 h-7 px-2 text-xs"
                onClick={() => onViewGoal(goal.id, 'quarterly')}
              >
                <ExternalLink className="h-3 w-3 mr-1" />
                View
              </Button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/**
 * Props for the AdhocGoalsSection component.
 *
 * @internal
 */
interface AdhocGoalsSectionProps {
  /** Goals grouped by domain */
  goalsByDomain: AdhocGoalsByDomain[];
  /** Set of selected goal IDs */
  selectedIds: Set<string>;
  /** Set of collapsed domain keys */
  collapsedDomains: Set<string>;
  /** Total number of adhoc goals */
  totalGoals: number;
  /** Whether all goals are selected */
  allSelected: boolean;
  /** Whether some but not all goals are selected */
  someSelected: boolean;
  /** Handler for toggling individual goal selection */
  onToggle: (goalId: string, checked: boolean) => void;
  /** Handler for selecting/deselecting all goals */
  onSelectAll: (checked: boolean) => void;
  /** Handler for toggling all goals in a domain */
  onDomainToggle: (domainId: string | null, goals: AdhocGoalToCopy[], checked: boolean) => void;
  /** Handler for collapsing/expanding a domain */
  onCollapseToggle: (domainKey: string) => void;
  /** Handler for viewing goal details */
  onViewGoal: (goalId: Id<'goals'>, type: 'quarterly' | 'adhoc') => void;
}

/**
 * Renders the adhoc goals selection section grouped by domain.
 *
 * @internal
 */
function AdhocGoalsSection({
  goalsByDomain,
  selectedIds,
  collapsedDomains,
  totalGoals,
  allSelected,
  someSelected,
  onToggle,
  onSelectAll,
  onDomainToggle,
  onCollapseToggle,
  onViewGoal,
}: AdhocGoalsSectionProps) {
  if (goalsByDomain.length === 0) return null;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="font-semibold text-sm flex items-center gap-2">
          <Calendar className="h-4 w-4 text-purple-500" />
          Adhoc Tasks
          <span className="text-muted-foreground font-normal">
            ({selectedIds.size}/{totalGoals} selected)
          </span>
        </h4>
        <div className="flex items-center gap-2">
          <Checkbox
            checked={allSelected}
            onCheckedChange={onSelectAll}
            className={cn(someSelected && 'data-[state=checked]:bg-primary/50')}
          />
          <span className="text-xs text-muted-foreground">Select all</span>
        </div>
      </div>

      <div className="space-y-3">
        {goalsByDomain.map((domainGroup) => (
          <DomainGoalsGroup
            key={domainGroup.domainId ?? 'uncategorized'}
            domainGroup={domainGroup}
            selectedIds={selectedIds}
            isCollapsed={collapsedDomains.has(domainGroup.domainId ?? 'uncategorized')}
            onToggle={onToggle}
            onDomainToggle={onDomainToggle}
            onCollapseToggle={onCollapseToggle}
            onViewGoal={onViewGoal}
          />
        ))}
      </div>
    </div>
  );
}

/**
 * Props for the DomainGoalsGroup component.
 *
 * @internal
 */
interface DomainGoalsGroupProps {
  /** Domain group data */
  domainGroup: AdhocGoalsByDomain;
  /** Set of selected goal IDs */
  selectedIds: Set<string>;
  /** Whether this domain is collapsed */
  isCollapsed: boolean;
  /** Handler for toggling individual goal selection */
  onToggle: (goalId: string, checked: boolean) => void;
  /** Handler for toggling all goals in the domain */
  onDomainToggle: (domainId: string | null, goals: AdhocGoalToCopy[], checked: boolean) => void;
  /** Handler for collapsing/expanding the domain */
  onCollapseToggle: (domainKey: string) => void;
  /** Handler for viewing goal details */
  onViewGoal: (goalId: Id<'goals'>, type: 'quarterly' | 'adhoc') => void;
}

/**
 * Renders a single domain group with its goals.
 *
 * @internal
 */
function DomainGoalsGroup({
  domainGroup,
  selectedIds,
  isCollapsed,
  onToggle,
  onDomainToggle,
  onCollapseToggle,
  onViewGoal,
}: DomainGoalsGroupProps) {
  const domainKey = domainGroup.domainId ?? 'uncategorized';
  const allInDomainSelected = domainGroup.goals.every((g) => selectedIds.has(g.id.toString()));
  const someInDomainSelected =
    domainGroup.goals.some((g) => selectedIds.has(g.id.toString())) && !allInDomainSelected;

  return (
    <div className="border rounded-lg overflow-hidden dark:border-border/50">
      <div
        className={cn(
          'flex items-center gap-2 px-3 py-2 cursor-pointer',
          domainGroup.domainId === null
            ? 'bg-muted/50 dark:bg-muted/30'
            : 'bg-purple-50 dark:bg-purple-950/20'
        )}
        onClick={() => onCollapseToggle(domainKey)}
      >
        <Button
          variant="ghost"
          size="sm"
          className="h-5 w-5 p-0"
          onClick={(e) => {
            e.stopPropagation();
            onCollapseToggle(domainKey);
          }}
        >
          {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </Button>
        <Checkbox
          checked={allInDomainSelected}
          onCheckedChange={(checked) =>
            onDomainToggle(domainGroup.domainId, domainGroup.goals, checked === true)
          }
          onClick={(e) => e.stopPropagation()}
          className={cn(someInDomainSelected && 'data-[state=checked]:bg-primary/50')}
        />
        <span
          className={cn(
            'font-medium text-sm flex-1',
            domainGroup.domainId === null
              ? 'text-muted-foreground'
              : 'text-purple-700 dark:text-purple-300'
          )}
        >
          {domainGroup.domainName}
        </span>
        <span className="text-xs text-muted-foreground">
          {domainGroup.goals.filter((g) => selectedIds.has(g.id.toString())).length}/
          {domainGroup.goals.length}
        </span>
      </div>

      {!isCollapsed && (
        <div className="divide-y divide-border/50 dark:divide-border/30">
          {domainGroup.goals.map((goal) => {
            const isSelected = selectedIds.has(goal.id.toString());
            return (
              <div
                key={goal.id.toString()}
                className={cn(
                  'flex items-start gap-3 px-3 py-2 pl-10 transition-colors',
                  isSelected
                    ? 'bg-primary/5 dark:bg-primary/10'
                    : 'hover:bg-muted/30 dark:hover:bg-muted/20'
                )}
              >
                <Checkbox
                  checked={isSelected}
                  onCheckedChange={(checked) => onToggle(goal.id.toString(), checked === true)}
                  className="mt-0.5"
                />
                <div className="flex-1 min-w-0">
                  <span className="text-sm text-foreground break-words">{goal.title}</span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="flex-shrink-0 h-6 px-2 text-xs"
                  onClick={() => onViewGoal(goal.id, 'adhoc')}
                >
                  <ExternalLink className="h-3 w-3 mr-1" />
                  View
                </Button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
