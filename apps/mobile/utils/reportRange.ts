import { endOfMonth, endOfWeek, endOfYear, format, startOfMonth, startOfWeek, startOfYear, subMonths } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';

/** Keep in sync with utils/date APP_TIMEZONE — avoid .ts extension for dual tsc/node runners */
const APP_TIMEZONE = 'Europe/Istanbul';

export type ReportPreset =
  | 'today'
  | 'this_week'
  | 'this_month'
  | 'last_month'
  | 'this_year'
  | 'custom';

export type DateRange = { from: string; to: string; preset: ReportPreset };

function iso(d: Date): string {
  return format(d, 'yyyy-MM-dd');
}

function todayLocal(): Date {
  const z = toZonedTime(new Date(), APP_TIMEZONE);
  z.setHours(12, 0, 0, 0);
  return z;
}

export function getRangeForPreset(
  preset: ReportPreset,
  custom?: { from: string; to: string },
): DateRange {
  const today = todayLocal();
  if (preset === 'custom' && custom?.from && custom?.to) {
    return { from: custom.from, to: custom.to, preset };
  }
  switch (preset) {
    case 'today':
      return { from: iso(today), to: iso(today), preset };
    case 'this_week': {
      const from = startOfWeek(today, { weekStartsOn: 1 });
      const to = endOfWeek(today, { weekStartsOn: 1 });
      return { from: iso(from), to: iso(to), preset };
    }
    case 'last_month': {
      const last = subMonths(today, 1);
      return { from: iso(startOfMonth(last)), to: iso(endOfMonth(last)), preset };
    }
    case 'this_year':
      return { from: iso(startOfYear(today)), to: iso(endOfYear(today)), preset };
    case 'this_month':
    default:
      return {
        from: iso(startOfMonth(today)),
        to: iso(endOfMonth(today)),
        preset: 'this_month',
      };
  }
}

export const REPORT_PRESETS: { key: ReportPreset; label: string }[] = [
  { key: 'today', label: 'Bugün' },
  { key: 'this_week', label: 'Bu Hafta' },
  { key: 'this_month', label: 'Bu Ay' },
  { key: 'last_month', label: 'Geçen Ay' },
  { key: 'this_year', label: 'Bu Yıl' },
  { key: 'custom', label: 'Özel Tarih' },
];
