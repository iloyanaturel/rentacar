import {
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { useAuth } from '@/features/auth';
import { calendarService } from '@/services/calendarService';
import { notificationService } from '@/services/notificationService';
import { maintenanceService } from '@/services/maintenanceService';
import { expenseService } from '@/services/expenseService';
import { vehicleKeys } from '@/features/vehicles/hooks';
import { dashboardKeys } from '@/features/dashboard/hooks';
import type { ExpenseCategory, MaintenanceType } from '@rentaflow/shared';
import type { MaintenanceStatus } from '@/services/maintenanceService';

export const calendarKeys = {
  all: ['calendar'] as const,
  range: (f: object) => [...calendarKeys.all, f] as const,
};

export const notificationKeys = {
  all: ['notifications'] as const,
  list: () => [...notificationKeys.all, 'list'] as const,
  unread: () => [...notificationKeys.all, 'unread'] as const,
  settings: () => [...notificationKeys.all, 'settings'] as const,
};

export const maintenanceKeys = {
  all: ['maintenance'] as const,
  list: (f?: object) => [...maintenanceKeys.all, 'list', f ?? {}] as const,
  vehicle: (id: string) => [...maintenanceKeys.all, 'vehicle', id] as const,
};

export const expenseKeys = {
  all: ['expenses'] as const,
  list: (f?: object) => [...expenseKeys.all, 'list', f ?? {}] as const,
  vehicle: (id: string) => [...expenseKeys.all, 'vehicle', id] as const,
  summary: (id: string) => [...expenseKeys.all, 'summary', id] as const,
};

export function useCalendarRentals(filters: {
  from: string;
  to: string;
  vehicleId?: string;
  status?: string;
  customerQ?: string;
}) {
  const { status } = useAuth();
  return useQuery({
    queryKey: calendarKeys.range(filters),
    enabled: status === 'authenticated' && Boolean(filters.from && filters.to),
    queryFn: () => calendarService.getRentals(filters),
  });
}

export function useNotifications() {
  const { status } = useAuth();
  return useQuery({
    queryKey: notificationKeys.list(),
    enabled: status === 'authenticated',
    queryFn: () => notificationService.getNotifications(),
  });
}

export function useUnreadNotificationCount() {
  const { status } = useAuth();
  return useQuery({
    queryKey: notificationKeys.unread(),
    enabled: status === 'authenticated',
    queryFn: () => notificationService.getUnreadCount(),
    refetchInterval: 60_000,
  });
}

export function useNotificationSettings() {
  const { status } = useAuth();
  return useQuery({
    queryKey: notificationKeys.settings(),
    enabled: status === 'authenticated',
    queryFn: () => notificationService.getSettings(),
  });
}

export function useMarkNotificationsRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (ids?: string[]) =>
      ids?.length
        ? notificationService.markAsRead(ids)
        : notificationService.markAllAsRead(),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: notificationKeys.all });
    },
  });
}

export function useRefreshNotifications() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => notificationService.refreshOperational(),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: notificationKeys.all });
    },
  });
}

export function useUpdateNotificationSettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: notificationService.updateSettings,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: notificationKeys.settings() });
    },
  });
}

export function useMaintenances(filters?: {
  status?: MaintenanceStatus;
  vehicleId?: string;
}) {
  const { status } = useAuth();
  return useQuery({
    queryKey: maintenanceKeys.list(filters),
    enabled: status === 'authenticated',
    queryFn: () => maintenanceService.getMaintenances(filters),
  });
}

export function useCreateMaintenance() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: maintenanceService.createMaintenance,
    onSuccess: (_d, vars) => {
      void qc.invalidateQueries({ queryKey: maintenanceKeys.all });
      void qc.invalidateQueries({ queryKey: expenseKeys.all });
      void qc.invalidateQueries({ queryKey: vehicleKeys.all });
      void qc.invalidateQueries({
        queryKey: maintenanceKeys.vehicle(vars.vehicleId),
      });
      void qc.invalidateQueries({ queryKey: dashboardKeys.all });
    },
  });
}

export function useCompleteMaintenance() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => maintenanceService.completeMaintenance(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: maintenanceKeys.all });
      void qc.invalidateQueries({ queryKey: expenseKeys.all });
      void qc.invalidateQueries({ queryKey: vehicleKeys.all });
      void qc.invalidateQueries({ queryKey: dashboardKeys.all });
    },
  });
}

export function useStartMaintenance() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => maintenanceService.startMaintenance(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: maintenanceKeys.all });
      void qc.invalidateQueries({ queryKey: vehicleKeys.all });
    },
  });
}

export function useExpenses(filters?: {
  vehicleId?: string;
  category?: ExpenseCategory;
  search?: string;
}) {
  const { status } = useAuth();
  return useQuery({
    queryKey: expenseKeys.list(filters),
    enabled: status === 'authenticated',
    queryFn: () => expenseService.getExpenses(filters),
  });
}

export function useVehicleExpenseSummary(vehicleId: string) {
  const { status } = useAuth();
  return useQuery({
    queryKey: expenseKeys.summary(vehicleId),
    enabled: status === 'authenticated' && Boolean(vehicleId),
    queryFn: () => expenseService.getVehicleExpenseSummary(vehicleId),
  });
}

export function useCreateExpense() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: expenseService.createExpense,
    onSuccess: (_d, vars) => {
      void qc.invalidateQueries({ queryKey: expenseKeys.all });
      void qc.invalidateQueries({
        queryKey: expenseKeys.vehicle(vars.vehicleId),
      });
      void qc.invalidateQueries({ queryKey: vehicleKeys.all });
    },
  });
}

export function useDeleteExpense() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => expenseService.softDeleteExpense(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: expenseKeys.all });
    },
  });
}

// re-export types for convenience
export type { MaintenanceType };
