/**
 * Privacy-friendly analytics — no PII in payloads.
 * Wire a provider (PostHog/Amplitude/etc.) only with allow-listed event names.
 */
import { APP_VERSION } from '@/config/app';
import { getAppEnv } from '@/config/env';
import { logger } from '@/utils/logger';
import { Platform } from 'react-native';

export type AnalyticsEvent =
  | 'APP_OPENED'
  | 'LOGIN'
  | 'LOGOUT'
  | 'VEHICLE_CREATED'
  | 'CUSTOMER_CREATED'
  | 'RENTAL_CREATED'
  | 'PAYMENT_CREATED'
  | 'HANDOVER_COMPLETED'
  | 'RETURN_COMPLETED'
  | 'REPORT_VIEWED'
  | 'PDF_GENERATED'
  | 'EXPORT_CREATED';

const BLOCKED_KEYS = new Set([
  'phone',
  'email',
  'address',
  'national_id',
  'password',
  'token',
  'full_name',
  'customer_name',
  'plate',
]);

function sanitizeProps(
  props?: Record<string, string | number | boolean | null | undefined>,
): Record<string, string | number | boolean> {
  if (!props) return {};
  const out: Record<string, string | number | boolean> = {};
  for (const [k, v] of Object.entries(props)) {
    if (BLOCKED_KEYS.has(k.toLowerCase())) continue;
    if (v === null || v === undefined) continue;
    out[k] = v;
  }
  return out;
}

export function track(
  event: AnalyticsEvent,
  props?: Record<string, string | number | boolean | null | undefined>,
): void {
  const payload = {
    event,
    ...sanitizeProps(props),
    app_version: APP_VERSION,
    platform: Platform.OS,
    env: getAppEnv(),
  };
  // Provider hook: replace with real SDK when EXPO_PUBLIC_ANALYTICS_KEY is set.
  if (process.env.EXPO_PUBLIC_ANALYTICS_KEY) {
    logger.debug('analytics.emit', { event });
  } else {
    logger.debug('analytics.noop', { event });
  }
  void payload;
}
