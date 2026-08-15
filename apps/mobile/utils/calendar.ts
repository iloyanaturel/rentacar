import type { RentalStatus } from '@rentaflow/shared';

export type CalendarEvent = {
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
  end_time: string;
  status: RentalStatus;
  display_status: string;
  total_amount: number;
};

export type CalendarViewMode = 'day' | 'week' | 'month';

export function getRangeForView(
  anchor: Date,
  mode: CalendarViewMode,
): { from: string; to: string } {
  const y = anchor.getFullYear();
  const m = anchor.getMonth();
  const d = anchor.getDate();

  if (mode === 'day') {
    const iso = formatIso(anchor);
    return { from: iso, to: iso };
  }
  if (mode === 'week') {
    const day = anchor.getDay();
    const mondayOffset = day === 0 ? -6 : 1 - day;
    const start = new Date(y, m, d + mondayOffset);
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    return { from: formatIso(start), to: formatIso(end) };
  }
  const start = new Date(y, m, 1);
  const end = new Date(y, m + 1, 0);
  return { from: formatIso(start), to: formatIso(end) };
}

function formatIso(d: Date): string {
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mm}-${dd}`;
}

/** Detect overlapping intervals for same vehicle (visual warning). */
export function findVehicleOverlaps(events: CalendarEvent[]): Set<string> {
  const flagged = new Set<string>();
  const byVehicle = new Map<string, CalendarEvent[]>();
  for (const e of events) {
    const list = byVehicle.get(e.vehicle_id) ?? [];
    list.push(e);
    byVehicle.set(e.vehicle_id, list);
  }
  for (const list of byVehicle.values()) {
    for (let i = 0; i < list.length; i++) {
      for (let j = i + 1; j < list.length; j++) {
        const a = list[i];
        const b = list[j];
        if (a.start_date <= b.end_date && b.start_date <= a.end_date) {
          flagged.add(a.rental_id);
          flagged.add(b.rental_id);
        }
      }
    }
  }
  return flagged;
}
