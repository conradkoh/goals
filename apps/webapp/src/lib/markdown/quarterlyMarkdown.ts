import type { Doc } from '@workspace/backend/convex/_generated/dataModel';
import type {
  MultipleQuarterlyGoalsSummary,
  QuarterlyGoalSummary,
} from '@workspace/backend/src/usecase/getWeekDetails';
import DOMPurify from 'dompurify';
import { DateTime } from 'luxon';

/**
 * DOMPurify configuration for sanitizing HTML before text extraction.
 * Only allows safe formatting tags - no scripts, iframes, etc.
 */
const SANITIZE_CONFIG = {
  ALLOWED_TAGS: [
    'p',
    'b',
    'i',
    'u',
    'strong',
    'em',
    'strike',
    'br',
    'ul',
    'ol',
    'li',
    'h1',
    'h2',
    'h3',
    'h4',
    'h5',
    'h6',
    'blockquote',
    'pre',
    'code',
    'span',
    'a',
    'div',
  ],
  ALLOWED_ATTR: ['href', 'class', 'target', 'title'],
  ALLOWED_URI_REGEXP:
    /^(?:(?:(?:f|ht)tps?|mailto|tel|callto|sms|cid|xmpp|xxx):|[^a-z]|[a-z+.-]+(?:[^a-z+.\-:]|$))/i,
};

/**
 * Converts HTML content to plain text for markdown output.
 * First sanitizes the HTML using DOMPurify to remove any malicious content,
 * then extracts clean text content.
 *
 * @param html - HTML content string (potentially untrusted)
 * @returns Sanitized plain text content
 */
