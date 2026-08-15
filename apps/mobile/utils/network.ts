import Constants from 'expo-constants';

/** Lightweight connectivity probe before financial / handover mutations. */
export async function assertOnline(): Promise<void> {
  const base =
    process.env.EXPO_PUBLIC_SUPABASE_URL ||
    (Constants.expoConfig?.extra as { supabaseUrl?: string } | undefined)
      ?.supabaseUrl ||
    '';
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 5000);
    const target = base
      ? `${base.replace(/\/$/, '')}/auth/v1/health`
      : 'https://example.com';
    await fetch(target, { method: 'GET', signal: controller.signal });
    clearTimeout(timer);
  } catch {
    throw new Error('İnternet bağlantınızı kontrol edin.');
  }
}

export function newIdempotencyKey(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}
