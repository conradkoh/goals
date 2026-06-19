'use client';

import { Plus } from 'lucide-react';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useGoalActions } from '@/hooks/useGoalActions';

export interface CreateQuarterlyGoalDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  year: number;
  quarter: 1 | 2 | 3 | 4;
  weekNumber: number;
}

export function CreateQuarterlyGoalDialog({
  open,
  onOpenChange,
  year,
  quarter,
  weekNumber,
}: CreateQuarterlyGoalDialogProps) {
  const { createQuarterlyGoal } = useGoalActions();
  const [title, setTitle] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    const trimmedTitle = title.trim();
    if (!trimmedTitle || isSubmitting) return;

    setIsSubmitting(true);
    try {
      await createQuarterlyGoal({ title: trimmedTitle, year, quarter, weekNumber });
      onOpenChange(false);
      setTitle('');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5 text-primary" />
            New Quarterly Goal
          </DialogTitle>
          <DialogDescription>
            Add a quarterly goal for Q{quarter}, {year}.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="quarterly-goal-title">Goal Text</Label>
            <Input
              id="quarterly-goal-title"
              placeholder="What do you want to achieve this quarter?"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              autoFocus
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!title.trim() || isSubmitting}>
            {isSubmitting ? 'Creating...' : 'Create Goal'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
