import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { SafeHTML } from '@/components/ui/safe-html';
import { Maximize2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

interface GoalDetailsContentProps {
  title: string;
  details: string;
  className?: string;
  showTitle?: boolean;
}

export function GoalDetailsContent({
  title,
  details,
  className,
  showTitle = false,
}: GoalDetailsContentProps) {
  const [isFullViewOpen, setIsFullViewOpen] = useState(false);

  return (
    <>
      <div className="space-y-3">
        {showTitle && (
          <div className="flex items-center justify-between gap-2">
            <h3 className="font-semibold text-base break-words flex-1">
              {title}
            </h3>
            <ExpandButton onClick={() => setIsFullViewOpen(true)} />
          </div>
        )}

        {!showTitle && (
          <div className="flex justify-end mb-1">
            <ExpandButton onClick={() => setIsFullViewOpen(true)} />
          </div>
        )}

        <div
          className={cn(
            'max-h-[300px] overflow-y-auto pr-2 rounded-md bg-muted/30 p-3',
            className
          )}
        >
          <SafeHTML
            html={details}
            className="text-sm prose prose-sm max-w-none"
          />
        </div>
      </div>

      {/* Full view dialog */}
      <Dialog
        open={isFullViewOpen}
        onOpenChange={(open) => !open && setIsFullViewOpen(false)}
      >
        <DialogContent className="max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col p-6 mx-4">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold break-words">
              {title}
            </DialogTitle>
          </DialogHeader>
          <div className="mt-4 overflow-y-auto flex-1 pr-2">
            <SafeHTML
              html={details}
              className="text-sm prose prose-sm max-w-none"
            />
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

// Extract the expand button to a reusable component
function ExpandButton({ onClick }: { onClick: () => void }) {
  return (
    <Button
      variant="ghost"
      size="icon"
      className="h-6 w-6 text-muted-foreground hover:text-foreground flex-shrink-0 rounded-full"
      onClick={onClick}
      title="Expand to full view"
    >
      <Maximize2 className="h-4 w-4" />
    </Button>
  );
}
