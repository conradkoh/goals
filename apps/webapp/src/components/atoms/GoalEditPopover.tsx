import { Edit2 } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { RichTextEditor } from '@/components/ui/rich-text-editor';
import { useToast } from '@/components/ui/use-toast';
import { useFormSubmitShortcut } from '@/hooks/useFormSubmitShortcut';

interface GoalEditPopoverProps {
  title: string;
  details?: string;
  onSave: (title: string, details: string, dueDate?: number) => Promise<void>;
  trigger?: React.ReactNode;
}

export function GoalEditPopover({
  title: initialTitle,
  details: initialDetails,
  onSave,
  trigger,
}: GoalEditPopoverProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [title, setTitle] = useState(initialTitle);
  const [details, setDetails] = useState(initialDetails ?? '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  // Sync title with external data when it changes or popover opens
  useEffect(() => {
    if (isOpen) {
      setTitle(initialTitle);
    }
  }, [isOpen, initialTitle]);

  // Sync details with external data when it changes or popover opens
  useEffect(() => {
    if (isOpen) {
      setDetails(initialDetails ?? '');
    }
  }, [isOpen, initialDetails]);

  const handleCancel = useCallback(() => {
    setTitle(initialTitle);
    setDetails(initialDetails ?? '');
    setIsOpen(false);
  }, [initialTitle, initialDetails]);

  const handleSave = useCallback(async () => {
    if (!title.trim()) return;

    try {
      setIsSubmitting(true);
      // Optimistically close the dialog immediately
      setIsOpen(false);
      // Then perform the save operation
      await onSave(title.trim(), details);
    } catch (error) {
      console.error('Failed to save goal:', error);

      // Show error toast with retry option
      toast({
        title: 'Failed to save goal',
        description: error instanceof Error ? error.message : 'An unexpected error occurred',
        variant: 'destructive',
        action: (
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              // Try again with the same data
              onSave(title.trim(), details).catch((e) => console.error('Retry failed:', e));
            }}
          >
            Retry
          </Button>
        ),
      });
    } finally {
      setIsSubmitting(false);
    }
  }, [title, details, onSave, toast]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSave();
      }
    },
    [handleSave]
  );

  const handleFormShortcut = useFormSubmitShortcut({
    onSubmit: handleSave,
  });

  const handleOpenChange = useCallback(
    (open: boolean) => {
      if (!open) {
        handleCancel();
      } else {
        setIsOpen(true);
      }
    },
    [handleCancel]
  );

  const defaultTrigger = useMemo(
    () => (
      <Button variant="ghost" size="icon" className="h-6 w-6">
        <Edit2 className="h-4 w-4" />
      </Button>
    ),
    []
  );

  return (
    <Popover open={isOpen} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>{trigger || defaultTrigger}</PopoverTrigger>
      <PopoverContent
        className="w-[400px] max-w-[calc(100vw-32px)] p-4 space-y-4"
        onKeyDown={handleFormShortcut}
      >
        <div className="space-y-2">
          <label htmlFor="title" className="text-sm font-medium text-muted-foreground">
            Title
          </label>
          <Input
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={handleKeyDown}
            className="w-full text-sm"
            placeholder="Enter title..."
          />
        </div>
        <div className="space-y-2">
          <label htmlFor="details" className="text-sm font-medium text-muted-foreground">
            Details
          </label>
          <RichTextEditor
            value={details}
            onChange={setDetails}
            placeholder="Add details..."
            className="min-h-[150px] p-3 rounded-md border"
          />
        </div>
        <div className="flex justify-end space-x-2">
          <Button variant="outline" onClick={handleCancel} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSubmitting || !title.trim()}>
            Save
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
