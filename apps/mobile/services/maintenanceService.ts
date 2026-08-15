import type { MaintenanceType } from '@rentaflow/shared';
import { supabase } from '@/lib/supabase';
import { getErrorMessage } from '@/utils/errors';

export type MaintenanceStatus =
  | 'SCHEDULED'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'CANCELLED';

export type MaintenanceItem = {
  id: string;
  vehicle_id: string;
  maintenance_type: MaintenanceType;
  title: string | null;
  description: string | null;
  maintenance_date: string;
  scheduled_date: string | null;
  completed_date: string | null;
  current_km: number | null;
  service_name: string | null;
  amount: number;
  status: MaintenanceStatus;
  notes: string | null;
  next_maintenance_date: string | null;
  vehicle_plate?: string;
  vehicle_brand?: string;
  vehicle_model?: string;
};

function mapError(error: unknown, fallback: string): Error {
  const message =
    typeof error === 'object' && error && 'message' in error
      ? String((error as { message: string }).message)
      : '';
  if (/kilometre|yetkiniz|bulunamadı/i.test(message)) return new Error(message);
  return new Error(getErrorMessage(error, fallback));
}

export const maintenanceService = {
  async getMaintenances(params?: {
    status?: MaintenanceStatus;
    vehicleId?: string;
  }): Promise<MaintenanceItem[]> {
    let query = supabase
      .from('maintenance_records')
      .select('*, vehicles(plate, brand, model)')
      .is('deleted_at', null)
      .order('scheduled_date', { ascending: false })
      .limit(100);

    if (params?.status) query = query.eq('status', params.status);
    if (params?.vehicleId) query = query.eq('vehicle_id', params.vehicleId);

    const { data, error } = await query;
    if (error) throw mapError(error, 'Bakım kayıtları yüklenemedi.');

    return (
      (data ?? []) as Array<
        MaintenanceItem & {
          vehicles: { plate: string; brand: string; model: string } | null;
        }
      >
    ).map((row) => ({
      ...row,
      vehicle_plate: row.vehicles?.plate,
      vehicle_brand: row.vehicles?.brand,
      vehicle_model: row.vehicles?.model,
    }));
  },

  async getVehicleMaintenances(vehicleId: string): Promise<MaintenanceItem[]> {
    return this.getMaintenances({ vehicleId });
  },

  async createMaintenance(input: {
    vehicleId: string;
    maintenanceType: MaintenanceType;
    title?: string;
    description?: string;
    scheduledDate: string;
    odometer?: number;
    serviceName?: string;
    cost?: number;
    status?: MaintenanceStatus;
    notes?: string;
    nextMaintenanceDate?: string;
    nextMaintenanceKm?: number;
  }): Promise<MaintenanceItem> {
    const { data, error } = await supabase.rpc('create_maintenance' as never, {
      p_vehicle_id: input.vehicleId,
      p_maintenance_type: input.maintenanceType,
      p_title: input.title ?? null,
      p_description: input.description ?? null,
      p_scheduled_date: input.scheduledDate,
      p_odometer: input.odometer ?? null,
      p_service_name: input.serviceName ?? null,
      p_cost: input.cost ?? 0,
      p_status: input.status ?? 'SCHEDULED',
      p_notes: input.notes ?? null,
      p_next_maintenance_date: input.nextMaintenanceDate ?? null,
      p_next_maintenance_km: input.nextMaintenanceKm ?? null,
    } as never);
    if (error || !data) throw mapError(error, 'Bakım kaydı oluşturulamadı.');
    return data as MaintenanceItem;
  },

  async startMaintenance(id: string): Promise<MaintenanceItem> {
    const { data, error } = await supabase.rpc('start_maintenance' as never, {
      p_maintenance_id: id,
    } as never);
    if (error || !data) throw mapError(error, 'Bakım başlatılamadı.');
    return data as MaintenanceItem;
  },

  async completeMaintenance(id: string): Promise<MaintenanceItem> {
    const { data, error } = await supabase.rpc('complete_maintenance' as never, {
      p_maintenance_id: id,
    } as never);
    if (error || !data) throw mapError(error, 'Bakım tamamlanamadı.');
    return data as MaintenanceItem;
  },

  async cancelMaintenance(id: string): Promise<void> {
    const { error } = await supabase
      .from('maintenance_records')
      .update({ status: 'CANCELLED' } as never)
      .eq('id', id);
    if (error) throw mapError(error, 'Bakım iptal edilemedi.');
  },
};
