import { useQuery } from '@tanstack/react-query';
import { dashboardService } from '@/services/dashboardService';
import { useAuth } from '@/features/auth';

export const dashboardKeys = {
  all: ['dashboard'] as const,
  summary: () => [...dashboardKeys.all, 'summary'] as const,
  todayReturns: () => [...dashboardKeys.all, 'today-returns'] as const,
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

export function useUpcomingRentals() {
  const { status } = useAuth();
  return useQuery({
    queryKey: dashboardKeys.upcoming(),
    queryFn: () => dashboardService.getUpcomingRentals(7),
    enabled: status === 'authenticated',
  });
}
