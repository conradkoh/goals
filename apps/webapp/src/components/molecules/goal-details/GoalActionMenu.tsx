import type { GoalWithDetailsAndChildren } from '@services/backend/src/usecase/getWeekDetails';
import { Edit2, FileText, Maximize2, MoreVertical } from 'lucide-react';
import { useRouter } from 'next/navigation';
import type React from 'react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useWeek } from '@/hooks/useWeek';
import { cn } from '@/lib/utils';
import { GoalDetailsFullScreenModal } from './GoalDetailsFullScreenModal';
import { useGoalEditContext } from './GoalEditContext';

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
  const router = useRouter();
  const { year, quarter } = useWeek();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isFullScreenModalOpen, setIsFullScreenModalOpen] = useState(false);

  const handleEditClick = () => {
    startEditing(goal);
    setIsDropdownOpen(false);
  };

  const handleSummaryClick = () => {
    // Navigate directly to the quarterly summary page
    const summaryUrl = `/app/goal/${goal._id}/quarterly-summary?year=${year}&quarter=${quarter}`;
    router.push(summaryUrl);
    setIsDropdownOpen(false);
  };

  const handleFullScreenClick = () => {
    setIsFullScreenModalOpen(true);
    setIsDropdownOpen(false);
  };

  return (
    <>
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
          <DropdownMenuItem
            onSelect={(e) => {
              e.preventDefault();
              handleFullScreenClick();
            }}
            className="flex items-center cursor-pointer"
          >
            <Maximize2 className="mr-2 h-4 w-4" />
            <span>View Full Details</span>
          </DropdownMenuItem>
          {isQuarterlyGoal && (
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

      {/* Full Screen Modal */}
      <GoalDetailsFullScreenModal
        goal={goal}
        onSave={onSave}
        isOpen={isFullScreenModalOpen}
        onClose={() => setIsFullScreenModalOpen(false)}
      />
    </>
  );
};
