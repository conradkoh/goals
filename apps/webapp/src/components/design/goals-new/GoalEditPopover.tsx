import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { RichTextEditor } from '@/components/ui/rich-text-editor';
import { Edit2 } from 'lucide-react';
import { useState } from 'react';

interface GoalEditPopoverProps {
  title: string;
  details?: string;
  onSave: (title: string, details: string) => Promise<void>;
  trigger?: React.ReactNode;
}

export function GoalEditPopover({
  title: initialTitle,
  details: initialDetails = '',
  onSave,
  trigger,
}: GoalEditPopoverProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [title, setTitle] = useState(initialTitle);
  const [details, setDetails] = useState(initialDetails);
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        {trigger || (
          <Button variant="ghost" size="icon" className="h-6 w-6">
            <Edit2 className="h-4 w-4" />
          </Button>
        )}
      </PopoverTrigger>
      <PopoverContent className="w-[400px] p-4 space-y-4">
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
            onClick={() => setIsOpen(false)}
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
