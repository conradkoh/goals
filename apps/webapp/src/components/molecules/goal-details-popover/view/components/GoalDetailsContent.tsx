import { Maximize2 } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { SafeHTML } from '@/components/ui/safe-html';
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
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-base break-words flex-1">{title}</h3>
          </div>
        )}

        <div
          className={cn(
            'max-h-[300px] overflow-y-auto rounded-md pt-4 pb-4 px-3 relative group',
            className
          )}
        >
          <SafeHTML html={details} className="text-sm prose prose-sm max-w-none" />

          {/* Absolutely positioned expand button */}
          <div className="absolute top-0 right-3 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none group-hover:pointer-events-auto">
            <ExpandButton onClick={() => setIsFullViewOpen(true)} />
          </div>
        </div>
      </div>

      {/* Full view dialog */}
      <Dialog open={isFullViewOpen} onOpenChange={(open) => !open && setIsFullViewOpen(false)}>
        <DialogContent className="w-full max-w-[min(48rem,calc(100vw-32px))] max-h-[90vh] overflow-hidden flex flex-col p-6">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold break-words">{title}</DialogTitle>
          </DialogHeader>
          <div className="mt-4 overflow-y-auto flex-1 pr-2">
            <SafeHTML html={details} className="text-sm prose prose-sm max-w-none" />
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
      className="h-5 w-5 text-muted-foreground hover:text-foreground flex-shrink-0 rounded-full bg-background/80 backdrop-blur-sm shadow-sm"
      onClick={onClick}
      title="Expand to full view"
    >
      <Maximize2 className="h-3 w-3" />
    </Button>
  );
}
