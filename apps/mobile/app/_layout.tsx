import {
  DMSans_400Regular,
  DMSans_500Medium,
  DMSans_600SemiBold,
} from '@expo-google-fonts/dm-sans';
import {
  Outfit_600SemiBold,
  Outfit_700Bold,
} from '@expo-google-fonts/outfit';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from '@/features/auth';
import { AppProviders } from '@/lib/providers';
import { AppErrorBoundary } from '@/components/AppErrorBoundary';
import { OfflineBanner } from '@/components/OfflineBanner';
import { initErrorTracking } from '@/lib/errorTracking';
import { colors, typography } from '@/theme';

export { AppErrorBoundary as ErrorBoundary } from '@/components/AppErrorBoundary';

initErrorTracking();

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded, error] = useFonts({
    DMSans_400Regular,
    DMSans_500Medium,
    DMSans_600SemiBold,
    Outfit_600SemiBold,
    Outfit_700Bold,
  });

  useEffect(() => {
    if (error) throw error;
  }, [error]);

  useEffect(() => {
    if (loaded) {
      void SplashScreen.hideAsync();
    }
  }, [loaded]);

  if (!loaded) {
    return (
      <View style={styles.boot}>
        <Text style={styles.brand}>RentaFlow</Text>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  return (
    <AppErrorBoundary>
      <SafeAreaProvider>
        <AppProviders>
          <AuthProvider>
            <StatusBar style="dark" />
            <OfflineBanner />
            <Stack screenOptions={{ headerShown: false }}>
              <Stack.Screen name="index" />
              <Stack.Screen name="(auth)" />
              <Stack.Screen name="(app)" />
            </Stack>
          </AuthProvider>
        </AppProviders>
      </SafeAreaProvider>
    </AppErrorBoundary>
  );
}

const styles = StyleSheet.create({
  boot: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
    gap: 12,
  },
  brand: {
    ...typography.hero,
    color: colors.primary,
  },
});
