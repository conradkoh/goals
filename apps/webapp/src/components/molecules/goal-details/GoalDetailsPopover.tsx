import { GoalEditPopover } from '@/components/atoms/GoalEditPopover';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { Edit2 } from 'lucide-react';
import React, { ReactNode } from 'react';
import { GoalDetailsContent } from './GoalDetailsContent';

interface GoalDetailsPopoverProps {
  title: string;
  details?: string;
  onSave: (title: string, details?: string) => Promise<void>;
  triggerClassName?: string;
  buttonVariant?: 'default' | 'ghost' | 'outline';
  titleClassName?: string;
  additionalContent?: ReactNode;
}

export const GoalDetailsPopover: React.FC<GoalDetailsPopoverProps> = ({
  title,
  details,
  onSave,
  triggerClassName = 'p-0 h-auto hover:bg-transparent font-normal justify-start text-left flex-1 focus-visible:ring-0 min-w-0 w-full mb-1',
  buttonVariant = 'ghost',
  titleClassName = 'text-gray-600',
  additionalContent,
}) => {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant={buttonVariant} className={triggerClassName}>
          <span
            className={cn(
              'break-words w-full whitespace-pre-wrap',
              titleClassName
            )}
          >
            {title}
          </span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[450px] max-w-[calc(100vw-32px)] p-5">
        <div className="space-y-5">
          <div className="flex items-start justify-between gap-3">
            <h3 className="font-semibold text-lg break-words flex-1">
              {title}
            </h3>
            <GoalEditPopover
              title={title}
              details={details}
              onSave={onSave}
              trigger={
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 px-3 text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
                >
                  <Edit2 className="h-3.5 w-3.5" />
                  <span>Edit</span>
                </Button>
              }
            />
          </div>

          {details && (
            <>
              <Separator className="my-1" />
              <div className="pt-1">
                <GoalDetailsContent title={title} details={details} />
              </div>
            </>
          )}

          {additionalContent && (
            <>
              {details && <Separator className="my-1" />}
              <div className="pt-1">{additionalContent}</div>
            </>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
};
