'use client';

import { api } from '@workspace/backend/convex/_generated/api';
import type { Id } from '@workspace/backend/convex/_generated/dataModel';
import { ConvexError } from 'convex/values';
import { useSessionMutation, useSessionQuery } from 'convex-helpers/react/sessions';
import { Users } from 'lucide-react';
import { useCallback, useState } from 'react';
import { toast } from 'sonner';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';

type EffectiveRole = 'standard_user' | 'system_admin';

const ROLE_LABELS: Record<EffectiveRole, string> = {
  standard_user: 'Standard User',
  system_admin: 'System Administrator',
};

const TYPE_LABELS: Record<'full' | 'anonymous', string> = {
  full: 'Full',
  anonymous: 'Anonymous',
};

function getConvexErrorMessage(error: { data: unknown }): string {
  const data = error.data as { message?: string } | null;
  if (data && typeof data.message === 'string') {
    return data.message;
  }
  return 'Failed to update role';
}

function getErrorMessage(error: unknown): string {
  if (error instanceof ConvexError) {
    return getConvexErrorMessage(error);
  }
  return error instanceof Error ? error.message : 'Failed to update role';
}

export default function UserRolesPage() {
  const users = useSessionQuery(api.system.users.listUsers);
  const updateRoles = useSessionMutation(api.system.users.updateUserRoles);
  const [savingUserId, setSavingUserId] = useState<Id<'users'> | null>(null);

  const handleRoleChange = useCallback(
    async (userId: Id<'users'>, effectiveRole: EffectiveRole) => {
      setSavingUserId(userId);
      try {
        await updateRoles({ userId, effectiveRole });
        toast.success('User role updated');
      } catch (error) {
        toast.error(getErrorMessage(error));
      } finally {
        setSavingUserId(null);
      }
    },
    [updateRoles]
  );

  const isLoading = users === undefined;

  return (
    <div className="pt-6 space-y-4 md:space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl md:text-3xl font-bold">User Roles</h1>
        <p className="text-sm md:text-base text-muted-foreground">
          View and assign roles for all users
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            All Users
          </CardTitle>
          <CardDescription>
            Assign an effective role. Changes apply on the user&apos;s next session refresh.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : users.length === 0 ? (
            <p className="text-sm text-muted-foreground">No users found.</p>
          ) : (
            <div className="space-y-3">
              {users.map((user) => (
                <div
                  key={user._id}
                  className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 rounded-lg border p-3"
                >
                  <div className="min-w-0 space-y-1">
                    <p className="font-medium truncate">{user.name}</p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      {user.email && <span className="truncate">{user.email}</span>}
                      <Badge variant="outline">{TYPE_LABELS[user.type]}</Badge>
                    </div>
                  </div>
                  <Select
                    value={user.effectiveRole}
                    onValueChange={(value) => handleRoleChange(user._id, value as EffectiveRole)}
                    disabled={savingUserId === user._id}
                  >
                    <SelectTrigger className="w-full sm:w-[200px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {(Object.keys(ROLE_LABELS) as EffectiveRole[]).map((role) => (
                        <SelectItem key={role} value={role}>
                          {ROLE_LABELS[role]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
