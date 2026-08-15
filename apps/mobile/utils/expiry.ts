import { differenceInCalendarDays, format, parseISO, isValid } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';

const APP_TIMEZONE = 'Europe/Istanbul';

export type ExpiryLevel = 'ok' | 'warning' | 'critical' | 'expired' | 'none';

export type ExpiryStatus = {
  level: ExpiryLevel;
  daysRemaining: number | null;
  label: string;
  dateLabel: string;
};

function toLocalDate(value: string | Date): Date {
  if (value instanceof Date) return toZonedTime(value, APP_TIMEZONE);
  const parsed = parseISO(value.length === 10 ? `${value}T12:00:00` : value);
  return toZonedTime(isValid(parsed) ? parsed : new Date(value), APP_TIMEZONE);
}

function formatDateLabel(value: string | Date): string {
  try {
    return format(toLocalDate(value), 'dd.MM.yyyy');
  } catch {
    return '—';
  }
}

/**
 * Document expiry helper for insurance / casco / inspection.
 * warning: ≤ 30 days, critical: ≤ 7 days, expired: past
 */
export function getExpiryStatus(
  date: string | Date | null | undefined,
): ExpiryStatus {
  if (!date) {
    return {
      level: 'none',
      daysRemaining: null,
      label: 'Belirtilmedi',
      dateLabel: '—',
    };
  }

  const today = toZonedTime(new Date(), APP_TIMEZONE);
  today.setHours(0, 0, 0, 0);
  const target = toLocalDate(date);
  target.setHours(0, 0, 0, 0);
  const days = differenceInCalendarDays(target, today);
  const dateLabel = formatDateLabel(date);

  if (days < 0) {
    return {
      level: 'expired',
      daysRemaining: days,
      label: 'Geçmiş',
      dateLabel,
    };
  }
  if (days <= 7) {
    return {
      level: 'critical',
      daysRemaining: days,
      label: days === 0 ? 'Bugün bitiyor' : `${days} gün kaldı`,
      dateLabel,
    };
  }
  if (days <= 30) {
    return {
      level: 'warning',
      daysRemaining: days,
      label: `${days} gün kaldı`,
      dateLabel,
    };
  }
  return {
    level: 'ok',
    daysRemaining: days,
    label: `${days} gün kaldı`,
    dateLabel,
  };
}
