import type { Customer, Rental } from '@rentaflow/shared';
import { supabase } from '@/lib/supabase';
import { getErrorMessage } from '@/utils/errors';
import { computePaymentStatus } from '@/utils/labels';

export const CUSTOMER_PAGE_SIZE = 20;

export type CustomerFilter =
  | 'ALL'
  | 'ACTIVE'
  | 'HAS_RENTALS'
  | 'HAS_BALANCE';

export type CustomerListItem = Customer & {
  rental_count: number;
  total_spend: number;
  open_balance: number;
  last_rental_date: string | null;
};

export type CustomerStats = {
  rental_count: number;
  total_spend: number;
  total_paid: number;
  open_balance: number;
  last_rental_date: string | null;
};

export type CustomerRentalItem = Rental & {
  vehicle_brand: string;
  vehicle_model: string;
  vehicle_plate: string;
  payment_status: ReturnType<typeof computePaymentStatus>;
};

function mapError(error: unknown, fallback: string): Error {
  const message =
    typeof error === 'object' && error && 'message' in error
      ? String((error as { message: string }).message)
      : '';
  if (/aktif kiralaması/i.test(message)) return new Error(message);
  return new Error(getErrorMessage(error, fallback));
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

async function writeAudit(
  action: string,
  entityId: string,
  metadata: Record<string, unknown> = {},
) {
  const { userId, organizationId } = await orgId();
  await supabase.from('audit_logs').insert({
    organization_id: organizationId,
    user_id: userId,
    action,
    entity_type: 'customer',
    entity_id: entityId,
    metadata,
  } as never);
}

export const customersService = {
  async getCustomers(params: {
    search?: string;
    filter?: CustomerFilter;
    page?: number;
    pageSize?: number;
  }): Promise<{ items: CustomerListItem[]; hasMore: boolean; page: number }> {
    const page = params.page ?? 0;
    const pageSize = params.pageSize ?? CUSTOMER_PAGE_SIZE;
    const from = page * pageSize;
    const to = from + pageSize - 1;

    let query = supabase
      .from('customers')
      .select('*', { count: 'exact' })
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      .range(from, to);

    if (params.filter === 'ACTIVE') {
      query = query.eq('is_active', true);
    }

    if (params.search?.trim()) {
      const q = params.search.trim();
      query = query.or(
        `first_name.ilike.%${q}%,last_name.ilike.%${q}%,phone.ilike.%${q}%,email.ilike.%${q}%`,
      );
    }

    const { data, error, count } = await query;
    if (error) throw mapError(error, 'Müşteriler yüklenirken bir sorun oluştu.');

    const customers = (data ?? []) as Customer[];
    const ids = customers.map((c) => c.id);
    const statsMap = new Map<string, CustomerStats>();

    if (ids.length > 0) {
      const { data: summaries } = await supabase
        .from('customer_rental_summary')
        .select('*')
        .in('customer_id', ids);

      for (const row of (summaries ?? []) as Array<{
        customer_id: string;
        rental_count: number;
        total_spend: number;
        total_paid: number;
        open_balance: number;
        last_rental_date: string | null;
      }>) {
        statsMap.set(row.customer_id, {
          rental_count: Number(row.rental_count ?? 0),
          total_spend: Number(row.total_spend ?? 0),
          total_paid: Number(row.total_paid ?? 0),
          open_balance: Number(row.open_balance ?? 0),
          last_rental_date: row.last_rental_date,
        });
      }
    }

    let items: CustomerListItem[] = customers.map((c) => {
      const s = statsMap.get(c.id);
      return {
        ...c,
        rental_count: s?.rental_count ?? 0,
        total_spend: s?.total_spend ?? 0,
        open_balance: s?.open_balance ?? 0,
        last_rental_date: s?.last_rental_date ?? null,
      };
    });

    if (params.filter === 'HAS_RENTALS') {
      items = items.filter((c) => c.rental_count > 0);
    }
    if (params.filter === 'HAS_BALANCE') {
      items = items.filter((c) => c.open_balance > 0);
    }

    const total = count ?? items.length;
    return {
      items,
      page,
      hasMore: from + customers.length < total,
    };
  },

  async getCustomer(id: string): Promise<Customer> {
    const { data, error } = await supabase
      .from('customers')
      .select('*')
      .eq('id', id)
      .is('deleted_at', null)
      .single();
    if (error || !data) throw mapError(error, 'Müşteri bilgileri yüklenemedi.');
    return data as Customer;
  },

  async getCustomerStats(id: string): Promise<CustomerStats> {
    const { data, error } = await supabase.rpc('get_customer_stats' as never, {
      p_customer_id: id,
    } as never);
    if (error || !data) throw mapError(error, 'Müşteri özeti yüklenemedi.');
    const row = data as CustomerStats;
    return {
      rental_count: Number(row.rental_count ?? 0),
      total_spend: Number(row.total_spend ?? 0),
      total_paid: Number(row.total_paid ?? 0),
      open_balance: Number(row.open_balance ?? 0),
      last_rental_date: row.last_rental_date ?? null,
    };
  },

  async getCustomerRentals(id: string): Promise<CustomerRentalItem[]> {
    const { data, error } = await supabase
      .from('rentals')
      .select('*, vehicles(brand, model, plate)')
      .eq('customer_id', id)
      .is('deleted_at', null)
      .order('start_date', { ascending: false })
      .limit(50);

    if (error) throw mapError(error, 'Kiralama geçmişi yüklenemedi.');

    return (
      (data ?? []) as Array<
        Rental & {
          vehicles: { brand: string; model: string; plate: string } | null;
        }
      >
    ).map((row) => ({
      ...row,
      vehicle_brand: row.vehicles?.brand ?? '—',
      vehicle_model: row.vehicles?.model ?? '',
      vehicle_plate: row.vehicles?.plate ?? '—',
      payment_status: computePaymentStatus(
        Number(row.total_amount),
        Number(row.paid_amount),
      ),
    }));
  },

  async createCustomer(
    input: Omit<Customer, 'id' | 'organization_id' | 'created_at' | 'updated_at' | 'deleted_at'>,
  ): Promise<Customer> {
    const { organizationId } = await orgId();
    const { data, error } = await supabase
      .from('customers')
      .insert({
        ...input,
        organization_id: organizationId,
        is_active: true,
      } as never)
      .select('*')
      .single();

    if (error || !data) throw mapError(error, 'Bu müşteri kaydedilemedi.');
    const customer = data as Customer;
    await writeAudit('CREATE_CUSTOMER', customer.id, {
      // Avoid logging national_id / license
      phone_present: Boolean(customer.phone),
    });
    return customer;
  },

  async updateCustomer(
    id: string,
    input: Partial<Customer>,
  ): Promise<Customer> {
    const { data, error } = await supabase
      .from('customers')
      .update(input as never)
      .eq('id', id)
      .is('deleted_at', null)
      .select('*')
      .single();
    if (error || !data) throw mapError(error, 'Müşteri güncellenemedi.');
    await writeAudit('UPDATE_CUSTOMER', id, { fields: Object.keys(input) });
    return data as Customer;
  },

  async archiveCustomer(id: string): Promise<{
    customer: Customer;
    hadHistory: boolean;
  }> {
    const { data: history } = await supabase
      .from('rentals')
      .select('id')
      .eq('customer_id', id)
      .is('deleted_at', null)
      .limit(1);

    const { data, error } = await supabase.rpc('archive_customer' as never, {
      p_customer_id: id,
    } as never);
    if (error || !data) throw mapError(error, 'Müşteri pasife alınamadı.');
    return {
      customer: data as Customer,
      hadHistory: (history ?? []).length > 0,
    };
  },
};
