'use client';

import type { Id } from '@workspace/backend/convex/_generated/dataModel';
import { useState } from 'react';

import { InitiativeSelector } from '@/components/atoms/InitiativeSelector';
import { useInitiatives } from '@/hooks/useInitiatives';
import { useSession } from '@/modules/auth/useSession';

export interface GoalInitiativeFieldProps {
  selectedInitiativeId: Id<'initiatives'> | null;
  onInitiativeChange: (initiativeId: Id<'initiatives'> | null) => Promise<void>;
  disabled?: boolean;
  className?: string;
}

export function GoalInitiativeField({
  selectedInitiativeId,
  onInitiativeChange,
  disabled = false,
  className,
}: GoalInitiativeFieldProps) {
  const { sessionId } = useSession();
  const { initiatives } = useInitiatives(sessionId);
  const [isSaving, setIsSaving] = useState(false);

  const handleChange = async (initiativeId: string | null) => {
    if (disabled || isSaving) return;
    setIsSaving(true);
    try {
      await onInitiativeChange(initiativeId as Id<'initiatives'> | null);
    } catch (error) {
      console.error('Failed to update initiative:', error);
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
      />
    </div>
  );
}
