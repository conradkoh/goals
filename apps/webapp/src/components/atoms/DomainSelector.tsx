import type { Doc, Id } from '@services/backend/convex/_generated/dataModel';
import { Edit2, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

// Apple-inspired color palette with sufficient contrast
const COLOR_PRESETS = [
  { name: 'Red', value: '#FF3B30', light: '#FF453A', dark: '#FF453A' },
  { name: 'Orange', value: '#FF9500', light: '#FF9F0A', dark: '#FF9F0A' },
  { name: 'Yellow', value: '#FFCC00', light: '#FFD60A', dark: '#FFD60A' },
  { name: 'Green', value: '#34C759', light: '#30D158', dark: '#30D158' },
  { name: 'Mint', value: '#00C7BE', light: '#63E6E2', dark: '#63E6E2' },
  { name: 'Teal', value: '#30B0C7', light: '#40CBE0', dark: '#40CBE0' },
  { name: 'Cyan', value: '#32ADE6', light: '#64D2FF', dark: '#64D2FF' },
  { name: 'Blue', value: '#007AFF', light: '#0A84FF', dark: '#0A84FF' },
  { name: 'Indigo', value: '#5856D6', light: '#5E5CE6', dark: '#5E5CE6' },
  { name: 'Purple', value: '#AF52DE', light: '#BF5AF2', dark: '#BF5AF2' },
  { name: 'Pink', value: '#FF2D55', light: '#FF375F', dark: '#FF375F' },
  { name: 'Brown', value: '#A2845E', light: '#AC8E68', dark: '#AC8E68' },
  { name: 'Gray', value: '#8E8E93', light: '#98989D', dark: '#98989D' },
];

interface DomainSelectorProps {
  domains: Doc<'domains'>[];
  selectedDomainId?: string | null;
  onDomainChange: (domainId: string | null) => void;
  onDomainCreate?: (name: string, description?: string, color?: string) => Promise<Id<'domains'>>;
  onDomainUpdate?: (
    domainId: Id<'domains'>,
    name: string,
    description?: string,
    color?: string
  ) => Promise<void>;
  onDomainDelete?: (domainId: Id<'domains'>) => Promise<void>;
  allowCreate?: boolean;
  allowEdit?: boolean;
  placeholder?: string;
  className?: string;
}

export function DomainSelector({
  domains,
  selectedDomainId,
  onDomainChange,
  onDomainCreate,
  onDomainUpdate,
  onDomainDelete,
  allowCreate = true,
  allowEdit = true,
  placeholder = 'Select a domain...',
  className,
}: DomainSelectorProps) {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [newDomainName, setNewDomainName] = useState('');
  const [newDomainDescription, setNewDomainDescription] = useState('');
  const [newDomainColor, setNewDomainColor] = useState(COLOR_PRESETS[7].value); // Default to Blue
  const [editingDomain, setEditingDomain] = useState<Doc<'domains'> | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const selectedDomain = domains.find((d) => d._id === selectedDomainId);

  const handleCreateDomain = async () => {
    if (!newDomainName.trim() || !onDomainCreate) return;

    try {
      const newDomainId = await onDomainCreate(
        newDomainName.trim(),
        newDomainDescription.trim(),
        newDomainColor
      );
      onDomainChange(newDomainId);
      setNewDomainName('');
      setNewDomainDescription('');
      setNewDomainColor(COLOR_PRESETS[7].value);
      setIsCreateDialogOpen(false);
    } catch (error) {
      console.error('Failed to create domain:', error);
    }
  };

  const handleEditClick = () => {
    if (selectedDomain) {
      setEditingDomain(selectedDomain);
      setDeleteError(null);
      setIsEditDialogOpen(true);
    }
  };

  const handleUpdateDomain = async () => {
    if (!editingDomain || !editingDomain.name.trim() || !onDomainUpdate) return;

    try {
      await onDomainUpdate(
        editingDomain._id,
        editingDomain.name.trim(),
        editingDomain.description?.trim(),
        editingDomain.color
      );
      setIsEditDialogOpen(false);
      setEditingDomain(null);
    } catch (error) {
      console.error('Failed to update domain:', error);
    }
  };

  const handleDeleteDomain = async () => {
    if (!editingDomain || !onDomainDelete) return;

    try {
      await onDomainDelete(editingDomain._id);
      onDomainChange(null); // Reset selection
      setIsEditDialogOpen(false);
      setEditingDomain(null);
    } catch (error) {
      console.error('Failed to delete domain:', error);
      setDeleteError(
        error instanceof Error ? error.message : 'Failed to delete domain. Please try again.'
      );
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <Select
          value={selectedDomainId || '__none__'}
          onValueChange={(value) => onDomainChange(value === '__none__' ? null : value)}
        >
          <SelectTrigger className={className}>
            <SelectValue placeholder={placeholder} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__none__" className="text-muted-foreground">
              Uncategorized
            </SelectItem>
            {domains.map((domain) => (
              <SelectItem key={domain._id} value={domain._id}>
                <div className="flex items-center gap-2">
                  <div
                    className="w-2 h-2 rounded-full flex-shrink-0"
                    style={{ backgroundColor: domain.color || COLOR_PRESETS[7].value }}
                  />
                  <span className="truncate">{domain.name}</span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {allowEdit && selectedDomain && onDomainUpdate && onDomainDelete && (
          <Button
            variant="outline"
            size="icon"
            onClick={handleEditClick}
            className="flex-shrink-0"
            title="Edit domain"
          >
            <Edit2 className="h-4 w-4" />
          </Button>
        )}

        {allowCreate && onDomainCreate && (
          <Button
            variant="outline"
            size="icon"
            onClick={() => setIsCreateDialogOpen(true)}
            className="flex-shrink-0"
            title="Create new domain"
          >
            <Plus className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Create Domain Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent
          onKeyDown={(e) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'Enter' && newDomainName.trim()) {
              e.preventDefault();
              handleCreateDomain();
            }
          }}
        >
          <DialogHeader>
            <DialogTitle>Create New Domain</DialogTitle>
            <DialogDescription>
              Domains help you group adhoc tasks into meaningful buckets (e.g. Home, Health, Work).
              You can always rename or recolor them later.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="domain-name">Name</Label>
              <Input
                id="domain-name"
                value={newDomainName}
                onChange={(e) => setNewDomainName(e.target.value)}
                placeholder="e.g., Home Maintenance"
                autoFocus
              />
            </div>
            <div>
              <Label htmlFor="domain-description">Description (optional)</Label>
              <Textarea
                id="domain-description"
                value={newDomainDescription}
                onChange={(e) => setNewDomainDescription(e.target.value)}
                placeholder="Tasks related to home upkeep"
                rows={2}
              />
            </div>
            <div className="space-y-2">
              <Label>Color</Label>
              <div className="grid grid-cols-7 gap-2 mt-2">
                {COLOR_PRESETS.map((preset) => (
                  <button
                    key={preset.value}
                    type="button"
                    onClick={() => setNewDomainColor(preset.value)}
                    className={cn(
                      'w-9 h-9 rounded-full border border-border/40 bg-background/90 shadow-sm transition-all hover:scale-110',
                      newDomainColor === preset.value && 'ring-2 ring-offset-2 ring-foreground'
                    )}
                    style={{ backgroundColor: preset.value }}
                    title={preset.name}
                  />
                ))}
              </div>
              <div className="flex items-center gap-2 mt-3">
                <Input
                  type="color"
                  value={newDomainColor}
                  onChange={(e) => setNewDomainColor(e.target.value)}
                  className="h-10 w-12 rounded-md border border-border bg-background shadow-sm cursor-pointer p-1 [appearance-none]"
                />
                <Input
                  value={newDomainColor}
                  onChange={(e) => setNewDomainColor(e.target.value)}
                  placeholder="#007AFF"
                  className="flex-1"
                />
              </div>
            </div>
            <DialogFooter className="mt-2">
              <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreateDomain} disabled={!newDomainName.trim()}>
                Create Domain
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Domain Dialog */}
      {editingDomain && (
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent
            onKeyDown={(e) => {
              if ((e.metaKey || e.ctrlKey) && e.key === 'Enter' && editingDomain.name.trim()) {
                e.preventDefault();
                handleUpdateDomain();
              }
            }}
          >
            <DialogHeader>
              <DialogTitle>Edit Domain</DialogTitle>
              <DialogDescription>
                Update how this domain appears on adhoc tasks. Changes apply everywhere this domain
                is used.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              {/* Live preview */}
              <div className="flex items-center justify-between rounded-md border bg-muted/40 px-3 py-2">
                <div className="flex items-center gap-2">
                  <div
                    className="h-3 w-3 rounded-full"
                    style={{
                      backgroundColor: editingDomain.color || COLOR_PRESETS[7].value,
                    }}
                  />
                  <span className="text-sm font-medium">{editingDomain.name || 'Domain name'}</span>
                </div>
                <span className="hidden text-xs text-muted-foreground sm:inline">
                  Shown as a pill on adhoc tasks for quick scanning.
                </span>
              </div>

              <div>
                <Label htmlFor="edit-domain-name">Name</Label>
                <Input
                  id="edit-domain-name"
                  value={editingDomain.name}
                  onChange={(e) => setEditingDomain({ ...editingDomain, name: e.target.value })}
                  placeholder="e.g., Home Maintenance"
                  autoFocus
                />
              </div>
              <div>
                <Label htmlFor="edit-domain-description">Description (optional)</Label>
                <Textarea
                  id="edit-domain-description"
                  value={editingDomain.description || ''}
                  onChange={(e) =>
                    setEditingDomain({ ...editingDomain, description: e.target.value })
                  }
                  placeholder="Tasks related to home upkeep"
                  rows={2}
                />
              </div>
              <div>
                <Label>Color</Label>
                <div className="grid grid-cols-7 gap-2 mt-2">
                  {COLOR_PRESETS.map((preset) => (
                    <button
                      key={preset.value}
                      type="button"
                      onClick={() => setEditingDomain({ ...editingDomain, color: preset.value })}
                      className={cn(
                        'w-9 h-9 rounded-full border border-border/40 bg-background/90 shadow-sm transition-all hover:scale-110',
                        editingDomain.color === preset.value &&
                          'ring-2 ring-offset-2 ring-foreground'
                      )}
                      style={{ backgroundColor: preset.value }}
                      title={preset.name}
                    />
                  ))}
                </div>
                <div className="flex items-center gap-2 mt-3">
                  <Input
                    type="color"
                    value={editingDomain.color || COLOR_PRESETS[7].value}
                    onChange={(e) => setEditingDomain({ ...editingDomain, color: e.target.value })}
                    className="h-10 w-12 rounded-md border border-border bg-background shadow-sm cursor-pointer p-1 [appearance-none]"
                  />
                  <Input
                    value={editingDomain.color || ''}
                    onChange={(e) => setEditingDomain({ ...editingDomain, color: e.target.value })}
                    placeholder="#007AFF"
                    className="flex-1"
                  />
                </div>
              </div>
              {deleteError && <p className="text-xs text-destructive pt-1">{deleteError}</p>}
              <DialogFooter className="mt-2 flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:justify-between">
                <Button
                  variant="outline"
                  onClick={handleDeleteDomain}
                  className="gap-2 justify-center sm:justify-start border-destructive text-destructive bg-background hover:bg-destructive hover:text-destructive-foreground hover:border-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                  Delete Domain
                </Button>
                <div className="flex gap-2 sm:justify-end">
                  <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleUpdateDomain} disabled={!editingDomain.name.trim()}>
                    Save Changes
                  </Button>
                </div>
              </DialogFooter>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
