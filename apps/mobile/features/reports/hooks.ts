import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/features/auth';
import { reportService } from '@/services/reportService';

export const reportKeys = {
  all: ['reports'] as const,
  financial: (from: string, to: string) =>
    [...reportKeys.all, 'financial', from, to] as const,
  monthly: () => [...reportKeys.all, 'monthly'] as const,
  vehicles: (from: string, to: string) =>
    [...reportKeys.all, 'vehicles', from, to] as const,
  customers: (from: string, to: string) =>
    [...reportKeys.all, 'customers', from, to] as const,
  rentals: (from: string, to: string) =>
    [...reportKeys.all, 'rentals', from, to] as const,
  payments: (from: string, to: string) =>
    [...reportKeys.all, 'payments', from, to] as const,
  expenses: (from: string, to: string) =>
    [...reportKeys.all, 'expenses', from, to] as const,
  revenue: (from: string, to: string) =>
    [...reportKeys.all, 'revenue', from, to] as const,
  brands: (from: string, to: string) =>
    [...reportKeys.all, 'brands', from, to] as const,
};

export function useFinancialSummary(from: string, to: string) {
  const { status } = useAuth();
  return useQuery({
    queryKey: reportKeys.financial(from, to),
    enabled: status === 'authenticated' && Boolean(from && to),
    queryFn: () => reportService.getFinancialSummary(from, to),
  });
}

export function useMonthlyFinancialReport() {
  const { status } = useAuth();
  return useQuery({
    queryKey: reportKeys.monthly(),
    enabled: status === 'authenticated',
    queryFn: () => reportService.getMonthlyFinancialReport(12),
  });
}

export function useVehiclePerformance(from: string, to: string) {
  const { status } = useAuth();
  return useQuery({
    queryKey: reportKeys.vehicles(from, to),
    enabled: status === 'authenticated',
    queryFn: () => reportService.getVehiclePerformance(from, to),
  });
}

export function useCustomerPerformance(from: string, to: string) {
  const { status } = useAuth();
  return useQuery({
    queryKey: reportKeys.customers(from, to),
    enabled: status === 'authenticated',
    queryFn: () => reportService.getCustomerPerformance(from, to),
  });
}

export function useRentalStatistics(from: string, to: string) {
  const { status } = useAuth();
  return useQuery({
    queryKey: reportKeys.rentals(from, to),
    enabled: status === 'authenticated',
    queryFn: () => reportService.getRentalStatistics(from, to),
  });
}

export function usePaymentMethodReport(from: string, to: string) {
  const { status } = useAuth();
  return useQuery({
    queryKey: reportKeys.payments(from, to),
    enabled: status === 'authenticated',
    queryFn: () => reportService.getPaymentMethodReport(from, to),
  });
}

export function useExpenseBreakdown(from: string, to: string) {
  const { status } = useAuth();
  return useQuery({
    queryKey: reportKeys.expenses(from, to),
    enabled: status === 'authenticated',
    queryFn: () => reportService.getExpenseBreakdown(from, to),
  });
}

export function useRevenueBreakdown(from: string, to: string) {
  const { status } = useAuth();
  return useQuery({
    queryKey: reportKeys.revenue(from, to),
    enabled: status === 'authenticated',
    queryFn: () => reportService.getRevenueBreakdown(from, to),
  });
}

export function useBrandPerformance(from: string, to: string) {
  const { status } = useAuth();
  return useQuery({
    queryKey: reportKeys.brands(from, to),
    enabled: status === 'authenticated',
    queryFn: () => reportService.getBrandPerformance(from, to),
  });
}
