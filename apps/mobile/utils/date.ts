import { format, parseISO, isValid } from 'date-fns';
import { tr } from 'date-fns/locale';
import { formatInTimeZone, toZonedTime } from 'date-fns-tz';

export const APP_TIMEZONE = 'Europe/Istanbul';

function toDate(value: Date | string): Date {
  if (value instanceof Date) return value;
  const parsed = parseISO(value);
  return isValid(parsed) ? parsed : new Date(value);
}

/** DD.MM.YYYY */
export function formatDate(value: Date | string | null | undefined): string {
  if (!value) return '—';
  try {
    return formatInTimeZone(toDate(value), APP_TIMEZONE, 'dd.MM.yyyy');
  } catch {
    return '—';
  }
}

/** HH:mm */
export function formatTime(value: string | Date | null | undefined): string {
  if (!value) return '—';
  try {
    if (typeof value === 'string' && /^\d{2}:\d{2}/.test(value)) {
      return value.slice(0, 5);
    }
    return formatInTimeZone(toDate(value), APP_TIMEZONE, 'HH:mm');
  } catch {
    return '—';
  }
}

/** "15 Ağustos" / "Bugün, 15 Ağustos" */
export function formatFriendlyDate(
  value: Date | string,
  options?: { withTodayPrefix?: boolean },
): string {
  const zoned = toZonedTime(toDate(value), APP_TIMEZONE);
  const label = format(zoned, 'd MMMM', { locale: tr });
  if (options?.withTodayPrefix) {
    return `Bugün, ${label}`;
  }
  return label;
}

export function getTodayInIstanbul(): Date {
  return toZonedTime(new Date(), APP_TIMEZONE);
}
