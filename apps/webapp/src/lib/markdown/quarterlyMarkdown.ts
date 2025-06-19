import { QuarterlyGoalSummary } from '@services/backend/src/usecase/getWeekDetails';
import { DateTime } from 'luxon';

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
  
  // Add quarter info
  lines.push(`**Quarter:** Q${quarter} ${year} (Weeks ${weekRange.startWeek}-${weekRange.endWeek})`);
  if (omitIncomplete) {
    lines.push(`**Note:** Only completed goals are shown`);
  }
  lines.push('');
  
  // Calculate and add summary statistics
  const allWeeklyGoals = Object.values(weeklyGoalsByWeek).flat();
  const completedWeeklyGoals = allWeeklyGoals.filter(goal => goal.isComplete).length;
  const totalDailyGoals = allWeeklyGoals.reduce((sum, weeklyGoal) => sum + (weeklyGoal.children?.length || 0), 0);
  const completedDailyGoals = allWeeklyGoals.reduce((sum, weeklyGoal) => {
    return sum + (weeklyGoal.children?.filter(daily => daily.isComplete).length || 0);
  }, 0);
  
  lines.push('## Summary');
  lines.push(`- **Weekly Goals:** ${completedWeeklyGoals}/${allWeeklyGoals.length} completed`);
  lines.push(`- **Daily Goals:** ${completedDailyGoals}/${totalDailyGoals} completed`);
  lines.push('');
  
  // Group weekly goals by week number and sort, applying filtering if needed
  const weekNumbers = Object.keys(weeklyGoalsByWeek)
    .map(Number)
    .filter(weekNum => {
      const weeklyGoals = weeklyGoalsByWeek[weekNum];
      if (!weeklyGoals || weeklyGoals.length === 0) return false;
      
      // If omitting incomplete goals, only include weeks that have at least one completed goal
      if (omitIncomplete) {
        return weeklyGoals.some(goal => goal.isComplete || 
          (goal.children && goal.children.some(child => child.isComplete)));
      }
      
      return true;
    })
    .sort((a, b) => a - b);
  
  // Add weekly goals sections
  if (weekNumbers.length > 0) {
    lines.push('## Weekly Goals');
    lines.push('');
    
    weekNumbers.forEach(weekNumber => {
      const allWeeklyGoals = weeklyGoalsByWeek[weekNumber];
      if (!allWeeklyGoals || allWeeklyGoals.length === 0) return;
      
      // Filter weekly goals based on completion status if needed
      const weeklyGoals = omitIncomplete 
        ? allWeeklyGoals.filter(goal => goal.isComplete || 
            (goal.children && goal.children.some(child => child.isComplete)))
        : allWeeklyGoals;
      
      if (weeklyGoals.length === 0) return;
      
      lines.push(`### Week ${weekNumber}`);
      lines.push('');
      
      weeklyGoals.forEach(weeklyGoal => {
        // Skip incomplete weekly goals if omitting incomplete
        if (omitIncomplete && !weeklyGoal.isComplete && 
            (!weeklyGoal.children || !weeklyGoal.children.some(child => child.isComplete))) {
          return;
        }
        
        const weeklyStatus = weeklyGoal.isComplete ? '[x]' : '[ ]';
        lines.push(`#### ${weeklyStatus} ${weeklyGoal.title}`);
        
        // Add weekly goal details if available
        if (weeklyGoal.details?.trim()) {
          lines.push('');
          lines.push(weeklyGoal.details.trim());
        }
        
        // Add daily goals as bullet points
        if (weeklyGoal.children && weeklyGoal.children.length > 0) {
          // Filter daily goals if omitting incomplete
          const dailyGoals = omitIncomplete 
            ? weeklyGoal.children.filter(daily => daily.isComplete)
            : weeklyGoal.children;
          
          if (dailyGoals.length > 0) {
            lines.push('');
            lines.push('**Daily Goals:**');
            dailyGoals.forEach(dailyGoal => {
              const dailyStatus = dailyGoal.isComplete ? '[x]' : '[ ]';
              lines.push(`- ${dailyStatus} ${dailyGoal.title}`);
              
              // Add daily goal details as sub-bullets if available
              if (dailyGoal.details?.trim()) {
                const detailLines = dailyGoal.details.trim().split('\n');
                detailLines.forEach(line => {
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
  lines.push(`*Generated on ${DateTime.now().toFormat('LLL d, yyyy \'at\' h:mm a')}*`);
  
  return lines.join('\n');
} 