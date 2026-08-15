import type {
  Expense,
  MaintenanceRecord,
  Rental,
  Vehicle,
  VehicleInsert,
  VehiclePhoto,
  VehicleStatus,
  VehicleUpdate,
} from '@rentaflow/shared';
import { supabase } from '@/lib/supabase';
import { getErrorMessage } from '@/utils/errors';
import { formatPlateDisplay, normalizePlateKey } from '@/utils/plate';
import type { DocumentExpiryFilter } from '@/features/vehicles/constants';
import { VEHICLE_PAGE_SIZE } from '@/features/vehicles/constants';
import * as ImageManipulator from 'expo-image-manipulator';

export type VehicleListItem = Vehicle & {
  primary_photo_url: string | null;
};

export type VehicleFilters = {
  search?: string;
  status?: VehicleStatus | 'ALL';
  brand?: string | 'ALL';
  documentExpiry?: DocumentExpiryFilter;
  page?: number;
  pageSize?: number;
};

export type VehicleListResult = {
  items: VehicleListItem[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
};

export type VehicleStats = {
  rental_count: number;
  rental_days: number;
  total_rental_amount: number;
  total_collected_amount: number;
  total_expense_amount: number;
  gross_contribution: number;
  month_utilization_rate: number;
  month_rented_days: number;
  month_days: number;
};

export type VehicleRentalHistoryItem = Rental & {
  customer_name: string;
};

const MAX_PHOTO_BYTES = 5 * 1024 * 1024;

function mapDbError(error: unknown, fallback: string): Error {
  const message =
    typeof error === 'object' && error && 'message' in error
      ? String((error as { message: string }).message)
      : '';
  const code =
    typeof error === 'object' && error && 'code' in error
      ? String((error as { code: string }).code)
      : '';

  if (code === '23505' || /unique|duplicate/i.test(message)) {
    return new Error('Bu plakaya ait bir araç zaten kayıtlı.');
  }
  if (/aktif bir kiralamada/i.test(message)) {
    return new Error(message);
  }
  if (/kilometre/i.test(message)) {
    return new Error(message);
  }
  if (/durumu değiştirilemez|Kirada durumu/i.test(message)) {
    return new Error(message);
  }
  return new Error(getErrorMessage(error, fallback));
}

async function writeAudit(
  action: string,
  entityId: string,
  metadata: Record<string, unknown> = {},
) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const { data: profile } = await supabase
    .from('profiles')
    .select('organization_id')
    .eq('id', user.id)
    .single();

  const orgId = (profile as { organization_id?: string } | null)?.organization_id;
  if (!orgId) return;

  await supabase.from('audit_logs').insert({
    organization_id: orgId,
    user_id: user.id,
    action,
    entity_type: 'vehicle',
    entity_id: entityId,
    metadata,
  } as never);
}

