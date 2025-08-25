import type { Id } from '@services/backend/convex/_generated/dataModel';
import { Clock } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { usePendingGoalStatus } from '@/contexts/GoalStatusContext';

interface PendingStatusDialogProps {
  goalId: Id<'goals'>;
  children: React.ReactNode;
}

export const PendingStatusDialog: React.FC<PendingStatusDialogProps> = ({ goalId, children }) => {
  const { isPending, pendingDescription, setPendingStatus, clearPendingStatus } =
    usePendingGoalStatus(goalId);

  const [isOpen, setIsOpen] = useState(false);
  const [description, setDescription] = useState(pendingDescription || '');

  // Update description when pendingDescription changes
  useEffect(() => {
    if (isOpen) {
      setDescription(pendingDescription || '');
    }
  }, [isOpen, pendingDescription]);

  const handleSave = useCallback(async () => {
    // Make reason optional; allow empty string
    setPendingStatus(description.trim());
    setIsOpen(false);
  }, [description, setPendingStatus]);

  const handleClear = async () => {
    await clearPendingStatus();
    setDescription('');
    setIsOpen(false);
  };

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
  };

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (isOpen && event.metaKey && event.key === 'Enter') {
        event.preventDefault();
        handleSave();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, handleSave]);

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-yellow-500" />
            {isPending ? 'Update Pending Status' : 'Mark as Pending'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <label htmlFor="pending-description" className="text-sm font-medium">
              Pending Reason
            </label>
            <Textarea
              id="pending-description"
              placeholder="Explain why this goal is pending (e.g., waiting for John's approval, blocked by API issue, etc.)"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="mt-1"
              rows={3}
            />
          </div>

          <div className="flex justify-between gap-2">
            <div>
              {isPending && (
                <Button
                  variant="outline"
                  onClick={handleClear}
                  className="text-yellow-600 hover:text-yellow-700"
                >
                  Clear Pending
                </Button>
              )}
            </div>

            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setIsOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSave} className="bg-yellow-500 hover:bg-yellow-600 text-white">
                {isPending ? 'Update' : 'Mark Pending'}
                <span className="ml-2 text-xs opacity-75">⌘↵</span>
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
