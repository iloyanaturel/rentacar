import { supabase } from '@/lib/supabase';
import { getErrorMessage } from '@/utils/errors';

export type FinancialSummary = {
  from: string;
  to: string;
  revenue: number;
  collected: number;
  outstanding: number;
  expenses: number;
  net_income: number;
};

export type MonthlyFinanceRow = {
  month_start: string;
  revenue: number;
  collected: number;
  expenses: number;
  net_income: number;
};

export type VehiclePerformance = {
  vehicle_id: string;
  plate: string;
  brand: string;
  model: string;
  rental_count: number;
  rental_days: number;
  revenue: number;
  expenses: number;
  net_income: number;
  occupancy_rate: number;
  period_days: number;
};

export type CustomerPerformance = {
  customer_id: string;
  first_name: string;
  last_name: string;
  phone: string | null;
  rental_count: number;
  total_spend: number;
  total_paid: number;
  open_balance: number;
  last_rental_date: string | null;
};

export type RentalStatistics = {
  total: number;
  active: number;
  completed: number;
  cancelled: number;
  overdue: number;
  reserved: number;
  avg_duration_days: number;
  avg_rental_value: number;
  fleet_occupancy: number;
};

function mapError(error: unknown, fallback: string): Error {
  return new Error(getErrorMessage(error, fallback));
}

async function callRpc<T>(fn: string, args?: object): Promise<T> {
  const { data, error } = await supabase.rpc(fn as never, args as never);
  if (error) throw mapError(error, 'Rapor yüklenemedi.');
  return data as T;
}

async function audit(action: string, metadata: object = {}) {
  try {
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
      entity_type: 'report',
      entity_id: null,
      metadata,
    } as never);
  } catch {
    /* non-blocking */
  }
}

export const reportService = {
  getFinancialSummary(from: string, to: string) {
    return callRpc<FinancialSummary>('get_financial_summary', {
      p_from: from,
      p_to: to,
    });
  },

  async getMonthlyFinancialReport(months = 12) {
    const data = await callRpc<MonthlyFinanceRow[] | null>(
      'get_monthly_financial_report',
      { p_months: months },
    );
    return data ?? [];
  },

  async getVehiclePerformance(from: string, to: string) {
    const data = await callRpc<VehiclePerformance[] | null>(
      'get_vehicle_performance',
      { p_from: from, p_to: to },
    );
    return data ?? [];
  },

  async getCustomerPerformance(from: string, to: string) {
    const data = await callRpc<CustomerPerformance[] | null>(
      'get_customer_performance',
      { p_from: from, p_to: to },
    );
    return data ?? [];
  },

  getRentalStatistics(from: string, to: string) {
    return callRpc<RentalStatistics>('get_rental_statistics', {
      p_from: from,
      p_to: to,
    });
  },

  async getPaymentMethodReport(from: string, to: string) {
    return (
      (await callRpc<
        Array<{ payment_method: string; amount: number; count: number }> | null
      >('get_payment_method_report', { p_from: from, p_to: to })) ?? []
    );
  },

  async getExpenseBreakdown(from: string, to: string) {
    return (
      (await callRpc<
        Array<{ category: string; amount: number; count: number }> | null
      >('get_expense_breakdown', { p_from: from, p_to: to })) ?? []
    );
  },

  getRevenueBreakdown(from: string, to: string) {
    return callRpc<{
      rental_subtotal: number;
      discount: number;
      extra_charge: number;
      late_fee: number;
      total_revenue: number;
      deposit_excluded: number;
    }>('get_revenue_breakdown', { p_from: from, p_to: to });
  },

  async getBrandPerformance(from: string, to: string) {
    return (
      (await callRpc<
        Array<{
          brand: string;
          rental_count: number;
          rental_days: number;
          revenue: number;
        }> | null
      >('get_brand_performance', { p_from: from, p_to: to })) ?? []
    );
  },

  getRentalContractData(rentalId: string) {
    return callRpc<Record<string, unknown>>('get_rental_contract_data', {
      p_rental_id: rentalId,
    });
  },

  async logExport(action: string, metadata: object) {
    await audit(action, metadata);
  },
};