export const vehiclesService = {
  async getVehicles(filters: VehicleFilters = {}): Promise<VehicleListResult> {
    const page = filters.page ?? 0;
    const pageSize = filters.pageSize ?? VEHICLE_PAGE_SIZE;
    const from = page * pageSize;
    const to = from + pageSize - 1;

    let query = supabase
      .from('vehicles')
      .select('*', { count: 'exact' })
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      .range(from, to);

    if (filters.status && filters.status !== 'ALL') {
      query = query.eq('status', filters.status);
    }

    if (filters.brand && filters.brand !== 'ALL') {
      query = query.ilike('brand', filters.brand);
    }

    if (filters.search?.trim()) {
      const q = filters.search.trim();
      query = query.or(
        `plate.ilike.%${q}%,brand.ilike.%${q}%,model.ilike.%${q}%`,
      );
    }

    // Document expiry filters: within next 30 days
    if (filters.documentExpiry && filters.documentExpiry !== 'ALL') {
      const today = new Date();
      const in30 = new Date();
      in30.setDate(today.getDate() + 30);
      const fromIso = today.toISOString().slice(0, 10);
      const toIso = in30.toISOString().slice(0, 10);
      const col =
        filters.documentExpiry === 'INSURANCE'
          ? 'insurance_expiry'
          : filters.documentExpiry === 'CASCO'
            ? 'casco_expiry'
            : 'inspection_expiry';
      query = query.gte(col, fromIso).lte(col, toIso);
    }

    const { data, error, count } = await query;
    if (error) throw mapDbError(error, 'Araçlar yüklenirken bir sorun oluştu.');

    const vehicles = (data ?? []) as Vehicle[];
    const ids = vehicles.map((v) => v.id);
    const photoMap = new Map<string, string>();

    if (ids.length > 0) {
      const { data: photos } = await supabase
        .from('vehicle_photos')
        .select('vehicle_id, storage_path, public_url, is_primary, created_at')
        .in('vehicle_id', ids)
        .order('is_primary', { ascending: false })
        .order('created_at', { ascending: true });

      for (const photo of (photos ?? []) as Array<
        Pick<
          VehiclePhoto,
          'vehicle_id' | 'storage_path' | 'public_url' | 'is_primary'
        >
      >) {
        if (photoMap.has(photo.vehicle_id)) continue;
        const { data: signed } = await supabase.storage
          .from('vehicle-images')
          .createSignedUrl(photo.storage_path, 60 * 60);
        photoMap.set(
          photo.vehicle_id,
          signed?.signedUrl ?? photo.public_url ?? '',
        );
        if (!photoMap.get(photo.vehicle_id)) {
          photoMap.delete(photo.vehicle_id);
        }
      }
    }

    const items: VehicleListItem[] = vehicles.map((v) => ({
      ...v,
      primary_photo_url: photoMap.get(v.id) ?? null,
    }));

    const total = count ?? items.length;
    return {
      items,
      total,
      page,
      pageSize,
      hasMore: from + items.length < total,
    };
  },

  async getBrands(): Promise<string[]> {
    const { data, error } = await supabase
      .from('vehicles')
      .select('brand')
      .is('deleted_at', null)
      .order('brand');

    if (error) throw mapDbError(error, 'Markalar yüklenemedi.');
    const set = new Set(
      ((data ?? []) as { brand: string }[]).map((r) => r.brand).filter(Boolean),
    );
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'tr'));
  },

  async getVehicle(id: string): Promise<Vehicle> {
    const { data, error } = await supabase
      .from('vehicles')
      .select('*')
      .eq('id', id)
      .is('deleted_at', null)
      .single();

    if (error || !data) {
      throw mapDbError(error, 'Aracın bilgileri yüklenemedi.');
    }
    return data as Vehicle;
  },

  async getVehiclePhotos(vehicleId: string): Promise<VehiclePhoto[]> {
    const { data, error } = await supabase
      .from('vehicle_photos')
      .select('*')
      .eq('vehicle_id', vehicleId)
      .order('is_primary', { ascending: false })
      .order('created_at', { ascending: true });

    if (error) throw mapDbError(error, 'Fotoğraflar yüklenemedi.');
    const photos = (data ?? []) as VehiclePhoto[];

    const withUrls = await Promise.all(
      photos.map(async (photo) => {
        const { data: signed } = await supabase.storage
          .from('vehicle-images')
          .createSignedUrl(photo.storage_path, 60 * 60);
        return {
          ...photo,
          public_url: signed?.signedUrl ?? photo.public_url,
        };
      }),
    );

    return withUrls;
  },

  async createVehicle(
    input: Omit<VehicleInsert, 'organization_id' | 'id'>,
  ): Promise<Vehicle> {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error('Oturum bulunamadı.');

    const { data: profile } = await supabase
      .from('profiles')
      .select('organization_id')
      .eq('id', user.id)
      .single();

    const orgId = (profile as { organization_id?: string } | null)
      ?.organization_id;
    if (!orgId) throw new Error('Kullanıcı organizasyonu bulunamadı.');

    const plate = formatPlateDisplay(input.plate);

    // UX pre-check (DB unique remains source of truth)
    const key = normalizePlateKey(plate);
    const { data: existing } = await supabase
      .from('vehicles')
      .select('id, plate')
      .is('deleted_at', null)
      .eq('organization_id', orgId);

    const clash = ((existing ?? []) as { id: string; plate: string }[]).find(
      (v) => normalizePlateKey(v.plate) === key,
    );
    if (clash) {
      throw new Error('Bu plakaya ait bir araç zaten kayıtlı.');
    }

    const payload: VehicleInsert = {
      ...input,
      plate,
      organization_id: orgId,
      status: input.status ?? 'AVAILABLE',
    };

    const { data, error } = await supabase
      .from('vehicles')
      .insert(payload as never)
      .select('*')
      .single();

    if (error || !data) {
      throw mapDbError(error, 'Araç kaydedilemedi.');
    }

    const vehicle = data as Vehicle;
    await writeAudit('CREATE_VEHICLE', vehicle.id, {
      plate: vehicle.plate,
      brand: vehicle.brand,
      model: vehicle.model,
    });

    // Initial mileage log
    if (vehicle.current_km > 0) {
      await supabase.from('vehicle_mileage_logs').insert({
        organization_id: orgId,
        vehicle_id: vehicle.id,
        kilometers: vehicle.current_km,
        note: 'İlk kayıt',
        created_by: user.id,
      } as never);
    }

    return vehicle;
  },

  async updateVehicle(id: string, input: VehicleUpdate): Promise<Vehicle> {
    const patch: VehicleUpdate = { ...input };
    if (patch.plate) {
      patch.plate = formatPlateDisplay(patch.plate);
    }

    const { data, error } = await supabase
      .from('vehicles')
      .update(patch as never)
      .eq('id', id)
      .is('deleted_at', null)
      .select('*')
      .single();

    if (error || !data) {
      throw mapDbError(error, 'Bilgiler kaydedilemedi.');
    }

    const vehicle = data as Vehicle;
    await writeAudit('UPDATE_VEHICLE', vehicle.id, { fields: Object.keys(input) });
    return vehicle;
  },

  async updateStatus(id: string, status: VehicleStatus): Promise<Vehicle> {
    const { data, error } = await supabase.rpc('update_vehicle_status' as never, {
      p_vehicle_id: id,
      p_status: status,
    } as never);

    if (error || !data) {
      throw mapDbError(error, 'Araç durumu güncellenemedi.');
    }
    return data as Vehicle;
  },

  async updateMileage(
    id: string,
    kilometers: number,
    note?: string,
  ): Promise<Vehicle> {
    const { data, error } = await supabase.rpc('update_vehicle_mileage' as never, {
      p_vehicle_id: id,
      p_kilometers: kilometers,
      p_note: note ?? null,
    } as never);

    if (error || !data) {
      throw mapDbError(error, 'Kilometre güncellenemedi.');
    }
    return data as Vehicle;
  },

  async archiveVehicle(id: string): Promise<Vehicle> {
    const { data, error } = await supabase.rpc('archive_vehicle' as never, {
      p_vehicle_id: id,
    } as never);

    if (error || !data) {
      throw mapDbError(error, 'Araç silinemedi.');
    }
    return data as Vehicle;
  },

  async getVehicleStats(id: string): Promise<VehicleStats> {
    const { data, error } = await supabase.rpc('get_vehicle_stats' as never, {
      p_vehicle_id: id,
    } as never);

    if (error || !data) {
      throw mapDbError(error, 'Araç özeti yüklenemedi.');
    }
    return data as VehicleStats;
  },

  async getVehicleRentals(vehicleId: string): Promise<VehicleRentalHistoryItem[]> {
    const { data, error } = await supabase
      .from('rentals')
      .select('*, customers(first_name, last_name)')
      .eq('vehicle_id', vehicleId)
      .is('deleted_at', null)
      .order('start_date', { ascending: false })
      .limit(50);

    if (error) throw mapDbError(error, 'Kiralama geçmişi yüklenemedi.');

    return ((data ?? []) as Array<
      Rental & { customers: { first_name: string; last_name: string } | null }
    >).map((row) => ({
      ...row,
      customer_name: row.customers
        ? `${row.customers.first_name} ${row.customers.last_name}`.trim()
        : '—',
    }));
  },

  async getVehicleMaintenance(vehicleId: string): Promise<MaintenanceRecord[]> {
    const { data, error } = await supabase
      .from('maintenance_records')
      .select('*')
      .eq('vehicle_id', vehicleId)
      .is('deleted_at', null)
      .order('maintenance_date', { ascending: false })
      .limit(50);

    if (error) throw mapDbError(error, 'Bakım kayıtları yüklenemedi.');
    return (data ?? []) as MaintenanceRecord[];
  },

  async getVehicleExpenses(vehicleId: string): Promise<Expense[]> {
    const { data, error } = await supabase
      .from('expenses')
      .select('*')
      .eq('vehicle_id', vehicleId)
      .is('deleted_at', null)
      .order('expense_date', { ascending: false })
      .limit(50);

    if (error) throw mapDbError(error, 'Masraflar yüklenemedi.');
    return (data ?? []) as Expense[];
  },

  async uploadPhoto(
    vehicleId: string,
    localUri: string,
    options?: { makePrimary?: boolean },
  ): Promise<VehiclePhoto> {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error('Oturum bulunamadı.');

    const { data: profile } = await supabase
      .from('profiles')
      .select('organization_id')
      .eq('id', user.id)
      .single();
    const orgId = (profile as { organization_id?: string } | null)
      ?.organization_id;
    if (!orgId) throw new Error('Kullanıcı organizasyonu bulunamadı.');

    const manipulated = await ImageManipulator.manipulateAsync(
      localUri,
      [{ resize: { width: 1600 } }],
      { compress: 0.72, format: ImageManipulator.SaveFormat.JPEG },
    );

    const response = await fetch(manipulated.uri);
    const arrayBuffer = await response.arrayBuffer();
    if (arrayBuffer.byteLength > MAX_PHOTO_BYTES) {
      throw new Error('Fotoğraf boyutu 5 MB sınırını aşıyor.');
    }

    const fileName = `${Date.now()}.jpg`;
    const storagePath = `${orgId}/${vehicleId}/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('vehicle-images')
      .upload(storagePath, arrayBuffer, {
        contentType: 'image/jpeg',
        upsert: false,
      });

    if (uploadError) {
      throw mapDbError(uploadError, 'Fotoğraf yüklenemedi.');
    }

    const { data: signed, error: signedError } = await supabase.storage
      .from('vehicle-images')
      .createSignedUrl(storagePath, 60 * 60 * 24 * 7);

    if (signedError) {
      console.warn('[vehicles] signed url', signedError.message);
    }

    const existing = await this.getVehiclePhotos(vehicleId);
    const makePrimary = options?.makePrimary ?? existing.length === 0;

    if (makePrimary && existing.length > 0) {
      await supabase
        .from('vehicle_photos')
        .update({ is_primary: false } as never)
        .eq('vehicle_id', vehicleId);
    }

    const { data, error } = await supabase
      .from('vehicle_photos')
      .insert({
        organization_id: orgId,
        vehicle_id: vehicleId,
        storage_path: storagePath,
        public_url: signed?.signedUrl ?? null,
        is_primary: makePrimary,
      } as never)
      .select('*')
      .single();

    if (error || !data) {
      throw mapDbError(error, 'Fotoğraf kaydedilemedi.');
    }

    await writeAudit('UPLOAD_VEHICLE_PHOTO', vehicleId, {
      photo_id: (data as VehiclePhoto).id,
    });

    return data as VehiclePhoto;
  },

  async setPrimaryPhoto(vehicleId: string, photoId: string): Promise<void> {
    await supabase
      .from('vehicle_photos')
      .update({ is_primary: false } as never)
      .eq('vehicle_id', vehicleId);

    const { error } = await supabase
      .from('vehicle_photos')
      .update({ is_primary: true } as never)
      .eq('id', photoId)
      .eq('vehicle_id', vehicleId);

    if (error) throw mapDbError(error, 'Ana fotoğraf güncellenemedi.');
  },

  async deletePhoto(vehicleId: string, photo: VehiclePhoto): Promise<void> {
    const { error: storageError } = await supabase.storage
      .from('vehicle-images')
      .remove([photo.storage_path]);

    if (storageError) {
      console.warn('[vehicles] storage delete', storageError.message);
    }

    const { error } = await supabase
      .from('vehicle_photos')
      .delete()
      .eq('id', photo.id)
      .eq('vehicle_id', vehicleId);

    if (error) throw mapDbError(error, 'Fotoğraf silinemedi.');

    if (photo.is_primary) {
      const remaining = await this.getVehiclePhotos(vehicleId);
      if (remaining[0]) {
        await this.setPrimaryPhoto(vehicleId, remaining[0].id);
      }
    }
  },
};
