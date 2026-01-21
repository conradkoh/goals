import { useMemo, useState } from 'react';

import { DomainPill } from '@/components/atoms/DomainPill';
import {
  CollapsibleMinimal,
  CollapsibleMinimalContent,
  CollapsibleMinimalTrigger,
} from '@/components/ui/collapsible-minimal';
import { useDomains } from '@/hooks/useDomains';
import { useSession } from '@/modules/auth/useSession';

/**
 * Props for the DomainsQuickSection component.
 */
export interface DomainsQuickSectionProps {
  /** Whether to show the section header */
  showHeader?: boolean;
  /** ISO week year for creating new tasks in domain popovers */
  year: number;
  /** Week number for creating new tasks in domain popovers */
  weekNumber: number;
}

/**
 * A collapsible section displaying all domains with task counts.
 * Allows users to quickly access domain-specific tasks and create new tasks
 * within a domain via the DomainPopover.
 *
 * Features:
 * - Collapsed by default
 * - Shows all domains (sorted alphabetically) with uncategorized at the end
 * - Click on a domain opens the DomainPopover where tasks can be viewed and created
 *
 * Positioning:
 * - Renders below Quarterly Goals section
 * - Renders above Adhoc Tasks section in FocusModeDailyView
 */
export function DomainsQuickSection({
  showHeader = true,
  year,
  weekNumber,
}: DomainsQuickSectionProps) {
  const { sessionId } = useSession();
  const { domains } = useDomains(sessionId);
  const [isExpanded, setIsExpanded] = useState(false);

  // Sort domains alphabetically by name
  const sortedDomains = useMemo(() => {
    return [...domains].sort((a, b) => a.name.localeCompare(b.name));
  }, [domains]);

  // Always include uncategorized domain (null) at the end
  // The count will be determined by the DomainPill component's query
  const allDomains = useMemo(() => {
    return [...sortedDomains, null]; // null represents uncategorized
  }, [sortedDomains]);

  // Calculate total number of domains (including uncategorized)
  const totalDomains = allDomains.length;

  const triggerText = isExpanded ? '🗂️ Domains' : `🗂️ Domains (${totalDomains})`;

  return (
    <div className="mb-4">
      {showHeader && <div className="font-semibold text-foreground mb-2 text-sm">Domains</div>}
      <CollapsibleMinimal open={isExpanded} onOpenChange={setIsExpanded}>
        <CollapsibleMinimalTrigger>{triggerText}</CollapsibleMinimalTrigger>
        <CollapsibleMinimalContent>
          <div className="flex flex-wrap gap-2 mt-2">
            {allDomains.map((domain) => {
              // Use domain ID for key, or 'uncategorized' for null
              const key = domain?._id || 'uncategorized';
              return (
                <DomainPill
                  key={key}
                  domain={domain}
                  year={year}
                  weekNumber={weekNumber}
                  interactive={true}
                />
              );
            })}
          </div>
        </CollapsibleMinimalContent>
      </CollapsibleMinimal>
    </div>
  );
}
