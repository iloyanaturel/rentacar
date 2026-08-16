import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { useAuth } from '@/features/auth';
import {
  customersService,
  type CustomerFilter,
} from '@/services/customersService';
import { dashboardKeys } from '@/features/dashboard/hooks';
import { vehicleKeys } from '@/features/vehicles/hooks';
import type { Customer } from '@rentaflow/shared';

export const customerKeys = {
  all: ['customers'] as const,
  lists: () => [...customerKeys.all, 'list'] as const,
  list: (f: { search?: string; filter?: CustomerFilter }) =>
    [...customerKeys.lists(), f] as const,
  detail: (id: string) => [...customerKeys.all, 'detail', id] as const,
  stats: (id: string) => [...customerKeys.all, 'stats', id] as const,
  rentals: (id: string) => [...customerKeys.all, 'rentals', id] as const,
};

function invalidateCustomers(qc: ReturnType<typeof useQueryClient>, id?: string) {
  void qc.invalidateQueries({ queryKey: customerKeys.all });
  void qc.invalidateQueries({ queryKey: dashboardKeys.all });
  if (id) {
    void qc.invalidateQueries({ queryKey: customerKeys.detail(id) });
  }
}

export function useCustomers(filters: {
  search?: string;
  filter?: CustomerFilter;
}) {
  const { status } = useAuth();
  return useInfiniteQuery({
    queryKey: customerKeys.list(filters),
    enabled: status === 'authenticated',
    initialPageParam: 0,
    queryFn: ({ pageParam }) =>
      customersService.getCustomers({ ...filters, page: pageParam }),
    getNextPageParam: (last) => (last.hasMore ? last.page + 1 : undefined),
  });
}

export function useCustomer(id: string) {
  const { status } = useAuth();
  return useQuery({
    queryKey: customerKeys.detail(id),
    queryFn: () => customersService.getCustomer(id),
    enabled: status === 'authenticated' && Boolean(id),
  });
}

export function useCustomerStats(id: string) {
  const { status } = useAuth();
  return useQuery({
    queryKey: customerKeys.stats(id),
    queryFn: () => customersService.getCustomerStats(id),
    enabled: status === 'authenticated' && Boolean(id),
  });
}

export function useCustomerRentals(id: string) {
  const { status } = useAuth();
  return useQuery({
    queryKey: customerKeys.rentals(id),
    queryFn: () => customersService.getCustomerRentals(id),
    enabled: status === 'authenticated' && Boolean(id),
  });
}

export function useCreateCustomer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: customersService.createCustomer,
    onSuccess: () => invalidateCustomers(qc),
  });
}

export function useUpdateCustomer(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: Partial<Customer>) =>
      customersService.updateCustomer(id, input),
    onSuccess: () => invalidateCustomers(qc, id),
  });
}

export function useArchiveCustomer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => customersService.archiveCustomer(id),
    onSuccess: (_d, id) => {
      invalidateCustomers(qc, id);
      void qc.invalidateQueries({ queryKey: vehicleKeys.all });
    },
  });
}
