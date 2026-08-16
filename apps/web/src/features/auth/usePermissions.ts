'use client';

import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/features/auth/AuthProvider';
import {
  hasPermission,
  permissionsForRole,
  type Permission,
} from '@/features/auth/permissions';
import { settingsService } from '@/services/settingsService';

export function usePermissions() {
  const { role, status } = useAuth();

  const query = useQuery({
    queryKey: ['permissions', role],
    enabled: status === 'authenticated',
    queryFn: () => settingsService.getPermissions(),
    staleTime: 60_000,
  });

  const perms = query.data ?? permissionsForRole(role);

  return {
    permissions: perms,
    isLoading: query.isLoading,
    can: (permission: Permission) => hasPermission(perms, permission),
  };
}
