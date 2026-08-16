/**
 * Runtime environment helpers — production vs development.
 * Never put service-role or secrets in EXPO_PUBLIC_* vars.
 */
export type AppEnv = 'development' | 'preview' | 'production';

export function getAppEnv(): AppEnv {
  const raw = (process.env.APP_ENV ?? process.env.EXPO_PUBLIC_APP_ENV ?? '').toLowerCase();
  if (raw === 'production' || raw === 'preview') return raw;
  if (__DEV__) return 'development';
  return 'production';
}

export function isProduction(): boolean {
  return getAppEnv() === 'production';
}

export function isDebugLoggingEnabled(): boolean {
  return !isProduction() || process.env.EXPO_PUBLIC_DEBUG_LOGS === '1';
}
