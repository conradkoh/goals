import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { QuarterlyGoalSummaryPopover } from '@/components/molecules/quarterly-summary';
import { useGoalEditContext } from './GoalEditContext';
import { GoalWithDetailsAndChildren } from '@services/backend/src/usecase/getWeekDetails';
import { Edit2, FileText, MoreVertical } from 'lucide-react';
import { cn } from '@/lib/utils';

interface GoalActionMenuProps {
  goal: GoalWithDetailsAndChildren;
  onSave: (title: string, details?: string) => Promise<void>;
  isQuarterlyGoal?: boolean;
  className?: string;
}

export const GoalActionMenu: React.FC<GoalActionMenuProps> = ({
  goal,
  onSave,
  isQuarterlyGoal = false,
  className,
}) => {
  const { startEditing } = useGoalEditContext();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isSummaryPopoverOpen, setIsSummaryPopoverOpen] = useState(false);

  const handleEditClick = () => {
    startEditing(goal);
    setIsDropdownOpen(false);
  };

  const handleSummaryClick = () => {
    // Keep the dropdown open when summary is clicked
    setIsSummaryPopoverOpen(true);
  };

  return (
    <DropdownMenu open={isDropdownOpen} onOpenChange={setIsDropdownOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={cn(
            'h-8 px-2 text-xs text-muted-foreground hover:text-foreground',
            className
          )}
        >
          <MoreVertical className="h-3.5 w-3.5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        {isQuarterlyGoal && (
          <QuarterlyGoalSummaryPopover
            quarterlyGoal={goal}
            trigger={
              <DropdownMenuItem
                onSelect={(e) => {
                  e.preventDefault();
                  handleSummaryClick();
                }}
                className="flex items-center cursor-pointer"
              >
                <FileText className="mr-2 h-4 w-4" />
                <span>View Summary</span>
              </DropdownMenuItem>
            }
          />
        )}
        <DropdownMenuItem
          onSelect={(e) => {
            e.preventDefault();
            handleEditClick();
          }}
          className="flex items-center cursor-pointer"
        >
          <Edit2 className="mr-2 h-4 w-4" />
          <span>Edit</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};