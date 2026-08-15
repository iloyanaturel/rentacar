import { Stack } from 'expo-router';
import { colors } from '@/theme';

export default function MoreLayout() {
  return (
    <Stack
      screenOptions={{
        headerTintColor: colors.primary,
        headerStyle: { backgroundColor: colors.surface },
        headerTitleStyle: { fontFamily: 'Outfit_600SemiBold' },
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Screen name="index" options={{ title: 'Daha Fazla' }} />
      <Stack.Screen name="profile" options={{ title: 'Profil' }} />
      <Stack.Screen name="payments" options={{ title: 'Ödemeler' }} />
      <Stack.Screen name="expenses" options={{ title: 'Masraflar' }} />
      <Stack.Screen name="maintenance" options={{ title: 'Bakım' }} />
      <Stack.Screen name="reports" options={{ title: 'Raporlar' }} />
      <Stack.Screen name="notifications" options={{ title: 'Bildirimler' }} />
      <Stack.Screen name="settings" options={{ title: 'Ayarlar' }} />
    </Stack>
  );
}
