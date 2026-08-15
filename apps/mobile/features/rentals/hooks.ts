import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { useAuth } from '@/features/auth';
import {
  rentalsService,
  type CreateRentalInput,
  type RentalDateFilter,
  type RentalPaymentFilter,
  type UpdateReservedRentalInput,
} from '@/services/rentalsService';
import { dashboardKeys } from '@/features/dashboard/hooks';
import { vehicleKeys } from '@/features/vehicles/hooks';
import { customerKeys } from '@/features/customers/hooks';
import type { RentalPhotoType, RentalStatus } from '@rentaflow/shared';

export const rentalKeys = {
  all: ['rentals'] as const,
  lists: () => [...rentalKeys.all, 'list'] as const,
  list: (f: object) => [...rentalKeys.lists(), f] as const,
  detail: (id: string) => [...rentalKeys.all, 'detail', id] as const,
  photos: (id: string) => [...rentalKeys.all, 'photos', id] as const,
  availability: (f: object) => [...rentalKeys.all, 'availability', f] as const,
};

function invalidateRentals(qc: ReturnType<typeof useQueryClient>, id?: string) {
  void qc.invalidateQueries({ queryKey: rentalKeys.all });
  void qc.invalidateQueries({ queryKey: dashboardKeys.all });
  void qc.invalidateQueries({ queryKey: vehicleKeys.all });
  void qc.invalidateQueries({ queryKey: customerKeys.all });
  if (id) void qc.invalidateQueries({ queryKey: rentalKeys.detail(id) });
}

export function useRentals(filters: {
  search?: string;
  status?: RentalStatus | 'ALL' | 'OVERDUE';
  payment?: RentalPaymentFilter;
  dateFilter?: RentalDateFilter;
  from?: string;
  to?: string;
}) {
  const { status } = useAuth();
  return useInfiniteQuery({
    queryKey: rentalKeys.list(filters),
    enabled: status === 'authenticated',
    initialPageParam: 0,
    queryFn: ({ pageParam }) =>
      rentalsService.getRentals({ ...filters, page: pageParam }),
    getNextPageParam: (last) => (last.hasMore ? last.page + 1 : undefined),
  });
}

export function useRental(id: string) {
  const { status } = useAuth();
  return useQuery({
    queryKey: rentalKeys.detail(id),
    queryFn: () => rentalsService.getRental(id),
    enabled: status === 'authenticated' && Boolean(id),
  });
}

export function useRentalPhotos(id: string) {
  const { status } = useAuth();
  return useQuery({
    queryKey: rentalKeys.photos(id),
    queryFn: () => rentalsService.getRentalPhotos(id),
    enabled: status === 'authenticated' && Boolean(id),
  });
}

export function useCreateRental() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateRentalInput) => rentalsService.createRental(input),
    onSuccess: () => invalidateRentals(qc),
  });
}

export function useCancelRental() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason?: string }) =>
      rentalsService.cancelRental(id, reason),
    onSuccess: (_d, vars) => invalidateRentals(qc, vars.id),
  });
}

export function useStartRental() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => rentalsService.startRental(id),
    onSuccess: (_d, id) => invalidateRentals(qc, id),
  });
}

export function useUpdateReservedRental(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateReservedRentalInput) =>
      rentalsService.updateReservedRental(id, input),
    onSuccess: () => invalidateRentals(qc, id),
  });
}

export function useUpdateRentalNotes(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (notes: string) => rentalsService.updateRentalNotes(id, notes),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: rentalKeys.detail(id) });
    },
  });
}

export function useUploadRentalPhoto(rentalId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ uri, type }: { uri: string; type: RentalPhotoType }) =>
      rentalsService.uploadRentalPhoto(rentalId, uri, type),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: rentalKeys.photos(rentalId) });
    },
  });
}

export function useRentalAvailability(
  input: {
    vehicleId?: string;
    startDate?: string;
    startTime?: string;
    endDate?: string;
    endTime?: string;
  },
  enabled: boolean,
) {
  const { status } = useAuth();
  return useQuery({
    queryKey: rentalKeys.availability(input),
    enabled:
      status === 'authenticated' &&
      enabled &&
      Boolean(
        input.vehicleId &&
          input.startDate &&
          input.startTime &&
          input.endDate &&
          input.endTime,
      ),
    queryFn: () =>
      rentalsService.checkAvailability({
        vehicleId: input.vehicleId!,
        startDate: input.startDate!,
        startTime: input.startTime!,
        endDate: input.endDate!,
        endTime: input.endTime!,
      }),
  });
}
