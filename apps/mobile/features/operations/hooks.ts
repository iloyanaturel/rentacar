import {
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { useAuth } from '@/features/auth';
import { paymentsService } from '@/services/paymentsService';
import { handoverService } from '@/services/handoverService';
import { returnService } from '@/services/returnService';
import {
  damageService,
  depositService,
  extraChargesService,
  timelineService,
} from '@/services/damageService';
import { rentalKeys } from '@/features/rentals/hooks';
import { dashboardKeys } from '@/features/dashboard/hooks';
import { vehicleKeys } from '@/features/vehicles/hooks';
import { customerKeys } from '@/features/customers/hooks';
import type { PaymentMethod } from '@rentaflow/shared';

export const opsKeys = {
  payments: (rentalId: string) => ['payments', rentalId] as const,
  paymentSummary: (rentalId: string) =>
    ['payments', rentalId, 'summary'] as const,
  handover: (rentalId: string) => ['handover', rentalId] as const,
  return: (rentalId: string) => ['return', rentalId] as const,
  damages: (rentalId: string) => ['damages', rentalId] as const,
  deposit: (rentalId: string) => ['deposit', rentalId] as const,
  extras: (rentalId: string) => ['extras', rentalId] as const,
  timeline: (rentalId: string) => ['timeline', rentalId] as const,
};

function invalidateOps(qc: ReturnType<typeof useQueryClient>, rentalId: string) {
  void qc.invalidateQueries({ queryKey: rentalKeys.all });
  void qc.invalidateQueries({ queryKey: rentalKeys.detail(rentalId) });
  void qc.invalidateQueries({ queryKey: opsKeys.payments(rentalId) });
  void qc.invalidateQueries({ queryKey: opsKeys.paymentSummary(rentalId) });
  void qc.invalidateQueries({ queryKey: opsKeys.handover(rentalId) });
  void qc.invalidateQueries({ queryKey: opsKeys.return(rentalId) });
  void qc.invalidateQueries({ queryKey: opsKeys.damages(rentalId) });
  void qc.invalidateQueries({ queryKey: opsKeys.deposit(rentalId) });
  void qc.invalidateQueries({ queryKey: opsKeys.extras(rentalId) });
  void qc.invalidateQueries({ queryKey: opsKeys.timeline(rentalId) });
  void qc.invalidateQueries({ queryKey: dashboardKeys.all });
  void qc.invalidateQueries({ queryKey: vehicleKeys.all });
  void qc.invalidateQueries({ queryKey: customerKeys.all });
}

export function useRentalPayments(rentalId: string) {
  const { status } = useAuth();
  return useQuery({
    queryKey: opsKeys.payments(rentalId),
    queryFn: () => paymentsService.getRentalPayments(rentalId),
    enabled: status === 'authenticated' && Boolean(rentalId),
  });
}

export function useRentalPaymentSummary(rentalId: string) {
  const { status } = useAuth();
  return useQuery({
    queryKey: opsKeys.paymentSummary(rentalId),
    queryFn: () => paymentsService.getRentalPaymentSummary(rentalId),
    enabled: status === 'authenticated' && Boolean(rentalId),
  });
}

export function useAddPayment(rentalId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: {
      amount: number;
      paymentMethod: PaymentMethod;
      paymentDate?: string;
      referenceNumber?: string;
      note?: string;
    }) =>
      paymentsService.createPayment({
        rentalId,
        ...input,
      }),
    onSuccess: () => invalidateOps(qc, rentalId),
  });
}

export function useReversePayment(rentalId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason?: string }) =>
      paymentsService.reversePayment(id, reason),
    onSuccess: () => invalidateOps(qc, rentalId),
  });
}

export function useRentalHandover(rentalId: string) {
  const { status } = useAuth();
  return useQuery({
    queryKey: opsKeys.handover(rentalId),
    queryFn: () => handoverService.getHandover(rentalId),
    enabled: status === 'authenticated' && Boolean(rentalId),
  });
}

export function useCompleteHandover(rentalId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: handoverService.createHandover,
    onSuccess: () => invalidateOps(qc, rentalId),
  });
}

export function useRentalReturn(rentalId: string) {
  const { status } = useAuth();
  return useQuery({
    queryKey: opsKeys.return(rentalId),
    queryFn: () => returnService.getReturn(rentalId),
    enabled: status === 'authenticated' && Boolean(rentalId),
  });
}

export function useCompleteReturn(rentalId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: returnService.completeReturn,
    onSuccess: () => invalidateOps(qc, rentalId),
  });
}

export function useRentalDamages(rentalId: string) {
  const { status } = useAuth();
  return useQuery({
    queryKey: opsKeys.damages(rentalId),
    queryFn: () => damageService.getRentalDamages(rentalId),
    enabled: status === 'authenticated' && Boolean(rentalId),
  });
}

export function useRentalDeposit(rentalId: string) {
  const { status } = useAuth();
  return useQuery({
    queryKey: opsKeys.deposit(rentalId),
    queryFn: () => depositService.getDeposit(rentalId),
    enabled: status === 'authenticated' && Boolean(rentalId),
  });
}

export function useRentalExtraCharges(rentalId: string) {
  const { status } = useAuth();
  return useQuery({
    queryKey: opsKeys.extras(rentalId),
    queryFn: () => extraChargesService.getExtraCharges(rentalId),
    enabled: status === 'authenticated' && Boolean(rentalId),
  });
}

export function useRentalTimeline(rentalId: string) {
  const { status } = useAuth();
  return useQuery({
    queryKey: opsKeys.timeline(rentalId),
    queryFn: () => timelineService.getRentalTimeline(rentalId),
    enabled: status === 'authenticated' && Boolean(rentalId),
  });
}
