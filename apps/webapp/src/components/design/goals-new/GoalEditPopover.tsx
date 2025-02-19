import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { RichTextEditor } from '@/components/ui/rich-text-editor';
import { useFormSubmitShortcut } from '@/hooks/useFormSubmitShortcut';
import { Edit2 } from 'lucide-react';
import { useState, useEffect } from 'react';

interface GoalEditPopoverProps {
  title: string;
  details?: string;
  onSave: (title: string, details: string) => Promise<void>;
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

  const handleCancel = () => {
    setTitle(initialTitle);
    setDetails(initialDetails ?? '');
    setIsOpen(false);
  };

  const handleSave = async () => {
    if (!title.trim()) return;

    try {
      setIsSubmitting(true);
      await onSave(title.trim(), details);
      setIsOpen(false);
    } catch (error) {
      console.error('Failed to save goal:', error);
      // TODO: Add proper error handling UI
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSave();
    }
  };

  const handleFormShortcut = useFormSubmitShortcut({
    onSubmit: handleSave,
  });

  return (
    <Popover
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) {
          handleCancel();
        } else {
          setIsOpen(true);
        }
      }}
    >
      <PopoverTrigger asChild>
        {trigger || (
          <Button variant="ghost" size="icon" className="h-6 w-6">
            <Edit2 className="h-4 w-4" />
          </Button>
        )}
      </PopoverTrigger>
      <PopoverContent
        className="w-[400px] p-4 space-y-4"
        onKeyDown={handleFormShortcut}
      >
        <div className="space-y-2">
          <label
            htmlFor="title"
            className="text-sm font-medium text-muted-foreground"
          >
            Title
          </label>
          <Input
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={handleKeyDown}
            className="w-full"
            placeholder="Enter title..."
          />
        </div>
        <div className="space-y-2">
          <label
            htmlFor="details"
            className="text-sm font-medium text-muted-foreground"
          >
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
          <Button
            variant="outline"
            onClick={handleCancel}
            disabled={isSubmitting}
          >
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
