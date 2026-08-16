import { Redirect } from 'expo-router';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { useAuth } from '@/features/auth';
import { colors, typography } from '@/theme';

export default function Index() {
  const { status } = useAuth();

  if (status === 'loading') {
    return (
      <View style={styles.splash} accessibilityLabel="Yükleniyor">
        <Text style={styles.brand}>RentaFlow</Text>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (status === 'authenticated') {
    return <Redirect href="/(app)/dashboard" />;
  }

  return <Redirect href="/(auth)/login" />;
}

const styles = StyleSheet.create({
  splash: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
    gap: 16,
  },
  brand: {
    ...typography.hero,
    color: colors.primary,
  },
});
