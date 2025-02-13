import { Trash2 } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { parseConvexError, errorTitles } from '@/lib/error';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

interface DeleteGoalIconButtonProps {
  onDelete: () => Promise<void>;
}

export const DeleteGoalIconButton = ({
  onDelete,
}: DeleteGoalIconButtonProps) => {
  const { toast } = useToast();

  const handleDelete = async () => {
    try {
      await onDelete();
    } catch (error) {
      console.error('Failed to delete goal:', error);
      const errorData = parseConvexError(error);
      toast({
        variant: 'destructive',
        title: errorTitles[errorData.code],
        description: errorData.message,
      });
    }
  };

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <button className="text-muted-foreground opacity-0 group-hover/title:opacity-100 transition-opacity hover:text-red-600">
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Goal</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete this goal? This action cannot be
            undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
          >
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
