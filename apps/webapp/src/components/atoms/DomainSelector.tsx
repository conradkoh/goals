import type { Doc } from '@services/backend/convex/_generated/dataModel';
import { Plus } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
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

interface DomainSelectorProps {
  domains: Doc<'domains'>[];
  selectedDomainId?: string | null;
  onDomainChange: (domainId: string | null) => void;
  onDomainCreate?: (name: string, description?: string, color?: string) => Promise<void>;
  allowCreate?: boolean;
  placeholder?: string;
  className?: string;
}

export function DomainSelector({
  domains,
  selectedDomainId,
  onDomainChange,
  onDomainCreate,
  allowCreate = true,
  placeholder = 'Select a domain...',
  className,
}: DomainSelectorProps) {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newDomainName, setNewDomainName] = useState('');
  const [newDomainDescription, setNewDomainDescription] = useState('');
  const [newDomainColor, setNewDomainColor] = useState('#3B82F6');

  const handleCreateDomain = async () => {
    if (!newDomainName.trim() || !onDomainCreate) return;

    try {
      await onDomainCreate(newDomainName.trim(), newDomainDescription.trim(), newDomainColor);
      setNewDomainName('');
      setNewDomainDescription('');
      setNewDomainColor('#3B82F6');
      setIsCreateDialogOpen(false);
    } catch (error) {
      console.error('Failed to create domain:', error);
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
                    style={{ backgroundColor: domain.color || '#3B82F6' }}
                  />
                  <span className="truncate">{domain.name}</span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

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
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Domain</DialogTitle>
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
              />
            </div>
            <div>
              <Label htmlFor="domain-color">Color</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="domain-color"
                  type="color"
                  value={newDomainColor}
                  onChange={(e) => setNewDomainColor(e.target.value)}
                  className="w-16 h-10"
                />
                <Input
                  value={newDomainColor}
                  onChange={(e) => setNewDomainColor(e.target.value)}
                  placeholder="#3B82F6"
                  className="flex-1"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreateDomain} disabled={!newDomainName.trim()}>
                Create Domain
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
