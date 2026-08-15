import { useEffect, useState } from 'react';
import { AppState, StyleSheet, Text, View } from 'react-native';
import { colors, spacing, typography } from '@/theme';

/**
 * Lightweight offline UX — polls reachability without a native NetInfo dep.
 * Full offline mode is out of scope for STEP 9.
 */
export function OfflineBanner() {
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const check = async () => {
      try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 4000);
        await fetch('https://clients3.google.com/generate_204', {
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
