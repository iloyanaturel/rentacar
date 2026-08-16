import { supabase } from '@/lib/supabase';
import { getErrorMessage } from '@/utils/errors';
import type { DamageDraft } from '@/services/handoverService';

export type DamageRow = {
  id: string;
  rental_id: string;
  handover_id: string | null;
  return_id: string | null;
  timing: 'EXISTING' | 'NEW';
  severity: 'MINOR' | 'MODERATE' | 'MAJOR';
  location_key: string;
  location_label: string | null;
  description: string | null;
  estimated_amount: number;
  created_at: string;
  deleted_at: string | null;
};

export type DepositRow = {
  id: string;
  rental_id: string;
  amount: number;
  status: 'PENDING' | 'HELD' | 'PARTIALLY_REFUNDED' | 'REFUNDED' | 'FORFEITED';
  deducted_amount: number;
  refunded_amount: number;
  notes: string | null;
};

export type ExtraChargeRow = {
  id: string;
  rental_id: string;
  charge_type: string;
  description: string | null;
  amount: number;
  voided_at: string | null;
  created_at: string;
};

function mapError(error: unknown, fallback: string): Error {
  return new Error(getErrorMessage(error, fallback));
}

export const damageService = {
  async getRentalDamages(rentalId: string): Promise<DamageRow[]> {
    const { data, error } = await supabase
      .from('rental_damages')
      .select('*')
      .eq('rental_id', rentalId)
      .is('deleted_at', null)
      .order('created_at', { ascending: false });
    if (error) throw mapError(error, 'Hasarlar yüklenemedi.');
    return (data ?? []) as DamageRow[];
  },

  async createDamage(
    rentalId: string,
    input: DamageDraft & { timing: 'EXISTING' | 'NEW' },
  ): Promise<DamageRow> {
    const { data: profile } = await supabase.auth.getUser();
    const { data: org } = await supabase
      .from('profiles')
      .select('organization_id')
      .eq('id', profile.user?.id ?? '')
      .single();

    const { data, error } = await supabase
      .from('rental_damages')
      .insert({
        organization_id: (org as { organization_id: string } | null)
          ?.organization_id,
        rental_id: rentalId,
        timing: input.timing,
        severity: input.severity,
        location_key: input.location_key,
        location_label: input.location_label ?? null,
        description: input.description ?? null,
        estimated_amount: input.estimated_amount ?? 0,
        created_by: profile.user?.id ?? null,
      } as never)
      .select('*')
      .single();
    if (error || !data) throw mapError(error, 'Hasar kaydedilemedi.');
    return data as DamageRow;
  },

  async softDeleteDamage(id: string): Promise<void> {
    const { error } = await supabase
      .from('rental_damages')
      .update({ deleted_at: new Date().toISOString() } as never)
      .eq('id', id);
    if (error) throw mapError(error, 'Hasar silinemedi.');
  },
};

export const depositService = {
  async getDeposit(rentalId: string): Promise<DepositRow | null> {
    const { data, error } = await supabase
      .from('rental_deposits')
      .select('*')
      .eq('rental_id', rentalId)
      .maybeSingle();
    if (error) throw mapError(error, 'Depozito bilgisi yüklenemedi.');
    return data ? (data as DepositRow) : null;
  },
};

export const extraChargesService = {
  async getExtraCharges(rentalId: string): Promise<ExtraChargeRow[]> {
    const { data, error } = await supabase
      .from('rental_extra_charges')
      .select('*')
      .eq('rental_id', rentalId)
      .is('voided_at', null)
      .order('created_at', { ascending: false });
    if (error) throw mapError(error, 'Ek ücretler yüklenemedi.');
    return (data ?? []) as ExtraChargeRow[];
  },
};

export type AuditEvent = {
  id: string;
  action: string;
  entity_type: string;
  entity_id: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
};

export const timelineService = {
  async getRentalTimeline(rentalId: string): Promise<AuditEvent[]> {
    const { data, error } = await supabase
      .from('audit_logs')
      .select('id, action, entity_type, entity_id, metadata, created_at')
      .or(
        `entity_id.eq.${rentalId},metadata->>rental_id.eq.${rentalId}`,
      )
      .order('created_at', { ascending: true })
      .limit(100);
    if (error) throw mapError(error, 'Zaman çizelgesi yüklenemedi.');
    return (data ?? []) as AuditEvent[];
  },
};
