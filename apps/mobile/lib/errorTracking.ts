/**
 * Optional Sentry bootstrap — no-op until EXPO_PUBLIC_SENTRY_DSN is set.
 * Never send PII. Call initErrorTracking() from root layout.
 */
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { APP_VERSION } from '@/config/app';
import { getAppEnv, isProduction } from '@/config/env';
import { logger } from '@/utils/logger';

type CrashContext = {
  appVersion: string;
  platform: string;
  env: string;
  errorType: string;
};

export function initErrorTracking() {
  const dsn = process.env.EXPO_PUBLIC_SENTRY_DSN;
  if (!dsn) {
    logger.debug('error_tracking.disabled', { reason: 'no_dsn' });
    return;
  }
  logger.info('error_tracking.ready', {
    provider: 'sentry-placeholder',
    env: getAppEnv(),
    production: isProduction(),
  });
  // Install @sentry/react-native and uncomment for production:
  // Sentry.init({
  //   dsn,
  //   environment: getAppEnv(),
  //   release: `rentaflow@${APP_VERSION}`,
  //   sendDefaultPii: false,
  //   tracesSampleRate: isProduction() ? 0.1 : 1.0,
  // });
}

export function captureException(error: unknown, extra?: Record<string, string>) {
  const message = error instanceof Error ? error.message : 'unknown';
  const ctx: CrashContext = {
    appVersion: APP_VERSION,
    platform: Platform.OS,
    env: getAppEnv(),
    errorType: error instanceof Error ? error.name : typeof error,
  };
  logger.error('error_tracking.capture', {
    message,
    ...ctx,
    // strip accidental PII keys from extra
    ...(extra
      ? Object.fromEntries(
          Object.entries(extra).filter(
            ([k]) => !['phone', 'email', 'address', 'password'].includes(k),
          ),
        )
      : {}),
    nativeAppVersion: Constants.nativeAppVersion ?? undefined,
  });
}
