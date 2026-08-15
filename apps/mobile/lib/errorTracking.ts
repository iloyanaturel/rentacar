/**
 * Optional Sentry bootstrap — no-op until EXPO_PUBLIC_SENTRY_DSN is set.
 * Keeps PII out of events; call initErrorTracking() from root layout.
 */
import { logger } from '@/utils/logger';

export function initErrorTracking() {
  const dsn = process.env.EXPO_PUBLIC_SENTRY_DSN;
  if (!dsn) {
    logger.debug('error_tracking.disabled', { reason: 'no_dsn' });
    return;
  }
  logger.info('error_tracking.ready', { provider: 'sentry-placeholder' });
  // Install @sentry/react-native and uncomment:
  // Sentry.init({ dsn, sendDefaultPii: false, tracesSampleRate: 0.1 });
}

export function captureException(error: unknown) {
  logger.error('error_tracking.capture', {
    message: error instanceof Error ? error.message : 'unknown',
  });
}
