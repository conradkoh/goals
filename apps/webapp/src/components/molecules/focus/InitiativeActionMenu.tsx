'use client';

import type { Doc } from '@workspace/backend/convex/_generated/dataModel';
import { ConvexError } from 'convex/values';
import { CalendarDays, Edit2, MoreVertical, X } from 'lucide-react';
import { DateTime } from 'luxon';
import { useState } from 'react';

import { DatePicker } from '@/components/DatePicker';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from '@/components/ui/use-toast';
import { normalizeInitiativeDates } from '@/lib/date/initiative-dates';
import { cn } from '@/lib/utils';

// fallow-ignore-next-line complexity
function getInitiativeErrorDetails(error: unknown): { message?: string } {
  if (error instanceof ConvexError) {
    const data = error.data;
    if (
      typeof data === 'object' &&
      data !== null &&
      'message' in data &&
      typeof data.message === 'string'
    ) {
      return { message: data.message };
    }
  }
  if (error instanceof Error) return { message: error.message };
  return {};
}

export interface InitiativeActionMenuProps {
  initiative: Doc<'initiatives'>;
  onEdit: () => void;
  onEndDateChange: (endDate: number | null) => Promise<void>;
  className?: string;
}

// fallow-ignore-next-line complexity
export function InitiativeActionMenu({
  initiative,
  onEdit,
  onEndDateChange,
  className,
}: InitiativeActionMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [showEndDateDialog, setShowEndDateDialog] = useState(false);
  const [pendingEndDate, setPendingEndDate] = useState<Date | undefined>(undefined);
  const [isSavingEndDate, setIsSavingEndDate] = useState(false);

  const startDateJs = DateTime.fromMillis(initiative.startDate).toJSDate();

  const handleEdit = () => {
    setIsOpen(false);
    onEdit();
  };

  const openEndDateDialog = () => {
    setPendingEndDate(
      initiative.endDate ? DateTime.fromMillis(initiative.endDate).toJSDate() : undefined
    );
    setShowEndDateDialog(true);
  };

  const handleEndDateError = (error: unknown) => {
    console.error('Failed to update initiative end date:', error);
    toast({
      variant: 'destructive',
      title: 'Could not update end date',
      description: getInitiativeErrorDetails(error).message ?? 'Please try again.',
    });
  };

  // fallow-ignore-next-line complexity
  const handleSaveEndDate = async () => {
    if (!pendingEndDate || isSavingEndDate) return;

    const { endDate: normalizedEnd } = normalizeInitiativeDates(startDateJs, pendingEndDate);
    if (normalizedEnd === undefined) return;

    setIsSavingEndDate(true);
    try {
      await onEndDateChange(normalizedEnd);
      setShowEndDateDialog(false);
    } catch (error) {
      handleEndDateError(error);
    } finally {
      setIsSavingEndDate(false);
    }
  };

  const handleRemoveEndDate = async () => {
    setIsOpen(false);
    try {
      await onEndDateChange(null);
    } catch (error) {
      handleEndDateError(error);
    }
  };

  return (
    <>
      <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
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
              handleEdit();
            }}
            className="flex items-center"
          >
            <Edit2 className="mr-2 h-4 w-4" />
            <span>Edit</span>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onSelect={(e) => {
              e.preventDefault();
              setIsOpen(false);
              openEndDateDialog();
            }}
            className="flex items-center"
          >
            <CalendarDays className="mr-2 h-4 w-4" />
            <span>{initiative.endDate ? 'Change end date' : 'Set end date'}</span>
          </DropdownMenuItem>
          {initiative.endDate !== undefined && (
            <DropdownMenuItem
              onSelect={(e) => {
                e.preventDefault();
                void handleRemoveEndDate();
              }}
              className="flex items-center"
            >
              <X className="mr-2 h-4 w-4" />
              <span>Remove end date</span>
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={showEndDateDialog} onOpenChange={setShowEndDateDialog}>
        <DialogContent className="sm:max-w-[360px]">
          <DialogHeader>
            <DialogTitle>{initiative.endDate ? 'Change end date' : 'Set end date'}</DialogTitle>
          </DialogHeader>
          <DatePicker
            value={pendingEndDate}
            onChange={setPendingEndDate}
            allowFutureDates
            minDate={startDateJs}
            placeholder="Select end date"
          />
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowEndDateDialog(false)}
              disabled={isSavingEndDate}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={() => void handleSaveEndDate()}
              disabled={!pendingEndDate || isSavingEndDate}
            >
              {isSavingEndDate ? 'Saving...' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
