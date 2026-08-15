import * as ImageManipulator from 'expo-image-manipulator';
import type { ExpenseCategory } from '@rentaflow/shared';
import { supabase } from '@/lib/supabase';
import { getErrorMessage } from '@/utils/errors';

export type ExpenseItem = {
  id: string;
  vehicle_id: string | null;
  category: ExpenseCategory;
  amount: number;
  expense_date: string;
  description: string | null;
  receipt_url: string | null;
  vendor: string | null;
  notes: string | null;
  maintenance_id: string | null;
  vehicle_plate?: string;
  vehicle_brand?: string;
};

export type ExpenseSummary = {
  month: number;
  year: number;
  total: number;
};

function mapError(error: unknown, fallback: string): Error {
  return new Error(getErrorMessage(error, fallback));
}

async function orgId(): Promise<string> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Oturum bulunamadı.');
  const { data } = await supabase
    .from('profiles')
    .select('organization_id')
    .eq('id', user.id)
    .single();
  const id = (data as { organization_id?: string } | null)?.organization_id;
  if (!id) throw new Error('Organizasyon bulunamadı.');
  return id;
}

export const expenseService = {
  async getExpenses(params?: {
    vehicleId?: string;
    category?: ExpenseCategory;
    from?: string;
    to?: string;
    search?: string;
  }): Promise<ExpenseItem[]> {
    let query = supabase
      .from('expenses')
      .select('*, vehicles(plate, brand)')
      .is('deleted_at', null)
      .order('expense_date', { ascending: false })
      .limit(100);

    if (params?.vehicleId) query = query.eq('vehicle_id', params.vehicleId);
    if (params?.category) query = query.eq('category', params.category);
    if (params?.from) query = query.gte('expense_date', params.from);
    if (params?.to) query = query.lte('expense_date', params.to);

    const { data, error } = await query;
    if (error) throw mapError(error, 'Masraflar yüklenemedi.');

    let items = (
      (data ?? []) as Array<
        ExpenseItem & { vehicles: { plate: string; brand: string } | null }
      >
    ).map((row) => ({
      ...row,
      vehicle_plate: row.vehicles?.plate,
      vehicle_brand: row.vehicles?.brand,
    }));

    if (params?.search?.trim()) {
      const q = params.search.trim().toLowerCase();
      items = items.filter(
        (i) =>
          (i.description ?? '').toLowerCase().includes(q) ||
          (i.vendor ?? '').toLowerCase().includes(q) ||
          (i.vehicle_plate ?? '').toLowerCase().includes(q),
      );
    }
    return items;
  },

  async getVehicleExpenses(vehicleId: string): Promise<ExpenseItem[]> {
    return this.getExpenses({ vehicleId });
  },

  async getVehicleExpenseSummary(vehicleId: string): Promise<ExpenseSummary> {
    const items = await this.getVehicleExpenses(vehicleId);
    const now = new Date();
    const y = now.getFullYear();
    const m = now.getMonth() + 1;
    const month = items
      .filter((i) => {
        const [yy, mm] = i.expense_date.split('-').map(Number);
        return yy === y && mm === m;
      })
      .reduce((s, i) => s + Number(i.amount), 0);
    const year = items
      .filter((i) => i.expense_date.startsWith(String(y)))
      .reduce((s, i) => s + Number(i.amount), 0);
    const total = items.reduce((s, i) => s + Number(i.amount), 0);
    return { month, year, total };
  },

  async createExpense(input: {
    vehicleId: string;
    category: ExpenseCategory;
    amount: number;
    expenseDate: string;
    description?: string;
    vendor?: string;
    notes?: string;
    receiptUri?: string;
  }): Promise<ExpenseItem> {
    const organizationId = await orgId();
    let receiptUrl: string | null = null;

    if (input.receiptUri) {
      receiptUrl = await this.uploadReceipt(
        organizationId,
        input.vehicleId,
        input.receiptUri,
      );
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { data, error } = await supabase
      .from('expenses')
      .insert({
        organization_id: organizationId,
        vehicle_id: input.vehicleId,
        category: input.category,
        amount: input.amount,
        expense_date: input.expenseDate,
        description: input.description ?? null,
        vendor: input.vendor ?? null,
        notes: input.notes ?? null,
        receipt_url: receiptUrl,
        created_by: user?.id ?? null,
      } as never)
      .select('*')
      .single();

    if (error || !data) throw mapError(error, 'Masraf kaydedilemedi.');

    await supabase.from('audit_logs').insert({
      organization_id: organizationId,
      user_id: user?.id ?? null,
      action: 'CREATE_EXPENSE',
      entity_type: 'expense',
      entity_id: (data as ExpenseItem).id,
      metadata: { amount: input.amount, category: input.category },
    } as never);

    return data as ExpenseItem;
  },

  async softDeleteExpense(id: string): Promise<void> {
    const { error } = await supabase
      .from('expenses')
      .update({ deleted_at: new Date().toISOString() } as never)
      .eq('id', id);
    if (error) throw mapError(error, 'Masraf silinemedi.');

    const {
      data: { user },
    } = await supabase.auth.getUser();
    const { data: profile } = await supabase
      .from('profiles')
      .select('organization_id')
      .eq('id', user?.id ?? '')
      .single();
    await supabase.from('audit_logs').insert({
      organization_id: (profile as { organization_id?: string } | null)
        ?.organization_id,
      user_id: user?.id ?? null,
      action: 'DELETE_EXPENSE',
      entity_type: 'expense',
      entity_id: id,
      metadata: {},
    } as never);
  },

  async uploadReceipt(
    organizationId: string,
    vehicleId: string,
    localUri: string,
  ): Promise<string> {
    const manipulated = await ImageManipulator.manipulateAsync(
      localUri,
      [{ resize: { width: 1600 } }],
      { compress: 0.75, format: ImageManipulator.SaveFormat.JPEG },
    );
    const response = await fetch(manipulated.uri);
    const buffer = await response.arrayBuffer();
    const path = `${organizationId}/expenses/${vehicleId}/${Date.now()}.jpg`;
    const { error } = await supabase.storage
      .from('documents')
      .upload(path, buffer, { contentType: 'image/jpeg', upsert: false });
    if (error) throw mapError(error, 'Fiş yüklenemedi.');
    const { data: signed } = await supabase.storage
      .from('documents')
      .createSignedUrl(path, 60 * 60 * 24 * 30);
    return signed?.signedUrl ?? path;
  },
};
