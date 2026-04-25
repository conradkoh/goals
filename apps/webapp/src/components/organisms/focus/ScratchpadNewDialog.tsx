'use client';

import { Eraser, FileX } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface ScratchpadNewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onClearScratchpad: () => void;
  onRemoveCompletedItems: () => void;
  hasCompletedItems: boolean;
}

export function ScratchpadNewDialog({
  open,
  onOpenChange,
  onClearScratchpad,
  onRemoveCompletedItems,
  hasCompletedItems,
}: ScratchpadNewDialogProps) {
  const handleClearScratchpad = () => {
    onClearScratchpad();
    onOpenChange(false);
  };

  const handleRemoveCompletedItems = () => {
    onRemoveCompletedItems();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>New Scratchpad</DialogTitle>
          <DialogDescription>Choose an action for your scratchpad content.</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-3 py-4">
          <Button
            variant="outline"
            className="justify-start h-auto py-3 px-4"
            onClick={handleClearScratchpad}
          >
            <FileX className="mr-3 h-4 w-4 text-muted-foreground" />
            <div className="flex flex-col items-start">
              <span className="font-medium text-sm">Clear Scratchpad</span>
              <span className="text-xs text-muted-foreground">
                Archive current content and start fresh
              </span>
            </div>
          </Button>
          <Button
            variant="outline"
            className="justify-start h-auto py-3 px-4"
            onClick={handleRemoveCompletedItems}
            disabled={!hasCompletedItems}
          >
            <Eraser className="mr-3 h-4 w-4 text-muted-foreground" />
            <div className="flex flex-col items-start">
              <span className="font-medium text-sm">Remove Completed Items</span>
              <span className="text-xs text-muted-foreground">
                Remove checked items from the scratchpad
              </span>
            </div>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
