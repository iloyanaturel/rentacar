import * as ImageManipulator from 'expo-image-manipulator';
import type {
  Rental,
  RentalPhoto,
  RentalPhotoType,
  RentalStatus,
  Vehicle,
} from '@rentaflow/shared';
import { supabase } from '@/lib/supabase';
import { getErrorMessage } from '@/utils/errors';
import { computePaymentStatus } from '@/utils/labels';
import { APP_TIMEZONE } from '@/utils/date';
import { formatInTimeZone } from 'date-fns-tz';
import { calcRentalPricing } from '@/utils/rentalPricing';

export { calcRentalPricing };

const MAX_PHOTO_BYTES = 5 * 1024 * 1024;

export type VehiclePickerItem = Vehicle & {
  photo_url: string | null;
};

export type UpdateReservedRentalInput = {
  start_date: string;
  start_time: string;
  end_date: string;
  end_time: string;
  daily_price: number;
  discount_amount: number;
  extra_charge: number;
  deposit_amount: number;
  notes?: string | null;
};

export const RENTAL_PAGE_SIZE = 20;

export type RentalPaymentFilter = 'ALL' | 'PAID' | 'PARTIALLY_PAID' | 'UNPAID';
export type RentalDateFilter =
  | 'ALL'
  | 'TODAY'
  | 'WEEK'
  | 'MONTH'
  | 'CUSTOM';

export type RentalListItem = Rental & {
  vehicle_brand: string;
  vehicle_model: string;
  vehicle_plate: string;
  customer_name: string;
  customer_phone: string | null;
  payment_status: ReturnType<typeof computePaymentStatus>;
  display_status: RentalStatus | 'OVERDUE';
};

export type CreateRentalInput = {
  vehicle_id: string;
  customer_id: string;
  start_date: string;
  start_time: string;
  end_date: string;
  end_time: string;
  daily_price: number;
  discount_amount: number;
  extra_charge: number;
  deposit_amount: number;
  notes?: string | null;
  status?: 'RESERVED' | 'ACTIVE';
};

function mapError(error: unknown, fallback: string): Error {
  const message =
    typeof error === 'object' && error && 'message' in error
      ? String((error as { message: string }).message)
      : '';

  if (/müsait değil/i.test(message)) {
    return new Error('Bu araç seçilen tarihlerde müsait değil.');
  }
  if (/Teslim tarihi/i.test(message)) {
    return new Error('Teslim tarihi başlangıç tarihinden önce olamaz.');
  }
  if (/İndirim/i.test(message)) {
    return new Error('İndirim tutarı toplam tutardan fazla olamaz.');
  }
  if (message) {
    const safe = getErrorMessage(error, fallback);
    if (safe !== fallback) return new Error(safe);
    if (
      /olamaz|bulunamadı|yetkiniz|Pasif|Bakım|rezervasyon|iptal/i.test(message)
    ) {
      return new Error(message);
    }
  }
  return new Error(getErrorMessage(error, fallback));
}

function displayStatus(rental: Rental): RentalStatus | 'OVERDUE' {
  if (rental.status !== 'ACTIVE') return rental.status;
  const today = formatInTimeZone(new Date(), APP_TIMEZONE, 'yyyy-MM-dd');
  if (rental.end_date < today) return 'OVERDUE';
  return 'ACTIVE';
}

function resolveStatusForCreate(
  startDate: string,
): 'RESERVED' | 'ACTIVE' {
  const today = formatInTimeZone(new Date(), APP_TIMEZONE, 'yyyy-MM-dd');
  return startDate > today ? 'RESERVED' : 'ACTIVE';
}

async function orgId(): Promise<{ userId: string; organizationId: string }> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Oturum bulunamadı.');
  const { data: profile } = await supabase
    .from('profiles')
    .select('organization_id')
    .eq('id', user.id)
    .single();
  const organizationId = (profile as { organization_id?: string } | null)
    ?.organization_id;
  if (!organizationId) throw new Error('Kullanıcı organizasyonu bulunamadı.');
  return { userId: user.id, organizationId };
}

