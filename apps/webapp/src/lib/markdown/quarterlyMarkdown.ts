import { QuarterlyGoalSummary } from '@services/backend/src/usecase/getWeekDetails';
import { DateTime } from 'luxon';

/**
 * Generates a markdown representation of a quarterly goal summary.
 * 
 * @param summaryData - The quarterly goal summary data
 * @returns A formatted markdown string
 */
export function generateQuarterlySummaryMarkdown(summaryData: QuarterlyGoalSummary): string {
  const { quarterlyGoal, weeklyGoalsByWeek, quarter, year, weekRange } = summaryData;
  
  // Build the markdown content
  const lines: string[] = [];
  
  // Header with quarterly goal
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
  
  // Group weekly goals by week number and sort
  const weekNumbers = Object.keys(weeklyGoalsByWeek)
    .map(Number)
    .filter(weekNum => weeklyGoalsByWeek[weekNum]?.length > 0)
    .sort();
  
  // Add weekly goals sections
  if (weekNumbers.length > 0) {
    lines.push('## Weekly Goals');
    lines.push('');
    
    weekNumbers.forEach(weekNumber => {
      const weeklyGoals = weeklyGoalsByWeek[weekNumber];
      if (!weeklyGoals || weeklyGoals.length === 0) return;
      
      lines.push(`### Week ${weekNumber}`);
      lines.push('');
      
      weeklyGoals.forEach(weeklyGoal => {
        const weeklyStatus = weeklyGoal.isComplete ? '[x]' : '[ ]';
        lines.push(`#### ${weeklyStatus} ${weeklyGoal.title}`);
        
        // Add weekly goal details if available
        if (weeklyGoal.details?.trim()) {
          lines.push('');
          lines.push(weeklyGoal.details.trim());
        }
        
        // Add daily goals as bullet points
        if (weeklyGoal.children && weeklyGoal.children.length > 0) {
          lines.push('');
          lines.push('**Daily Goals:**');
          weeklyGoal.children.forEach(dailyGoal => {
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
        
        lines.push('');
      });
    });
  } else {
    lines.push('## Weekly Goals');
    lines.push('');
    lines.push('*No weekly goals found for this quarter.*');
    lines.push('');
  }
  
  // Add generation timestamp
  lines.push('---');
  lines.push(`*Generated on ${DateTime.now().toFormat('LLL d, yyyy \'at\' h:mm a')}*`);
  
  return lines.join('\n');
} 