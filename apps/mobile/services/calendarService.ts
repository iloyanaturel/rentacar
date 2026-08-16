import { supabase } from '@/lib/supabase';
import { getErrorMessage } from '@/utils/errors';
import type { CalendarEvent } from '@/utils/calendar';

export type { CalendarEvent, CalendarViewMode } from '@/utils/calendar';
export { getRangeForView, findVehicleOverlaps } from '@/utils/calendar';

function mapError(error: unknown, fallback: string): Error {
  return new Error(getErrorMessage(error, fallback));
}

export const calendarService = {
  async getRentals(params: {
    from: string;
    to: string;
    vehicleId?: string;
    status?: string;
    customerQ?: string;
  }): Promise<CalendarEvent[]> {
    const { data, error } = await supabase.rpc('get_calendar_rentals' as never, {
      p_from: params.from,
      p_to: params.to,
      p_vehicle_id: params.vehicleId ?? null,
      p_status: params.status ?? null,
      p_customer_q: params.customerQ ?? null,
    } as never);
    if (error) throw mapError(error, 'Takvim verileri yüklenemedi.');
    return (data ?? []) as CalendarEvent[];
  },
};
