import { Stack } from 'expo-router';
import { colors } from '@/theme';

export default function SettingsLayout() {
  return (
    <Stack
      screenOptions={{
        headerTintColor: colors.primary,
        headerStyle: { backgroundColor: colors.surface },
        headerTitleStyle: { fontFamily: 'Outfit_600SemiBold' },
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Screen name="index" options={{ title: 'Ayarlar' }} />
      <Stack.Screen name="business" options={{ title: 'İşletme' }} />
      <Stack.Screen name="users" options={{ title: 'Kullanıcılar' }} />
      <Stack.Screen name="roles" options={{ title: 'Roller ve Yetkiler' }} />
      <Stack.Screen name="rental" options={{ title: 'Kiralama Ayarları' }} />
      <Stack.Screen name="notifications" options={{ title: 'Bildirimler' }} />
      <Stack.Screen name="contract" options={{ title: 'Sözleşme' }} />
      <Stack.Screen name="finance" options={{ title: 'Finans' }} />
      <Stack.Screen name="security" options={{ title: 'Güvenlik' }} />
      <Stack.Screen name="app" options={{ title: 'Uygulama' }} />
      <Stack.Screen name="support" options={{ title: 'Destek' }} />
      <Stack.Screen name="about" options={{ title: 'Hakkında' }} />
      <Stack.Screen name="legal" options={{ title: 'Yasal' }} />
    </Stack>
  );
}
