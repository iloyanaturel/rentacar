import { useEffect, useState } from 'react';
import { AppState, StyleSheet, Text, View } from 'react-native';
import { colors, spacing, typography } from '@/theme';

/**
 * Lightweight offline UX — probes the configured Supabase host (not Google),
 * so regional blocks / captive portals don't false-trigger the banner.
 */
export function OfflineBanner() {
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const check = async () => {
      const base = (process.env.EXPO_PUBLIC_SUPABASE_URL ?? '').replace(
        /\/$/,
        '',
      );
      if (!base || /YOUR_|placeholder/i.test(base)) {
        if (!cancelled) setOffline(false);
        return;
      }

      try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 5000);
        // Any HTTP response (including 401/404) means the device has network.
        await fetch(`${base}/auth/v1/health`, {
          method: 'GET',
          signal: controller.signal,
        });
        clearTimeout(timer);
        if (!cancelled) setOffline(false);
      } catch {
        if (!cancelled) setOffline(true);
      }
    };

    void check();
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'active') void check();
    });
    const interval = setInterval(() => void check(), 30_000);

    return () => {
      cancelled = true;
      sub.remove();
      clearInterval(interval);
    };
  }, []);

  if (!offline) return null;

  return (
    <View style={styles.banner} accessibilityRole="alert">
      <Text style={styles.text}>Bağlantı yok — internet bağlantınızı kontrol edin.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    backgroundColor: colors.danger,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  text: {
    ...typography.caption,
    color: colors.textInverse,
    textAlign: 'center',
  },
});
