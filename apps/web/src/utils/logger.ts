import { isDebugLoggingEnabled } from '@/config/env';

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

function emit(level: LogLevel, message: string, meta?: unknown) {
  if (level === 'debug' && !isDebugLoggingEnabled()) return;
  const payload = meta === undefined ? message : [message, sanitize(meta)];
  // eslint-disable-next-line no-console
  console[level === 'debug' ? 'log' : level](`[RentaFlow:${level}]`, payload);
}

/** Strip obvious PII keys before logging */
function sanitize(meta: unknown): unknown {
  if (!meta || typeof meta !== 'object') return meta;
  const blocked = new Set([
    'phone',
    'email',
    'address',
    'national_id',
    'password',
    'token',
  ]);
  if (Array.isArray(meta)) return meta.map(sanitize);
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(meta as Record<string, unknown>)) {
    out[k] = blocked.has(k.toLowerCase()) ? '[redacted]' : sanitize(v);
  }
  return out;
}

export const logger = {
  debug: (message: string, meta?: unknown) => emit('debug', message, meta),
  info: (message: string, meta?: unknown) => emit('info', message, meta),
  warn: (message: string, meta?: unknown) => emit('warn', message, meta),
  error: (message: string, meta?: unknown) => emit('error', message, meta),
};
