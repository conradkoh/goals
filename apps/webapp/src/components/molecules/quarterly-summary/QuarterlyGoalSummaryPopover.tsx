import React, { ReactNode } from 'react';
import { GoalWithDetailsAndChildren } from '@services/backend/src/usecase/getWeekDetails';
import { QuarterlyGoalSummaryView } from './QuarterlyGoalSummaryView';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { ExternalLink } from 'lucide-react';
import { useWeek } from '@/hooks/useWeek';
import { useSummaryGoalActions } from '@/hooks/useSummaryGoalActions';

/**
 * Props for the QuarterlyGoalSummaryPopover component.
 */
interface QuarterlyGoalSummaryPopoverProps {
  /**
   * The quarterly goal object, including its details and children.
   */
  quarterlyGoal: GoalWithDetailsAndChildren;
  /**
   * The element that triggers the popover.
   */
  trigger: ReactNode;
  /**
   * Optional CSS class name for the component.
   */
  className?: string;
}

/**
 * A popover component that displays a summary of a quarterly goal.
 * It includes a link to expand the summary into a full-screen page.
 *
 * @param {QuarterlyGoalSummaryPopoverProps} props - The props for the component.
 * @returns {JSX.Element} The rendered popover component.
 */
export function QuarterlyGoalSummaryPopover({
  quarterlyGoal,
  trigger,
  className,
}: QuarterlyGoalSummaryPopoverProps) {
  const { year, quarter } = useWeek();
  const goalActions = useSummaryGoalActions();

  // Generate the full-screen page URL with year and quarter params
  const fullScreenUrl = `/app/goal/${quarterlyGoal._id}/quarterly-summary?year=${year}&quarter=${quarter}`;

  return (
    <Popover>
      <PopoverTrigger asChild>
        {trigger}
      </PopoverTrigger>
      <PopoverContent 
        className="w-[800px] max-w-[calc(100vw-32px)] max-h-[min(600px,calc(100vh-100px))] p-0 flex flex-col"
        side="bottom"
        align="start"
      >
        <div className="flex-shrink-0 bg-background border-b p-4 flex items-center justify-between">
          <h3 className="font-semibold text-lg">Quarterly Goal Summary</h3>
          <Button
            variant="outline"
            size="sm"
            asChild
            className="h-8 px-3 text-xs"
          >
            <a
              href={fullScreenUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              <span>Expand</span>
            </a>
          </Button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-6">
          <QuarterlyGoalSummaryView
            quarterlyGoalId={quarterlyGoal._id}
            year={year}
            quarter={quarter}
            goalActions={goalActions}
            className={className}
          />
        </div>
      </PopoverContent>
    </Popover>
  );
} 