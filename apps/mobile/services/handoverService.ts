import type { FuelLevel } from '@/utils/operations';
import { supabase } from '@/lib/supabase';
import { getErrorMessage } from '@/utils/errors';
import { assertOnline, newIdempotencyKey } from '@/utils/network';

export type DamageDraft = {
  severity: 'MINOR' | 'MODERATE' | 'MAJOR';
  location_key: string;
  location_label?: string;
  description?: string;
  estimated_amount?: number;
};

export type HandoverRow = {
  id: string;
  rental_id: string;
  odometer_km: number;
  fuel_level: FuelLevel;
  fuel_percent: number | null;
  checklist_confirmed: boolean;
  customer_ack_name: string | null;
  notes: string | null;
  completed_at: string;
};

function mapError(error: unknown, fallback: string): Error {
  const message =
    typeof error === 'object' && error && 'message' in error
      ? String((error as { message: string }).message)
      : '';
  if (message) {
    if (
      /kilometre|onay|teslim|müsait|bulunamadı|İnternet|yetkiniz/i.test(message)
    ) {
      return new Error(message);
    }
  }
  return new Error(getErrorMessage(error, fallback));
}

export const handoverService = {
  async getHandover(rentalId: string): Promise<HandoverRow | null> {
    const { data, error } = await supabase
      .from('rental_handovers')
      .select('*')
      .eq('rental_id', rentalId)
      .maybeSingle();
    if (error) throw mapError(error, 'Teslim bilgisi yüklenemedi.');
    return data ? (data as HandoverRow) : null;
  },

  async createHandover(input: {
    rentalId: string;
    odometerKm: number;
    fuelLevel: FuelLevel;
    checklistConfirmed: boolean;
    customerAckName?: string;
    notes?: string;
    damages?: DamageDraft[];
    photoIds?: string[];
  }): Promise<HandoverRow> {
    await assertOnline();
    const key = newIdempotencyKey('handover');
    const { data, error } = await supabase.rpc('complete_handover' as never, {
      p_rental_id: input.rentalId,
      p_odometer_km: input.odometerKm,
      p_fuel_level: input.fuelLevel,
      p_checklist_confirmed: input.checklistConfirmed,
      p_customer_ack_name: input.customerAckName ?? null,
      p_notes: input.notes ?? null,
      p_damages: input.damages ?? [],
      p_photo_ids: input.photoIds ?? null,
      p_idempotency_key: key,
    } as never);
    if (error || !data) throw mapError(error, 'Teslim tamamlanamadı.');
    return data as HandoverRow;
  },
};