export const rentalsService = {
  async getRentals(params: {
    search?: string;
    status?: RentalStatus | 'ALL' | 'OVERDUE';
    payment?: RentalPaymentFilter;
    dateFilter?: RentalDateFilter;
    from?: string;
    to?: string;
    page?: number;
    pageSize?: number;
  }): Promise<{ items: RentalListItem[]; hasMore: boolean; page: number }> {
    const page = params.page ?? 0;
    const pageSize = params.pageSize ?? RENTAL_PAGE_SIZE;
    const from = page * pageSize;
    const to = from + pageSize - 1;

    let query = supabase
      .from('rentals')
      .select(
        '*, vehicles(brand, model, plate), customers(first_name, last_name, phone)',
        { count: 'exact' },
      )
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      .range(from, to);

    if (params.status && params.status !== 'ALL' && params.status !== 'OVERDUE') {
      query = query.eq('status', params.status);
    }
    if (params.status === 'OVERDUE') {
      const today = formatInTimeZone(new Date(), APP_TIMEZONE, 'yyyy-MM-dd');
      query = query.eq('status', 'ACTIVE').lt('end_date', today);
    }

    const today = formatInTimeZone(new Date(), APP_TIMEZONE, 'yyyy-MM-dd');
    if (params.dateFilter === 'TODAY') {
      query = query.or(`start_date.eq.${today},end_date.eq.${today}`);
    } else if (params.dateFilter === 'WEEK') {
      const d = new Date();
      d.setDate(d.getDate() - 7);
      const fromIso = formatInTimeZone(d, APP_TIMEZONE, 'yyyy-MM-dd');
      query = query.gte('start_date', fromIso);
    } else if (params.dateFilter === 'MONTH') {
      const fromIso = today.slice(0, 8) + '01';
      query = query.gte('start_date', fromIso);
    } else if (params.dateFilter === 'CUSTOM') {
      if (params.from) query = query.gte('start_date', params.from);
      if (params.to) query = query.lte('start_date', params.to);
    }

    const { data, error, count } = await query;
    if (error) throw mapError(error, 'Kiralamalar yüklenirken bir sorun oluştu.');

    let items: RentalListItem[] = (
      (data ?? []) as Array<
        Rental & {
          vehicles: { brand: string; model: string; plate: string } | null;
          customers: {
            first_name: string;
            last_name: string;
            phone: string | null;
          } | null;
        }
      >
    ).map((row) => ({
      ...row,
      vehicle_brand: row.vehicles?.brand ?? '—',
      vehicle_model: row.vehicles?.model ?? '',
      vehicle_plate: row.vehicles?.plate ?? '—',
      customer_name: row.customers
        ? `${row.customers.first_name} ${row.customers.last_name}`.trim()
        : '—',
      customer_phone: row.customers?.phone ?? null,
      payment_status: computePaymentStatus(
        Number(row.total_amount),
        Number(row.paid_amount),
      ),
      display_status: displayStatus(row),
    }));

    if (params.payment && params.payment !== 'ALL') {
      items = items.filter((i) => i.payment_status === params.payment);
    }

    if (params.search?.trim()) {
      const q = params.search.trim().toLowerCase();
      items = items.filter(
        (i) =>
          i.vehicle_plate.toLowerCase().includes(q) ||
          i.vehicle_brand.toLowerCase().includes(q) ||
          i.vehicle_model.toLowerCase().includes(q) ||
          i.customer_name.toLowerCase().includes(q) ||
          (i.customer_phone ?? '').includes(q),
      );
    }

    const total = count ?? items.length;
    return {
      items,
      page,
      hasMore: from + (data?.length ?? 0) < total,
    };
  },

  async getRental(id: string): Promise<RentalListItem> {
    const { data, error } = await supabase
      .from('rentals')
      .select(
        '*, vehicles(brand, model, plate), customers(first_name, last_name, phone)',
      )
      .eq('id', id)
      .is('deleted_at', null)
      .single();

    if (error || !data) throw mapError(error, 'Kiralama bilgileri yüklenemedi.');

    const row = data as Rental & {
      vehicles: { brand: string; model: string; plate: string } | null;
      customers: {
        first_name: string;
        last_name: string;
        phone: string | null;
      } | null;
    };

    return {
      ...row,
      vehicle_brand: row.vehicles?.brand ?? '—',
      vehicle_model: row.vehicles?.model ?? '',
      vehicle_plate: row.vehicles?.plate ?? '—',
      customer_name: row.customers
        ? `${row.customers.first_name} ${row.customers.last_name}`.trim()
        : '—',
      customer_phone: row.customers?.phone ?? null,
      payment_status: computePaymentStatus(
        Number(row.total_amount),
        Number(row.paid_amount),
      ),
      display_status: displayStatus(row),
    };
  },

  async checkAvailability(input: {
    vehicleId: string;
    startDate: string;
    startTime: string;
    endDate: string;
    endTime: string;
    excludeRentalId?: string;
  }): Promise<boolean> {
    const { data, error } = await supabase.rpc(
      'check_vehicle_availability' as never,
      {
        p_vehicle_id: input.vehicleId,
        p_start_date: input.startDate,
        p_start_time: input.startTime,
        p_end_date: input.endDate,
        p_end_time: input.endTime,
        p_exclude_rental_id: input.excludeRentalId ?? null,
      } as never,
    );
    if (error) throw mapError(error, 'Müsaitlik kontrolü yapılamadı.');
    return Boolean(data);
  },

  async createRental(input: CreateRentalInput): Promise<Rental> {
    const status =
      input.status ?? resolveStatusForCreate(input.start_date);

    const { data, error } = await supabase.rpc('create_rental' as never, {
      p_vehicle_id: input.vehicle_id,
      p_customer_id: input.customer_id,
      p_start_date: input.start_date,
      p_start_time: input.start_time,
      p_end_date: input.end_date,
      p_end_time: input.end_time,
      p_daily_price: input.daily_price,
      p_discount_amount: input.discount_amount,
      p_extra_charge: input.extra_charge,
      p_deposit_amount: input.deposit_amount,
      p_status: status,
      p_notes: input.notes ?? null,
    } as never);

    if (error || !data) {
      throw mapError(error, 'Bu kiralama oluşturulamadı.');
    }
    return data as Rental;
  },

  async cancelRental(id: string, reason?: string): Promise<Rental> {
    const { data, error } = await supabase.rpc('cancel_rental' as never, {
      p_rental_id: id,
      p_reason: reason ?? null,
    } as never);
    if (error || !data) throw mapError(error, 'Kiralama iptal edilemedi.');
    return data as Rental;
  },

  async startRental(id: string): Promise<Rental> {
    const { data, error } = await supabase.rpc('start_rental' as never, {
      p_rental_id: id,
    } as never);
    if (error || !data) throw mapError(error, 'Kiralama başlatılamadı.');
    return data as Rental;
  },

  async updateRentalNotes(id: string, notes: string): Promise<void> {
    const { error } = await supabase
      .from('rentals')
      .update({ notes } as never)
      .eq('id', id)
      .eq('status', 'RESERVED');
    if (error) throw mapError(error, 'Kiralama güncellenemedi.');

    const { userId, organizationId } = await orgId();
    await supabase.from('audit_logs').insert({
      organization_id: organizationId,
      user_id: userId,
      action: 'UPDATE_RENTAL',
      entity_type: 'rental',
      entity_id: id,
      metadata: { fields: ['notes'] },
    } as never);
  },

  async updateReservedRental(
    id: string,
    input: UpdateReservedRentalInput,
  ): Promise<Rental> {
    const { data, error } = await supabase.rpc(
      'update_reserved_rental' as never,
      {
        p_rental_id: id,
        p_start_date: input.start_date,
        p_start_time: input.start_time,
        p_end_date: input.end_date,
        p_end_time: input.end_time,
        p_daily_price: input.daily_price,
        p_discount_amount: input.discount_amount,
        p_extra_charge: input.extra_charge,
        p_deposit_amount: input.deposit_amount,
        p_notes: input.notes ?? null,
      } as never,
    );
    if (error || !data) throw mapError(error, 'Kiralama güncellenemedi.');
    return data as Rental;
  },

  async getAvailableVehiclesForPicker(): Promise<VehiclePickerItem[]> {
    const { data, error } = await supabase
      .from('vehicles')
      .select('*')
      .is('deleted_at', null)
      .order('brand');
    if (error) throw mapError(error, 'Araçlar yüklenemedi.');

    const vehicles = (data ?? []) as Vehicle[];
    const ids = vehicles.map((v) => v.id);
    const photoMap = new Map<string, string>();

    if (ids.length > 0) {
      const { data: photos } = await supabase
        .from('vehicle_photos')
        .select('vehicle_id, storage_path, public_url, is_primary')
        .in('vehicle_id', ids)
        .order('is_primary', { ascending: false });

      for (const photo of (photos ?? []) as Array<{
        vehicle_id: string;
        storage_path: string;
        public_url: string | null;
        is_primary: boolean;
      }>) {
        if (photoMap.has(photo.vehicle_id)) continue;
        const { data: signed } = await supabase.storage
          .from('vehicle-images')
          .createSignedUrl(photo.storage_path, 60 * 60);
        photoMap.set(
          photo.vehicle_id,
          signed?.signedUrl ?? photo.public_url ?? '',
        );
      }
    }

    return vehicles.map((v) => ({
      ...v,
      photo_url: photoMap.get(v.id) || null,
    }));
  },

  async getRentalPhotos(
    rentalId: string,
  ): Promise<Array<RentalPhoto & { public_url: string | null }>> {
    const { data, error } = await supabase
      .from('rental_photos')
      .select('*')
      .eq('rental_id', rentalId)
      .order('created_at', { ascending: false });
    if (error) throw mapError(error, 'Kiralama fotoğrafları yüklenemedi.');

    const rows = (data ?? []) as RentalPhoto[];
    return Promise.all(
      rows.map(async (photo) => {
        const { data: signed } = await supabase.storage
          .from('rental-images')
          .createSignedUrl(photo.storage_path, 60 * 60);
        return {
          ...photo,
          public_url: signed?.signedUrl ?? photo.public_url,
        };
      }),
    );
  },

  async uploadRentalPhoto(
    rentalId: string,
    localUri: string,
    type: RentalPhotoType,
    category?:
      | 'FRONT'
      | 'BACK'
      | 'LEFT'
      | 'RIGHT'
      | 'INTERIOR'
      | 'ODOMETER'
      | 'FUEL'
      | 'DAMAGE'
      | 'OTHER',
  ): Promise<RentalPhoto> {
    const { organizationId } = await orgId();

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

    const folder =
      type === 'PICKUP' ? 'handover' : type === 'RETURN' ? 'return' : 'other';
    const fileName = `${Date.now()}.jpg`;
    // First path segment MUST be organization_id (storage RLS)
    const storagePath = `${organizationId}/rentals/${rentalId}/${folder}/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('rental-images')
      .upload(storagePath, arrayBuffer, {
        contentType: 'image/jpeg',
        upsert: false,
      });
    if (uploadError) throw mapError(uploadError, 'Fotoğraf yüklenemedi.');

    const { data: signed } = await supabase.storage
      .from('rental-images')
      .createSignedUrl(storagePath, 60 * 60 * 24 * 7);

    const { data, error } = await supabase
      .from('rental_photos')
      .insert({
        organization_id: organizationId,
        rental_id: rentalId,
        type,
        category: category ?? 'OTHER',
        storage_path: storagePath,
        public_url: signed?.signedUrl ?? null,
      } as never)
      .select('*')
      .single();

    if (error || !data) throw mapError(error, 'Fotoğraf kaydedilemedi.');
    return data as RentalPhoto;
  },
};
