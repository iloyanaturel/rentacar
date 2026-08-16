import type { FuelLevel } from '@/utils/operations';
import {
  calculateFuelDifference,
  calculateLateDuration,
} from '@/utils/operations';
import { supabase } from '@/lib/supabase';
import { getErrorMessage } from '@/utils/errors';
import { assertOnline, newIdempotencyKey } from '@/utils/network';
import type { DamageDraft } from '@/services/handoverService';
import type { PaymentMethod } from '@rentaflow/shared';

export type ExtraChargeDraft = {
  charge_type:
    | 'FUEL_DIFF'
    | 'LATE_RETURN'
    | 'DAMAGE'
    | 'CLEANING'
    | 'EXTRA_USAGE'
    | 'OTHER';
  description?: string;
  amount: number;
};

export type ReturnRow = {
  id: string;
  rental_id: string;
  odometer_km: number;
  fuel_level: FuelLevel;
  fuel_percent: number | null;
  actual_end_at: string;
  late_minutes: number;
  send_to_maintenance: boolean;
  deposit_action: string | null;
  deposit_deduction: number;
  deposit_refund: number;
  notes: string | null;
  completed_at: string;
};

function mapError(error: unknown, fallback: string): Error {
  const message =
    typeof error === 'object' && error && 'message' in error
      ? String((error as { message: string }).message)
      : '';
  if (
    message &&
    /kilometre|onay|iade|borç|İnternet|bulunamadı|yetkiniz/i.test(message)
  ) {
    return new Error(message);
  }
  return new Error(getErrorMessage(error, fallback));
}

export const returnService = {
  calculateLateDuration,
  calculateFuelDifference,

  async getReturn(rentalId: string): Promise<ReturnRow | null> {
    const { data, error } = await supabase
      .from('rental_returns')
      .select('*')
      .eq('rental_id', rentalId)
      .maybeSingle();
    if (error) throw mapError(error, 'İade bilgisi yüklenemedi.');
    return data ? (data as ReturnRow) : null;
  },

  async completeReturn(input: {
    rentalId: string;
    odometerKm: number;
    fuelLevel: FuelLevel;
    actualEndAt?: string;
    sendToMaintenance?: boolean;
    depositAction?: 'FULL_REFUND' | 'PARTIAL_REFUND' | 'FORFEIT' | 'NONE';
    depositDeduction?: number;
    checklistConfirmed: boolean;
    notes?: string;
    extraCharges?: ExtraChargeDraft[];
    damages?: DamageDraft[];
    photoIds?: string[];
    paymentAmount?: number;
    paymentMethod?: PaymentMethod;
  }): Promise<ReturnRow> {
    await assertOnline();
    const key = newIdempotencyKey('return');
    const { data, error } = await supabase.rpc('complete_return' as never, {
      p_rental_id: input.rentalId,
      p_odometer_km: input.odometerKm,
      p_fuel_level: input.fuelLevel,
      p_actual_end_at: input.actualEndAt ?? new Date().toISOString(),
      p_send_to_maintenance: input.sendToMaintenance ?? false,
      p_deposit_action: input.depositAction ?? 'FULL_REFUND',
      p_deposit_deduction: input.depositDeduction ?? 0,
      p_checklist_confirmed: input.checklistConfirmed,
      p_notes: input.notes ?? null,
      p_extra_charges: input.extraCharges ?? [],
      p_damages: input.damages ?? [],
      p_photo_ids: input.photoIds ?? null,
      p_payment_amount: input.paymentAmount ?? null,
      p_payment_method: input.paymentMethod ?? 'CASH',
      p_idempotency_key: key,
    } as never);
    if (error || !data) throw mapError(error, 'İade tamamlanamadı.');
    return data as ReturnRow;
  },
};
