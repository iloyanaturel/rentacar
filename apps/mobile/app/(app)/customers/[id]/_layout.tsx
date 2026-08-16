import { Stack } from 'expo-router';
import { colors } from '@/theme';

export default function CustomerIdLayout() {
  return (
    <Stack
      screenOptions={{
        headerTintColor: colors.primary,
        headerStyle: { backgroundColor: colors.surface },
        headerTitleStyle: { fontFamily: 'Outfit_600SemiBold' },
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Screen name="index" options={{ title: 'Müşteri Detayı' }} />
      <Stack.Screen name="edit" options={{ title: 'Müşteri Düzenle' }} />
    </Stack>
  );
}
