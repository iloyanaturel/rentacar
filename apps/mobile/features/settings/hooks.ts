import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/features/auth';
import {
  hasPermission,
  permissionsForRole,
  type Permission,
} from '@/features/auth/permissions';
import { settingsService } from '@/services/settingsService';
import type { UserRole } from '@rentaflow/shared';

export const settingsKeys = {
  all: ['settings'] as const,
  org: () => [...settingsKeys.all, 'org'] as const,
  users: () => [...settingsKeys.all, 'users'] as const,
  onboarding: () => [...settingsKeys.all, 'onboarding'] as const,
  permissions: () => [...settingsKeys.all, 'permissions'] as const,
};

export function useOrganizationSettings() {
  const { status } = useAuth();
  return useQuery({
    queryKey: settingsKeys.org(),
    enabled: status === 'authenticated',
    queryFn: () => settingsService.getSettings(),
  });
}

export function useUpdateOrganizationSettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (patch: Record<string, unknown>) =>
      settingsService.updateSettings(patch),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: settingsKeys.all });
    },
  });
}

export function useUpdateBusinessProfile() {
  const qc = useQueryClient();
  const { refreshProfile } = useAuth();
  return useMutation({
    mutationFn: (patch: Record<string, unknown>) =>
      settingsService.updateBusinessProfile(patch),
    onSuccess: async () => {
      await refreshProfile();
      void qc.invalidateQueries({ queryKey: settingsKeys.all });
    },
  });
}

export function useOrgUsers() {
  const { status } = useAuth();
  const { can } = usePermissions();
  return useQuery({
    queryKey: settingsKeys.users(),
    enabled: status === 'authenticated' && can('users.view'),
    queryFn: () => settingsService.listUsers(),
  });
}

export function useOnboardingStatus() {
  const { status } = useAuth();
  return useQuery({
    queryKey: settingsKeys.onboarding(),
    enabled: status === 'authenticated',
    queryFn: () => settingsService.getOnboardingStatus(),
  });
}

export function usePermissions() {
  const { status, role } = useAuth();
  const query = useQuery({
    queryKey: settingsKeys.permissions(),
    enabled: status === 'authenticated',
    queryFn: () => settingsService.getPermissions(),
    staleTime: 60_000,
  });

  const perms = query.data ?? permissionsForRole(role);

  return {
    ...query,
    permissions: perms,
    can: (permission: Permission) => hasPermission(perms, permission),
  };
}

export function useInviteUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { email: string; fullName: string; role: UserRole }) =>
      settingsService.inviteUser(input),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: settingsKeys.users() });
      void qc.invalidateQueries({ queryKey: settingsKeys.onboarding() });
    },
  });
}

export function useSetUserStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { userId: string; status: 'ACTIVE' | 'SUSPENDED' }) =>
      settingsService.setUserStatus(input.userId, input.status),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: settingsKeys.users() });
    },
  });
}

export function useSetUserRole() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { userId: string; role: UserRole }) =>
      settingsService.setUserRole(input.userId, input.role),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: settingsKeys.users() });
    },
  });
}

export function useUpdateProfile() {
  const { refreshProfile } = useAuth();
  return useMutation({
    mutationFn: (patch: {
      full_name?: string;
      phone?: string | null;
      avatar_url?: string | null;
    }) => settingsService.updateProfile(patch),
    onSuccess: async () => {
      await refreshProfile();
    },
  });
}

export function useChangePassword() {
  return useMutation({
    mutationFn: (input: { currentPassword: string; newPassword: string }) =>
      settingsService.changePassword(input.currentPassword, input.newPassword),
  });
}

export function useUploadLogo() {
  const updateBusiness = useUpdateBusinessProfile();
  return useMutation({
    mutationFn: async (localUri: string) => {
      const url = await settingsService.uploadLogo(localUri);
      await updateBusiness.mutateAsync({ logo_url: url });
      return url;
    },
  });
}
