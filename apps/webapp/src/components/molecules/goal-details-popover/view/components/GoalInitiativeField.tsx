'use client';

import type { Id } from '@workspace/backend/convex/_generated/dataModel';
import { useState } from 'react';

import { InitiativeSelector } from '@/components/atoms/InitiativeSelector';
import { toast } from '@/components/ui/use-toast';
import { useInitiatives } from '@/hooks/useInitiatives';
import { useSession } from '@/modules/auth/useSession';

export interface GoalInitiativeFieldProps {
  selectedInitiativeId: Id<'initiatives'> | null;
  onInitiativeChange: (initiativeId: Id<'initiatives'> | null) => Promise<void>;
  disabled?: boolean;
  className?: string;
  /** Hide selector help text for compact layouts. */
  compact?: boolean;
}

export function GoalInitiativeField({
  selectedInitiativeId,
  onInitiativeChange,
  disabled = false,
  className,
  compact = true,
}: GoalInitiativeFieldProps) {
  const { sessionId } = useSession();
  const { initiatives } = useInitiatives(sessionId);
  const [isSaving, setIsSaving] = useState(false);

  // fallow-ignore-next-line complexity
  const handleChange = async (initiativeId: string | null) => {
    if (disabled || isSaving) return;
    if (initiativeId === selectedInitiativeId) return;

    setIsSaving(true);
    try {
      await onInitiativeChange(initiativeId as Id<'initiatives'> | null);
      const initiative = initiatives.find((item) => item._id === initiativeId);
      toast({
        title: initiativeId ? 'Initiative updated' : 'Initiative removed',
        description: initiativeId
          ? `Tagged to "${initiative?.title ?? 'initiative'}".`
          : 'Goal is no longer linked to an initiative.',
      });
    } catch (error) {
      console.error('Failed to update initiative:', error);
      toast({
        variant: 'destructive',
        title: 'Could not update initiative',
        description: 'Please try again.',
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className={className}>
      {/* biome-ignore lint/a11y/noLabelWithoutControl: Label associated with InitiativeSelector */}
      <label className="text-sm font-medium">Initiative</label>
      <InitiativeSelector
        initiatives={initiatives}
        selectedInitiativeId={selectedInitiativeId}
        onInitiativeChange={handleChange}
        placeholder="Tag to an initiative..."
        className="w-full"
        disabled={disabled || isSaving}
        compact={compact}
      />
    </div>
  );
}
