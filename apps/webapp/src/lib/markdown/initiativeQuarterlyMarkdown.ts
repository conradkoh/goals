import type { InitiativeQuarterSummary } from '@workspace/backend/src/usecase/getWeekDetails';
import { DateTime } from 'luxon';

import {
  generateMultipleQuarterlyGoalsMarkdown,
  type QuarterlySummaryMarkdownOptions,
} from './quarterlyMarkdown';

import { formatInitiativeDateRange } from '@/lib/date/initiative-dates';

/**
 * Generates agent-ready markdown for initiative-centric quarterly summaries.
 */
export function generateInitiativeQuarterSummaryMarkdown(
  summaryData: InitiativeQuarterSummary,
  options: QuarterlySummaryMarkdownOptions = {}
): string {
  const { initiatives, quarter, year, weekRange } = summaryData;
  const lines: string[] = [];

  lines.push(`# Q${quarter} ${year} Initiative Summary`);
  lines.push('');
  lines.push(
    '> **Agent context:** Structured quarterly work summary organized by initiative. Use initiative sections as primary narrative units.'
  );
  lines.push('');
  lines.push(
    `**Quarter:** Q${quarter} ${year} (ISO Weeks ${weekRange.startWeek}–${weekRange.endWeek})`
  );
  lines.push(`**Initiatives included:** ${initiatives.length}`);
  if (options.omitIncomplete) {
    lines.push('**Note:** Only completed goals are shown');
  }
  lines.push('');

  if (initiatives.length === 0) {
    lines.push('*No initiatives selected.*');
    return lines.join('\n');
  }

  lines.push('## Table of Contents');
  initiatives.forEach((item, index) => {
    lines.push(`${index + 1}. [${item.initiative.title}](#initiative-${index + 1})`);
  });
  lines.push('');

  // fallow-ignore-next-line complexity
  initiatives.forEach((item, index) => {
    const { initiative, quarterlyGoals, adhocGoals } = item;
    const goalCount = quarterlyGoals.length + (adhocGoals?.length ?? 0);

    lines.push(`## Initiative ${index + 1}: ${initiative.title}`);
    lines.push('');
    lines.push(
      `**Date range:** ${formatInitiativeDateRange(initiative.startDate, initiative.endDate)}`
    );
    lines.push(`**Tagged goals in quarter:** ${goalCount}`);
    if (initiative.description?.trim()) {
      lines.push('');
      lines.push('**Description:**');
      lines.push(initiative.description.trim());
    }
    lines.push('');

    if (goalCount === 0) {
      lines.push('*No goals tagged to this initiative for this quarter.*');
      lines.push('');
    } else {
      const initiativeBody = generateMultipleQuarterlyGoalsMarkdown(
        {
          quarterlyGoals,
          adhocGoals,
          year,
          quarter,
          weekRange,
        },
        options
      );

      // Demote headings so initiative remains the top-level structure
      const demotedBody = initiativeBody
        .replace(/^# /gm, '### ')
        .replace(/^## /gm, '#### ')
        .replace(/^### Goal /gm, '#### Goal ');

      lines.push(demotedBody);
    }

    if (index < initiatives.length - 1) {
      lines.push('---');
      lines.push('');
    }
  });

  lines.push('---');
  lines.push(`*Generated on ${DateTime.now().toFormat("LLL d, yyyy 'at' h:mm a")}*`);

  return lines.join('\n');
}
