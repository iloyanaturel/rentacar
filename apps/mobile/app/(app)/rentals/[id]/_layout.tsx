import { Stack } from 'expo-router';
import { colors } from '@/theme';

export default function RentalIdLayout() {
  return (
    <Stack
      screenOptions={{
        headerTintColor: colors.primary,
        headerStyle: { backgroundColor: colors.surface },
        headerTitleStyle: { fontFamily: 'Outfit_600SemiBold' },
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Screen name="index" options={{ title: 'Kiralama Detayı' }} />
      <Stack.Screen name="edit" options={{ title: 'Kiralama Düzenle' }} />
      <Stack.Screen name="payment" options={{ title: 'Ödeme Ekle' }} />
      <Stack.Screen name="handover" options={{ title: 'Araç Teslimi' }} />
      <Stack.Screen name="return" options={{ title: 'Araç İadesi' }} />
    </Stack>
  );
}
