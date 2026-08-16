import type { PaymentStatus, RentalStatus } from '@rentaflow/shared';
import { supabase } from '@/lib/supabase';
import { getErrorMessage } from '@/utils/errors';

export type DashboardSummary = {
  today: string;
  vehicles: {
    total: number;
    available: number;
    rented: number;
    maintenance: number;
    inactive: number;
  };
  finance: {
    month_rental_count: number;
    month_booked_amount: number;
    month_collected_amount: number;
    outstanding_amount: number;
    today_booked_amount: number;
  };
};

export type TodayReturn = {
  rental_id: string;
  vehicle_id: string;
  plate: string;
  brand: string;
  model: string;
  customer_id: string;
  customer_name: string;
  end_date: string;
  end_time: string;
  total_amount: number;
  paid_amount: number;
  remaining_amount: number;
  status: RentalStatus;
  payment_status: PaymentStatus;
};

export type UpcomingRental = {
  rental_id: string;
  vehicle_id: string;
  plate: string;
  brand: string;
  model: string;
  customer_id: string;
  customer_name: string;
  start_date: string;
  start_time: string;
  end_date: string;
  total_amount: number;
  status: RentalStatus;
};

async function callRpc<T>(fn: string, args?: object): Promise<T> {
  const { data, error } = await supabase.rpc(fn as never, args as never);
  if (error) {
    throw new Error(getErrorMessage(error, 'Veriler yüklenirken bir sorun oluştu.'));
  }
  return data as T;
}

export const dashboardService = {
  async getDashboardStats(): Promise<DashboardSummary> {
    return callRpc<DashboardSummary>('get_dashboard_summary');
  },

  async getTodayReturns(): Promise<TodayReturn[]> {
    const rows = await callRpc<TodayReturn[]>('get_today_returns');
    return rows ?? [];
  },

  async getUpcomingRentals(days = 7): Promise<UpcomingRental[]> {
    const rows = await callRpc<UpcomingRental[]>('get_upcoming_rentals', {
      p_days: days,
    });
    return rows ?? [];
  },

  async getTodayHandovers(): Promise<
    Array<{
      rental_id: string;
      vehicle_id: string;
      plate: string;
      brand: string;
      model: string;
      customer_name: string;
      start_date: string;
      start_time: string;
      status: RentalStatus;
    }>
  > {
    const rows = await callRpc<
      Array<{
        rental_id: string;
        vehicle_id: string;
        plate: string;
        brand: string;
        model: string;
        customer_name: string;
        start_date: string;
        start_time: string;
        status: RentalStatus;
      }>
    >('get_today_handovers');
    return rows ?? [];
  },

  async getOutstandingPayments(): Promise<
    Array<{
      rental_id: string;
      plate: string;
      customer_name: string;
      total_amount: number;
      paid_amount: number;
      remaining_amount: number;
      status: RentalStatus;
    }>
  > {
    const rows = await callRpc<
      Array<{
        rental_id: string;
        plate: string;
        customer_name: string;
        total_amount: number;
        paid_amount: number;
        remaining_amount: number;
        status: RentalStatus;
      }>
    >('get_outstanding_payments');
    return rows ?? [];
  },

  async getOverdueRentals(): Promise<
    Array<{
      rental_id: string;
      plate: string;
      customer_name: string;
      end_date: string;
      end_time: string;
      remaining_amount: number;
    }>
  > {
    const rows = await callRpc<
      Array<{
        rental_id: string;
        plate: string;
        customer_name: string;
        end_date: string;
        end_time: string;
        remaining_amount: number;
      }>
    >('get_overdue_rentals');
    return rows ?? [];
  },

  getVehicleStatusSummary(summary: DashboardSummary) {
    return [
      { key: 'AVAILABLE' as const, label: 'Müsait', value: summary.vehicles.available },
      { key: 'RENTED' as const, label: 'Kirada', value: summary.vehicles.rented },
      { key: 'MAINTENANCE' as const, label: 'Bakımda', value: summary.vehicles.maintenance },
      { key: 'INACTIVE' as const, label: 'Pasif', value: summary.vehicles.inactive },
    ];
  },

  getMonthlyFinancialSummary(summary: DashboardSummary) {
    return summary.finance;
  },

  async getOpsTodaySummary(): Promise<{
    handovers_today: number;
    returns_today: number;
    overdue: number;
    payments_due: number;
    maintenance_upcoming: number;
    documents_expiring: number;
  }> {
    return callRpc('get_ops_today_summary');
  },
};
