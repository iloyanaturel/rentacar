import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { useAuth } from '@/features/auth';
import {
  vehiclesService,
  type VehicleFilters,
} from '@/services/vehiclesService';
import type { VehicleStatus, VehicleUpdate } from '@rentaflow/shared';
import { dashboardKeys } from '@/features/dashboard/hooks';

export const vehicleKeys = {
  all: ['vehicles'] as const,
  lists: () => [...vehicleKeys.all, 'list'] as const,
  list: (filters: VehicleFilters) =>
    [...vehicleKeys.lists(), filters] as const,
  brands: () => [...vehicleKeys.all, 'brands'] as const,
  detail: (id: string) => [...vehicleKeys.all, 'detail', id] as const,
  photos: (id: string) => [...vehicleKeys.all, 'photos', id] as const,
  stats: (id: string) => [...vehicleKeys.all, 'stats', id] as const,
  rentals: (id: string) => [...vehicleKeys.all, 'rentals', id] as const,
  maintenance: (id: string) => [...vehicleKeys.all, 'maintenance', id] as const,
  expenses: (id: string) => [...vehicleKeys.all, 'expenses', id] as const,
};

function invalidateVehicleCaches(
  queryClient: ReturnType<typeof useQueryClient>,
  vehicleId?: string,
) {
  void queryClient.invalidateQueries({ queryKey: vehicleKeys.all });
  void queryClient.invalidateQueries({ queryKey: dashboardKeys.all });
  if (vehicleId) {
    void queryClient.invalidateQueries({
      queryKey: vehicleKeys.detail(vehicleId),
    });
  }
}

export function useVehicles(filters: VehicleFilters) {
  const { status } = useAuth();
  return useInfiniteQuery({
    queryKey: vehicleKeys.list(filters),
    enabled: status === 'authenticated',
    initialPageParam: 0,
    queryFn: ({ pageParam }) =>
      vehiclesService.getVehicles({ ...filters, page: pageParam }),
    getNextPageParam: (last) => (last.hasMore ? last.page + 1 : undefined),
  });
}

export function useVehicleBrands() {
  const { status } = useAuth();
  return useQuery({
    queryKey: vehicleKeys.brands(),
    queryFn: () => vehiclesService.getBrands(),
    enabled: status === 'authenticated',
  });
}

export function useVehicle(id: string) {
  const { status } = useAuth();
  return useQuery({
    queryKey: vehicleKeys.detail(id),
    queryFn: () => vehiclesService.getVehicle(id),
    enabled: status === 'authenticated' && Boolean(id),
  });
}

export function useVehiclePhotos(id: string) {
  const { status } = useAuth();
  return useQuery({
    queryKey: vehicleKeys.photos(id),
    queryFn: () => vehiclesService.getVehiclePhotos(id),
    enabled: status === 'authenticated' && Boolean(id),
  });
}

export function useVehicleStats(id: string) {
  const { status } = useAuth();
  return useQuery({
    queryKey: vehicleKeys.stats(id),
    queryFn: () => vehiclesService.getVehicleStats(id),
    enabled: status === 'authenticated' && Boolean(id),
  });
}

export function useVehicleRentals(id: string) {
  const { status } = useAuth();
  return useQuery({
    queryKey: vehicleKeys.rentals(id),
    queryFn: () => vehiclesService.getVehicleRentals(id),
    enabled: status === 'authenticated' && Boolean(id),
  });
}

export function useVehicleMaintenance(id: string) {
  const { status } = useAuth();
  return useQuery({
    queryKey: vehicleKeys.maintenance(id),
    queryFn: () => vehiclesService.getVehicleMaintenance(id),
    enabled: status === 'authenticated' && Boolean(id),
  });
}

export function useVehicleExpenses(id: string) {
  const { status } = useAuth();
  return useQuery({
    queryKey: vehicleKeys.expenses(id),
    queryFn: () => vehiclesService.getVehicleExpenses(id),
    enabled: status === 'authenticated' && Boolean(id),
  });
}

export function useCreateVehicle() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: vehiclesService.createVehicle,
    onSuccess: () => invalidateVehicleCaches(queryClient),
  });
}

export function useUpdateVehicle(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: VehicleUpdate) =>
      vehiclesService.updateVehicle(id, input),
    onSuccess: () => invalidateVehicleCaches(queryClient, id),
  });
}

export function useUpdateVehicleStatus(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (status: VehicleStatus) =>
      vehiclesService.updateStatus(id, status),
    onSuccess: () => invalidateVehicleCaches(queryClient, id),
  });
}

export function useUpdateMileage(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ kilometers, note }: { kilometers: number; note?: string }) =>
      vehiclesService.updateMileage(id, kilometers, note),
    onSuccess: () => invalidateVehicleCaches(queryClient, id),
  });
}

export function useArchiveVehicle() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => vehiclesService.archiveVehicle(id),
    onSuccess: (_data, id) => invalidateVehicleCaches(queryClient, id),
  });
}

export function useUploadVehiclePhoto(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (uri: string) => vehiclesService.uploadPhoto(id, uri),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: vehicleKeys.photos(id) });
      void queryClient.invalidateQueries({ queryKey: vehicleKeys.lists() });
    },
  });
}

export function useDeleteVehiclePhoto(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: vehiclesService.deletePhoto.bind(null, id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: vehicleKeys.photos(id) });
      void queryClient.invalidateQueries({ queryKey: vehicleKeys.lists() });
    },
  });
}

export function useSetPrimaryPhoto(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (photoId: string) =>
      vehiclesService.setPrimaryPhoto(id, photoId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: vehicleKeys.photos(id) });
      void queryClient.invalidateQueries({ queryKey: vehicleKeys.lists() });
    },
  });
}
