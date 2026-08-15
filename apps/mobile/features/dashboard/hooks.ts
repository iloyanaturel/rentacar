import { useQuery } from '@tanstack/react-query';
import { dashboardService } from '@/services/dashboardService';
import { useAuth } from '@/features/auth';

export const dashboardKeys = {
  all: ['dashboard'] as const,
  summary: () => [...dashboardKeys.all, 'summary'] as const,
  todayReturns: () => [...dashboardKeys.all, 'today-returns'] as const,
  todayHandovers: () => [...dashboardKeys.all, 'today-handovers'] as const,
  outstanding: () => [...dashboardKeys.all, 'outstanding'] as const,
  overdue: () => [...dashboardKeys.all, 'overdue'] as const,
  upcoming: () => [...dashboardKeys.all, 'upcoming'] as const,
};

export function useDashboardStats() {
  const { status } = useAuth();
  return useQuery({
    queryKey: dashboardKeys.summary(),
    queryFn: () => dashboardService.getDashboardStats(),
    enabled: status === 'authenticated',
  });
}

export function useTodayReturns() {
  const { status } = useAuth();
  return useQuery({
    queryKey: dashboardKeys.todayReturns(),
    queryFn: () => dashboardService.getTodayReturns(),
    enabled: status === 'authenticated',
  });
}

export function useTodayHandovers() {
  const { status } = useAuth();
  return useQuery({
    queryKey: dashboardKeys.todayHandovers(),
    queryFn: () => dashboardService.getTodayHandovers(),
    enabled: status === 'authenticated',
  });
}

export function useOutstandingPayments() {
  const { status } = useAuth();
  return useQuery({
    queryKey: dashboardKeys.outstanding(),
    queryFn: () => dashboardService.getOutstandingPayments(),
    enabled: status === 'authenticated',
  });
}

export function useOverdueRentals() {
  const { status } = useAuth();
  return useQuery({
    queryKey: dashboardKeys.overdue(),
    queryFn: () => dashboardService.getOverdueRentals(),
    enabled: status === 'authenticated',
  });
}

export function useUpcomingRentals() {
  const { status } = useAuth();
  return useQuery({
    queryKey: dashboardKeys.upcoming(),
    queryFn: () => dashboardService.getUpcomingRentals(7),
    enabled: status === 'authenticated',
  });
}