function htmlToPlainText(html: string): string {
  if (!html) return '';

  // First, sanitize the HTML to remove any malicious content
  const sanitizedHtml = DOMPurify.sanitize(html, SANITIZE_CONFIG);

  // Use DOMParser to safely extract text content
  // This is safer than regex-based tag stripping as it properly handles
  // nested tags, malformed HTML, and edge cases
  if (typeof window !== 'undefined' && window.DOMParser) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(sanitizedHtml, 'text/html');

    // Get text content, which automatically strips all HTML tags
    let text = doc.body.textContent || '';

    // Clean up whitespace
    text = text
      .split(/\n+/)
      .map((line) => line.trim())
      .filter((line) => line.length > 0)
      .join(' ');

    return text.trim();
  }

  // Fallback for SSR/Node.js environments where DOMParser isn't available
  // This is a simplified extraction - the primary sanitization is already done
  let text = sanitizedHtml;

  // Replace common HTML entities
  text = text
    .replace(/&nbsp;/g, ' ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");

  // Convert block elements to line breaks
  text = text.replace(/<br\s*\/?>/gi, '\n').replace(/<\/p>/gi, '\n');

  // Remove all remaining HTML tags
  text = text.replace(/<[^>]*>/g, '');

  // Clean up whitespace
  text = text
    .split(/\n+/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .join(' ');

  return text.trim();
}

/**
 * Formats goal log entries as markdown.
 * Groups logs by date and renders content.
 *
 * @param logs - Array of goal log entries
 * @param indent - Indentation level for nested lists (default: '')
 * @returns Formatted markdown string for logs
 */
function formatGoalLogsAsMarkdown(logs: Doc<'goalLogs'>[], indent = ''): string {
  if (!logs || logs.length === 0) {
    return '';
  }

  const lines: string[] = [];
  lines.push(`${indent}**Log:**`);

  // Group logs by date
  const logsByDate = new Map<string, Doc<'goalLogs'>[]>();
  for (const log of logs) {
    const dateKey = DateTime.fromMillis(log.logDate).toFormat('yyyy-MM-dd');
    if (!logsByDate.has(dateKey)) {
      logsByDate.set(dateKey, []);
    }
    logsByDate.get(dateKey)!.push(log);
  }

  // Sort dates in descending order (most recent first)
  const sortedDates = [...logsByDate.keys()].sort((a, b) => b.localeCompare(a));

  for (const dateKey of sortedDates) {
    const dateLogs = logsByDate.get(dateKey)!;
    const formattedDate = DateTime.fromFormat(dateKey, 'yyyy-MM-dd').toFormat('LLL d, yyyy');
    lines.push(`${indent}- **${formattedDate}:**`);

    for (const log of dateLogs) {
      // Convert HTML to plain text
      const plainContent = htmlToPlainText(log.content);

      if (plainContent) {
        lines.push(`${indent}  - ${plainContent}`);
      }
    }
  }

  return lines.join('\n');
}

/**
 * Options for generating quarterly summary markdown.
 */
export interface QuarterlySummaryMarkdownOptions {
  /**
   * Whether to omit incomplete goals from the output.
   * When true, only completed goals will be included.
   */
  omitIncomplete?: boolean;
}

/**
 * Generates a markdown representation of a quarterly goal summary.
 *
 * @param summaryData - The quarterly goal summary data
 * @param options - Options for customizing the markdown output
 * @returns A formatted markdown string
 */
export function generateQuarterlySummaryMarkdown(
  summaryData: QuarterlyGoalSummary,
  options: QuarterlySummaryMarkdownOptions = {}
): string {
  const { quarterlyGoal, weeklyGoalsByWeek, quarter, year, weekRange } = summaryData;
  const { omitIncomplete = false } = options;

  // Build the markdown content
  const lines: string[] = [];

  // Header with quarterly goal - always show quarterly goal regardless of completion status
  const completionStatus = quarterlyGoal.isComplete ? '[x]' : '[ ]';
  lines.push(`# ${completionStatus} Q${quarter} ${year}: ${quarterlyGoal.title}`);
  lines.push('');

  // Add details if available
  if (quarterlyGoal.details?.trim()) {
    lines.push(quarterlyGoal.details.trim());
    lines.push('');
  }

  // Add completion date if completed
  if (quarterlyGoal.isComplete && quarterlyGoal.completedAt) {
    const completedDate = DateTime.fromMillis(quarterlyGoal.completedAt).toFormat('LLL d, yyyy');
    lines.push(`**Completed:** ${completedDate}`);
    lines.push('');
  }

  // Add quarterly goal logs if available
  if (quarterlyGoal.logs && quarterlyGoal.logs.length > 0) {
    lines.push(formatGoalLogsAsMarkdown(quarterlyGoal.logs));
    lines.push('');
  }

  // Add quarter info
  lines.push(
    `**Quarter:** Q${quarter} ${year} (Weeks ${weekRange.startWeek}-${weekRange.endWeek})`
  );
  if (omitIncomplete) {
    lines.push('**Note:** Only completed goals are shown');
  }
  lines.push('');

  // Calculate and add summary statistics
  const allWeeklyGoals = Object.values(weeklyGoalsByWeek).flat();
  const completedWeeklyGoals = allWeeklyGoals.filter((goal) => goal.isComplete).length;
  const totalDailyGoals = allWeeklyGoals.reduce(
    (sum, weeklyGoal) => sum + (weeklyGoal.children?.length || 0),
    0
  );
  const completedDailyGoals = allWeeklyGoals.reduce((sum, weeklyGoal) => {
    return sum + (weeklyGoal.children?.filter((daily) => daily.isComplete).length || 0);
  }, 0);

  lines.push('## Summary');
  lines.push(`- **Weekly Goals:** ${completedWeeklyGoals}/${allWeeklyGoals.length} completed`);
  lines.push(`- **Daily Goals:** ${completedDailyGoals}/${totalDailyGoals} completed`);
  lines.push('');

  // Group weekly goals by week number and sort, applying filtering if needed
  const weekNumbers = Object.keys(weeklyGoalsByWeek)
    .map(Number)
    .filter((weekNum) => {
      const weeklyGoals = weeklyGoalsByWeek[weekNum];
      if (!weeklyGoals || weeklyGoals.length === 0) return false;

      // If omitting incomplete goals, only include weeks that have at least one completed goal
      if (omitIncomplete) {
        return weeklyGoals.some(
          (goal) => goal.isComplete || goal.children?.some((child) => child.isComplete)
        );
      }

      return true;
    })
    .sort((a, b) => a - b);

  // Add weekly goals sections
  if (weekNumbers.length > 0) {
    lines.push('## Weekly Goals');
    lines.push('');

    weekNumbers.forEach((weekNumber) => {
      const allWeeklyGoals = weeklyGoalsByWeek[weekNumber];
      if (!allWeeklyGoals || allWeeklyGoals.length === 0) return;

      // Filter weekly goals based on completion status if needed
      const weeklyGoals = omitIncomplete
        ? allWeeklyGoals.filter(
            (goal) => goal.isComplete || goal.children?.some((child) => child.isComplete)
          )
        : allWeeklyGoals;

      if (weeklyGoals.length === 0) return;

      lines.push(`### Week ${weekNumber}`);
      lines.push('');

      weeklyGoals.forEach((weeklyGoal) => {
        // Skip incomplete weekly goals if omitting incomplete
        if (
          omitIncomplete &&
          !weeklyGoal.isComplete &&
          (!weeklyGoal.children || !weeklyGoal.children.some((child) => child.isComplete))
        ) {
          return;
        }

        const weeklyStatus = weeklyGoal.isComplete ? '[x]' : '[ ]';
        lines.push(`#### ${weeklyStatus} ${weeklyGoal.title}`);

        // Add weekly goal details if available
        if (weeklyGoal.details?.trim()) {
          lines.push('');
          lines.push(weeklyGoal.details.trim());
        }

        // Add weekly goal logs if available
        if (weeklyGoal.logs && weeklyGoal.logs.length > 0) {
          lines.push('');
          lines.push(formatGoalLogsAsMarkdown(weeklyGoal.logs));
        }

        // Add daily goals as bullet points
        if (weeklyGoal.children && weeklyGoal.children.length > 0) {
          // Filter daily goals if omitting incomplete
          const dailyGoals = omitIncomplete
            ? weeklyGoal.children.filter((daily) => daily.isComplete)
            : weeklyGoal.children;

          if (dailyGoals.length > 0) {
            lines.push('');
            lines.push('**Daily Goals:**');
            dailyGoals.forEach((dailyGoal) => {
              const dailyStatus = dailyGoal.isComplete ? '[x]' : '[ ]';
              lines.push(`- ${dailyStatus} ${dailyGoal.title}`);

              // Add daily goal details as sub-bullets if available
              if (dailyGoal.details?.trim()) {
                const detailLines = dailyGoal.details.trim().split('\n');
                detailLines.forEach((line) => {
                  lines.push(`  - ${line.trim()}`);
                });
              }
            });
          }
        }

        lines.push('');
      });
    });
  } else {
    lines.push('## Weekly Goals');
    lines.push('');
    const noGoalsMessage = omitIncomplete
      ? '*No completed goals found for this quarter.*'
      : '*No weekly goals found for this quarter.*';
    lines.push(noGoalsMessage);
    lines.push('');
  }

  // Add generation timestamp
  lines.push('---');
  lines.push(`*Generated on ${DateTime.now().toFormat("LLL d, yyyy 'at' h:mm a")}*`);

  return lines.join('\n');
}

/**
 * Generates a markdown representation of multiple quarterly goals summary.
 *
 * @param summaryData - The multiple quarterly goals summary data
 * @param options - Options for customizing the markdown output
 * @returns A formatted markdown string
 */
export function generateMultipleQuarterlyGoalsMarkdown(
  summaryData: MultipleQuarterlyGoalsSummary,
  options: QuarterlySummaryMarkdownOptions = {}
): string {
  const { quarterlyGoals, adhocGoals, quarter, year, weekRange } = summaryData;
  const { omitIncomplete = false } = options;

  // Build the markdown content
  const lines: string[] = [];

  // Main header
  lines.push(`# Q${quarter} ${year} Multi-Goal Summary`);
  lines.push('');
  lines.push(
    `**Quarter:** Q${quarter} ${year} (Weeks ${weekRange.startWeek}-${weekRange.endWeek})`
  );
  lines.push(`**Goals Included:** ${quarterlyGoals.length}`);
  if (adhocGoals && adhocGoals.length > 0) {
    lines.push(`**Adhoc Goals Included:** ${adhocGoals.length}`);
  }
  if (omitIncomplete) {
    lines.push('**Note:** Only completed goals are shown');
  }
  lines.push('');

  // Calculate overall statistics
  let totalWeeklyGoals = 0;
  let completedWeeklyGoals = 0;
  let totalDailyGoals = 0;
  let completedDailyGoals = 0;
  let completedQuarterlyGoals = 0;

  quarterlyGoals.forEach((summary) => {
    if (summary.quarterlyGoal.isComplete) {
      completedQuarterlyGoals++;
    }

    const weeklyGoals = Object.values(summary.weeklyGoalsByWeek).flat();
    totalWeeklyGoals += weeklyGoals.length;
    completedWeeklyGoals += weeklyGoals.filter((goal) => goal.isComplete).length;

    weeklyGoals.forEach((weeklyGoal) => {
      const dailyGoals = weeklyGoal.children || [];
      totalDailyGoals += dailyGoals.length;
      completedDailyGoals += dailyGoals.filter((daily) => daily.isComplete).length;
    });
  });

  // Calculate adhoc goal statistics
  let totalAdhocGoals = 0;
  let completedAdhocGoals = 0;
  if (adhocGoals && adhocGoals.length > 0) {
    // Filter adhoc goals based on omitIncomplete option
    const filteredAdhocGoals = omitIncomplete
      ? adhocGoals.filter((goal) => goal.isComplete)
      : adhocGoals;
    totalAdhocGoals = filteredAdhocGoals.length;
    completedAdhocGoals = filteredAdhocGoals.filter((goal) => goal.isComplete).length;
  }

  // Overall summary statistics
  lines.push('## Overall Summary');
  lines.push(
    `- **Quarterly Goals:** ${completedQuarterlyGoals}/${quarterlyGoals.length} completed`
  );
  lines.push(`- **Weekly Goals:** ${completedWeeklyGoals}/${totalWeeklyGoals} completed`);
  lines.push(`- **Daily Goals:** ${completedDailyGoals}/${totalDailyGoals} completed`);
  if (adhocGoals && adhocGoals.length > 0) {
    lines.push(`- **Adhoc Goals:** ${completedAdhocGoals}/${totalAdhocGoals} completed`);
  }
  lines.push('');

  // Table of contents
  lines.push('## Table of Contents');
  quarterlyGoals.forEach((summary, index) => {
    const status = summary.quarterlyGoal.isComplete ? '✓' : '○';
    lines.push(`${index + 1}. [${status} ${summary.quarterlyGoal.title}](#goal-${index + 1})`);
  });
  if (adhocGoals && adhocGoals.length > 0) {
    lines.push(`${quarterlyGoals.length + 1}. [Adhoc Goals](#adhoc-goals)`);
  }
  lines.push('');

  // Individual goal sections
  lines.push('## Goals');
  lines.push('');

  quarterlyGoals.forEach((summary, index) => {
    const { quarterlyGoal, weeklyGoalsByWeek } = summary;

    // Skip incomplete quarterly goals if omitting incomplete
    if (omitIncomplete && !quarterlyGoal.isComplete) {
      const hasCompletedSubGoals = Object.values(weeklyGoalsByWeek)
        .flat()
        .some((weekly) => weekly.isComplete || weekly.children?.some((daily) => daily.isComplete));
      if (!hasCompletedSubGoals) {
        return;
      }
    }

    const completionStatus = quarterlyGoal.isComplete ? '[x]' : '[ ]';
    lines.push(`### Goal ${index + 1}: ${completionStatus} ${quarterlyGoal.title}`);
    lines.push('');

    // Add details if available
    if (quarterlyGoal.details?.trim()) {
      lines.push(quarterlyGoal.details.trim());
      lines.push('');
    }

    // Add completion date if completed
    if (quarterlyGoal.isComplete && quarterlyGoal.completedAt) {
      const completedDate = DateTime.fromMillis(quarterlyGoal.completedAt).toFormat('LLL d, yyyy');
      lines.push(`**Completed:** ${completedDate}`);
      lines.push('');
    }

    // Add quarterly goal logs if available
    if (quarterlyGoal.logs && quarterlyGoal.logs.length > 0) {
      lines.push(formatGoalLogsAsMarkdown(quarterlyGoal.logs));
      lines.push('');
    }

    // Calculate goal-specific statistics
    const allWeeklyGoals = Object.values(weeklyGoalsByWeek).flat();
    const goalCompletedWeeklyGoals = allWeeklyGoals.filter((goal) => goal.isComplete).length;
    const goalTotalDailyGoals = allWeeklyGoals.reduce(
      (sum, weeklyGoal) => sum + (weeklyGoal.children?.length || 0),
      0
    );
    const goalCompletedDailyGoals = allWeeklyGoals.reduce((sum, weeklyGoal) => {
      return sum + (weeklyGoal.children?.filter((daily) => daily.isComplete).length || 0);
    }, 0);

    lines.push('**Goal Statistics:**');
    lines.push(`- Weekly Goals: ${goalCompletedWeeklyGoals}/${allWeeklyGoals.length} completed`);
    lines.push(`- Daily Goals: ${goalCompletedDailyGoals}/${goalTotalDailyGoals} completed`);
    lines.push('');

    // Group weekly goals by week number and sort, applying filtering if needed
    const weekNumbers = Object.keys(weeklyGoalsByWeek)
      .map(Number)
      .filter((weekNum) => {
        const weeklyGoals = weeklyGoalsByWeek[weekNum];
        if (!weeklyGoals || weeklyGoals.length === 0) return false;

        // If omitting incomplete goals, only include weeks that have at least one completed goal
        if (omitIncomplete) {
          return weeklyGoals.some(
            (goal) => goal.isComplete || goal.children?.some((child) => child.isComplete)
          );
        }

        return true;
      })
      .sort((a, b) => a - b);

    // Add weekly goals sections for this quarterly goal
    if (weekNumbers.length > 0) {
      lines.push(`#### Weekly Goals for Goal ${index + 1}`);
      lines.push('');

      weekNumbers.forEach((weekNumber) => {
        const allWeeklyGoals = weeklyGoalsByWeek[weekNumber];
        if (!allWeeklyGoals || allWeeklyGoals.length === 0) return;

        // Filter weekly goals based on completion status if needed
        const weeklyGoals = omitIncomplete
          ? allWeeklyGoals.filter(
              (goal) => goal.isComplete || goal.children?.some((child) => child.isComplete)
            )
          : allWeeklyGoals;

        if (weeklyGoals.length === 0) return;

        lines.push(`**Week ${weekNumber}**`);
        lines.push('');

        weeklyGoals.forEach((weeklyGoal) => {
          // Skip incomplete weekly goals if omitting incomplete
          if (
            omitIncomplete &&
            !weeklyGoal.isComplete &&
            (!weeklyGoal.children || !weeklyGoal.children.some((child) => child.isComplete))
          ) {
            return;
          }

          const weeklyStatus = weeklyGoal.isComplete ? '[x]' : '[ ]';
          lines.push(`- ${weeklyStatus} **${weeklyGoal.title}**`);

          // Add weekly goal details if available
          if (weeklyGoal.details?.trim()) {
            const detailLines = weeklyGoal.details.trim().split('\n');
            detailLines.forEach((line) => {
              lines.push(`  - ${line.trim()}`);
            });
          }

          // Add weekly goal logs if available
          if (weeklyGoal.logs && weeklyGoal.logs.length > 0) {
            lines.push(formatGoalLogsAsMarkdown(weeklyGoal.logs, '  '));
          }

          // Add daily goals as sub-bullets
          if (weeklyGoal.children && weeklyGoal.children.length > 0) {
            // Filter daily goals if omitting incomplete
            const dailyGoals = omitIncomplete
              ? weeklyGoal.children.filter((daily) => daily.isComplete)
              : weeklyGoal.children;

            if (dailyGoals.length > 0) {
              dailyGoals.forEach((dailyGoal) => {
                const dailyStatus = dailyGoal.isComplete ? '[x]' : '[ ]';
                lines.push(`  - ${dailyStatus} ${dailyGoal.title}`);

                // Add daily goal details as sub-sub-bullets if available
                if (dailyGoal.details?.trim()) {
                  const detailLines = dailyGoal.details.trim().split('\n');
                  detailLines.forEach((line) => {
                    lines.push(`    - ${line.trim()}`);
                  });
                }
              });
            }
          }
        });

        lines.push('');
      });
    } else {
      lines.push(`#### Weekly Goals for Goal ${index + 1}`);
      lines.push('');
      const noGoalsMessage = omitIncomplete
        ? '*No completed goals found for this quarterly goal.*'
        : '*No weekly goals found for this quarterly goal.*';
      lines.push(noGoalsMessage);
      lines.push('');
    }

    // Add separator between goals (except for the last one or if there are adhoc goals to add)
    if (index < quarterlyGoals.length - 1 || (adhocGoals && adhocGoals.length > 0)) {
      lines.push('---');
      lines.push('');
    }
  });

  // Add Adhoc Goals section if applicable
  if (adhocGoals && adhocGoals.length > 0) {
    const filteredAdhocGoals = omitIncomplete
      ? adhocGoals.filter((goal) => goal.isComplete)
      : adhocGoals;

    if (filteredAdhocGoals.length > 0) {
      lines.push('### Adhoc Goals');
      lines.push('');
      lines.push('Tactical tasks and smaller wins achieved during the quarter.');
      lines.push('');

      // Group adhoc goals by week
      const adhocGoalsByWeek: Record<number, typeof adhocGoals> = {};
      filteredAdhocGoals.forEach((goal) => {
        if (goal.adhoc?.weekNumber) {
          const weekNumber = goal.adhoc.weekNumber;
          if (!adhocGoalsByWeek[weekNumber]) {
            adhocGoalsByWeek[weekNumber] = [];
          }
          adhocGoalsByWeek[weekNumber].push(goal);
        }
      });

      // Sort weeks
      const sortedWeeks = Object.keys(adhocGoalsByWeek)
        .map(Number)
        .sort((a, b) => a - b);

      sortedWeeks.forEach((weekNumber) => {
        const weekGoals = adhocGoalsByWeek[weekNumber];
        lines.push(`**Week ${weekNumber}**`);
        lines.push('');

        weekGoals.forEach((goal) => {
          const status = goal.isComplete ? '[x]' : '[ ]';
          lines.push(`- ${status} ${goal.title}`);

          // Add goal details if available
          if (goal.details?.trim()) {
            const detailLines = goal.details.trim().split('\n');
            detailLines.forEach((line) => {
              lines.push(`  - ${line.trim()}`);
            });
          }
        });

        lines.push('');
      });
    }
  }

  // Add generation timestamp
  lines.push('---');
  lines.push(`*Generated on ${DateTime.now().toFormat("LLL d, yyyy 'at' h:mm a")}*`);

  return lines.join('\n');
}
