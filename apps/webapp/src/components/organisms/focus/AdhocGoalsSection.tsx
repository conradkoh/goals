import type { Doc, Id } from '@services/backend/convex/_generated/dataModel';
import { ClipboardList, Info } from 'lucide-react';
import { useState } from 'react';
import { CreateGoalInput } from '@/components/atoms/CreateGoalInput';
import { DomainSelector } from '@/components/atoms/DomainSelector';
import { AdhocGoalItem } from '@/components/molecules/AdhocGoalItem';
import { Spinner } from '@/components/ui/spinner';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useAdhocGoals } from '@/hooks/useAdhocGoals';
import { useDomains } from '@/hooks/useDomains';
import type { DayOfWeek } from '@/lib/constants';
import { cn } from '@/lib/utils';
import { useSession } from '@/modules/auth/useSession';

/**
 * Converts hex color to RGB values.
 */
function _hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: Number.parseInt(result[1], 16),
        g: Number.parseInt(result[2], 16),
        b: Number.parseInt(result[3], 16),
      }
    : null;
}

/**
 * Calculates the relative luminance of a color.
 * Used to determine if a color is light or dark.
 */
function _getLuminance(r: number, g: number, b: number): number {
  const [rs, gs, bs] = [r, g, b].map((c) => {
    const sRGB = c / 255;
    return sRGB <= 0.03928 ? sRGB / 12.92 : ((sRGB + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

/**
 * Darkens a color by reducing its lightness.
 */
function _darkenColor(r: number, g: number, b: number, factor = 0.6): string {
  return `rgb(${Math.round(r * factor)}, ${Math.round(g * factor)}, ${Math.round(b * factor)})`;
}

/**
 * Generates color variations for domain pills based on the base domain color.
 * For light colors (like yellow), darkens the text for better contrast.
 * Uses the domain color with appropriate opacity for backgrounds.
 */
function _getDomainPillColors(domainColor?: string): {
  foreground: string;
  background: string;
  border: string;
  dotColor: string;
} {
  if (!domainColor) {
    return {
      foreground: 'rgb(55, 65, 81)', // gray-700
      background: 'rgb(243, 244, 246)', // gray-100
      border: 'rgb(229, 231, 235)', // gray-200
      dotColor: 'rgb(107, 114, 128)', // gray-500
    };
  }

  const rgb = _hexToRgb(domainColor);
  if (!rgb) {
    return {
      foreground: '#000000',
      background: domainColor,
      border: domainColor,
      dotColor: '#000000',
    };
  }

  // Calculate luminance to determine if it's a light or dark color
  const luminance = _getLuminance(rgb.r, rgb.g, rgb.b);

  // For light colors (luminance > 0.5), darken the text significantly for contrast
  // For dark colors, use the original color for text
  const textColor =
    luminance > 0.5
      ? _darkenColor(rgb.r, rgb.g, rgb.b, 0.4) // Darken to 40% for light colors
      : `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`; // Use original for dark colors

  return {
    foreground: textColor,
    background: `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.15)`,
    border: `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.3)`,
    dotColor: `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`,
  };
}

interface AdhocGoalsSectionProps {
  weekNumber: number;
  dayOfWeek?: DayOfWeek;
  showHeader?: boolean; // Whether to show the section header with icon
  variant?: 'default' | 'card' | 'inline'; // Styling variant
}

type OptimisticAdhocGoal = Doc<'goals'> & {
  domain?: Doc<'domains'>;
  isOptimistic?: boolean;
};

export function AdhocGoalsSection({
  weekNumber,
  dayOfWeek,
  showHeader = true,
  variant = 'default',
}: AdhocGoalsSectionProps) {
  const { sessionId } = useSession();
  const [newGoalTitle, setNewGoalTitle] = useState('');
  const [selectedDomainId, setSelectedDomainId] = useState<Id<'domains'> | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [optimisticGoals, setOptimisticGoals] = useState<OptimisticAdhocGoal[]>([]);

  const { adhocGoals, createAdhocGoal, updateAdhocGoal, deleteAdhocGoal } =
    useAdhocGoals(sessionId);
  const { domains, createDomain, updateDomain, deleteDomain } = useDomains(sessionId);

  // Filter adhoc goals based on week and optionally day
  const filteredAdhocGoals = dayOfWeek
    ? adhocGoals.filter((goal) => {
        // For daily view: show goals for this specific day OR goals for this week with no specific day
        return (
          goal.adhoc?.weekNumber === weekNumber &&
          (goal.adhoc?.dayOfWeek === dayOfWeek || !goal.adhoc?.dayOfWeek)
        );
      })
    : adhocGoals.filter((goal) => goal.adhoc?.weekNumber === weekNumber);

  // Combine real and optimistic goals
  const allGoals = [...optimisticGoals, ...filteredAdhocGoals];

  // Group goals by domain
  const groupedGoals = allGoals.reduce(
    (acc, goal) => {
      const domainId = goal.adhoc?.domainId || 'uncategorized';
      if (!acc[domainId]) {
        acc[domainId] = {
          domain: goal.domain,
          goals: [],
        };
      }
      acc[domainId].goals.push(goal);
      return acc;
    },
    {} as Record<string, { domain?: Doc<'domains'>; goals: OptimisticAdhocGoal[] }>
  );

  // Sort groups: domains first (alphabetically), then uncategorized
  const sortedGroups = Object.entries(groupedGoals).sort(([keyA, groupA], [keyB, groupB]) => {
    if (keyA === 'uncategorized') return 1;
    if (keyB === 'uncategorized') return -1;
    return (groupA.domain?.name || '').localeCompare(groupB.domain?.name || '');
  });

  const handleSubmit = async () => {
    if (!newGoalTitle.trim()) return;

    const title = newGoalTitle.trim();
    const tempId = `temp-${Date.now()}` as Id<'goals'>;

    // Create optimistic goal
    const currentYear = new Date().getFullYear();
    const optimisticGoal: OptimisticAdhocGoal = {
      _id: tempId,
      _creationTime: Date.now(),
      userId: '' as Id<'users'>, // Placeholder for optimistic update
      year: currentYear,
      quarter: Math.ceil((new Date().getMonth() + 1) / 3),
      title,
      inPath: '/',
      depth: -1,
      isComplete: false,
      isOptimistic: true,
      adhoc: {
        year: currentYear,
        weekNumber,
        dayOfWeek,
        domainId: selectedDomainId || undefined,
      },
      domain: selectedDomainId ? domains.find((d) => d._id === selectedDomainId) : undefined,
    };

    // Add optimistic goal immediately
    setOptimisticGoals((prev) => [optimisticGoal, ...prev]);
    setNewGoalTitle('');
    setIsCreating(true);

    try {
      await createAdhocGoal(
        title,
        undefined,
        selectedDomainId || undefined,
        weekNumber,
        dayOfWeek,
        undefined
      );

      // Remove optimistic goal after successful creation
      setOptimisticGoals((prev) => prev.filter((g) => g._id !== tempId));
    } catch (error) {
      console.error('Failed to create adhoc goal:', error);
      // Remove optimistic goal on error
      setOptimisticGoals((prev) => prev.filter((g) => g._id !== tempId));
    } finally {
      setIsCreating(false);
    }
  };

  const handleEscape = () => {
    setNewGoalTitle('');
  };

  const handleCompleteChange = async (goalId: Id<'goals'>, isComplete: boolean) => {
    try {
      await updateAdhocGoal(goalId, { isComplete });
    } catch (error) {
      console.error('Failed to update goal completion:', error);
    }
  };

  const handleUpdate = async (
    goalId: Id<'goals'>,
    title: string,
    details?: string,
    dueDate?: number,
    domainId?: Id<'domains'> | null
  ) => {
    try {
      await updateAdhocGoal(goalId, { title, details, dueDate, domainId });
    } catch (error) {
      console.error('Failed to update adhoc goal:', error);
    }
  };

  const handleDelete = async (goalId: Id<'goals'>) => {
    try {
      await deleteAdhocGoal(goalId);
    } catch (error) {
      console.error('Failed to delete adhoc goal:', error);
    }
  };

  const handleDomainCreate = async (name: string, description?: string, color?: string) => {
    try {
      const newDomainId = await createDomain(name, description, color);
      setSelectedDomainId(newDomainId);
      return newDomainId;
    } catch (error) {
      console.error('Failed to create domain:', error);
      throw error;
    }
  };

  // Determine wrapper styling based on variant
  const getWrapperClassName = () => {
    switch (variant) {
      case 'card':
        // For use inside FocusModeDailyView - orange tinted background for adhoc tasks
        return 'rounded-lg border border-orange-200 dark:border-orange-900/30 bg-orange-50 dark:bg-orange-950/20 p-4 mb-4';
      case 'inline':
        // For use inside other containers with no extra styling
        return 'space-y-2';
      default:
        // For use in weekly/multiweek views with separator
        return 'space-y-2';
    }
  };

  const content = (
    <>
      {/* Grouped Goals */}
      {sortedGroups.length > 0 && (
        <div className="space-y-3">
          {sortedGroups.map(([domainId, { domain, goals }]) => {
            const colors = _getDomainPillColors(domain?.color);
            return (
              <div key={domainId} className="space-y-1">
                <div
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border"
                  style={{
                    color: colors.foreground,
                    backgroundColor: colors.background,
                    borderColor: colors.border,
                  }}
                >
                  <span
                    className="w-1.5 h-1.5 rounded-full"
                    style={{ backgroundColor: colors.dotColor }}
                  />
                  {domain ? domain.name : 'Uncategorized'} ({goals.length})
                </div>
                <div className="space-y-0.5">
                  {goals.map((goal) => (
                    <AdhocGoalItem
                      key={goal._id}
                      goal={goal}
                      onCompleteChange={handleCompleteChange}
                      onUpdate={handleUpdate}
                      onDelete={handleDelete}
                      showDueDate={!dayOfWeek} // Only show due date in weekly view
                      showDomain={false}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Inline Create Input */}
      <div className="relative">
        <CreateGoalInput
          placeholder="Add an adhoc task..."
          value={newGoalTitle}
          onChange={setNewGoalTitle}
          onSubmit={handleSubmit}
          onEscape={handleEscape}
        >
          <div className="flex gap-2 items-center">
            <div className="flex-1">
              <DomainSelector
                domains={domains}
                selectedDomainId={selectedDomainId}
                onDomainChange={(value) => setSelectedDomainId(value as Id<'domains'> | null)}
                onDomainCreate={handleDomainCreate}
                onDomainUpdate={async (domainId, name, description, color) => {
                  await updateDomain(domainId, { name, description, color });
                }}
                onDomainDelete={async (domainId) => {
                  await deleteDomain(domainId);
                }}
                placeholder="Select domain (optional)"
              />
            </div>
            {isCreating && (
              <div className="flex items-center">
                <Spinner className="h-4 w-4" />
              </div>
            )}
          </div>
        </CreateGoalInput>
      </div>
    </>
  );

  // Render with or without header based on showHeader and variant
  if (variant === 'card') {
    // Card variant for daily view - matches OnFire and Pending sections with dark orange theme
    return (
      <div className={getWrapperClassName()}>
        {showHeader && (
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <ClipboardList className="h-5 w-5 text-orange-600 dark:text-orange-500" />
              <h2 className="text-lg font-semibold text-foreground">Adhoc Tasks</h2>
              <TooltipProvider delayDuration={300}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-4 w-4 text-muted-foreground hover:text-orange-600 dark:hover:text-orange-500 transition-colors" />
                  </TooltipTrigger>
                  <TooltipContent sideOffset={5} className="animate-in fade-in-50 duration-300">
                    <p className="text-xs max-w-xs">
                      Quick tasks that don't fit into the quarterly/weekly structure.
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </div>
        )}
        <div className="space-y-2">{content}</div>
      </div>
    );
  }

  // Default variant - no card, optional header
  return (
    <div className={getWrapperClassName()}>
      {showHeader && (
        <div className="flex items-center gap-2 mb-3">
          <ClipboardList className="h-5 w-5 text-muted-foreground" />
          <h3 className="font-semibold text-foreground">Adhoc Tasks</h3>
        </div>
      )}
      {content}
    </div>
  );
}
