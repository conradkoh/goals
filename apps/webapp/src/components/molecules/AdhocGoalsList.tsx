import type { Doc, Id } from '@services/backend/convex/_generated/dataModel';
import { AdhocGoalItem } from '@/components/molecules/AdhocGoalItem';

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

interface AdhocGoalsListProps {
  goals: (Doc<'goals'> & { domain?: Doc<'domains'> })[];
  onCompleteChange: (goalId: Id<'goals'>, isComplete: boolean) => Promise<void>;
  onUpdate: (
    goalId: Id<'goals'>,
    title: string,
    details?: string,
    dueDate?: number,
    domainId?: Id<'domains'> | null
  ) => Promise<void>;
  onDelete: (goalId: Id<'goals'>) => Promise<void>;
  showDueDate?: boolean;
  emptyMessage?: string;
}

/**
 * Renders a list of adhoc goals grouped by domain.
 * Extracted component to enable reuse in Active/Completed tabs.
 */
export function AdhocGoalsList({
  goals,
  onCompleteChange,
  onUpdate,
  onDelete,
  showDueDate = true,
  emptyMessage = 'No tasks yet',
}: AdhocGoalsListProps) {
  // Group goals by domain
  const groupedGoals = goals.reduce(
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
    {} as Record<string, { domain?: Doc<'domains'>; goals: typeof goals }>
  );

  // Sort groups: domains first (alphabetically), then uncategorized
  const sortedGroups = Object.entries(groupedGoals).sort(([keyA, groupA], [keyB, groupB]) => {
    if (keyA === 'uncategorized') return 1;
    if (keyB === 'uncategorized') return -1;
    return (groupA.domain?.name || '').localeCompare(groupB.domain?.name || '');
  });

  // Show empty state if no goals
  if (sortedGroups.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <p className="text-sm">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {sortedGroups.map(([domainId, { domain, goals: domainGoals }]) => {
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
              {domain ? domain.name : 'Uncategorized'} ({domainGoals.length})
            </div>
            <div className="space-y-0.5">
              {domainGoals.map((goal) => (
                <AdhocGoalItem
                  key={goal._id}
                  goal={goal}
                  onCompleteChange={onCompleteChange}
                  onUpdate={onUpdate}
                  onDelete={onDelete}
                  showDueDate={showDueDate}
                  showDomain={false}
                />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
