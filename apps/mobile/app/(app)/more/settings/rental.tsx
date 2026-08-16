import { useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text } from 'react-native';
import { Button, ErrorState, Input, LoadingSkeleton } from '@/components/ui';
import {
  useOrganizationSettings,
  usePermissions,
  useUpdateOrganizationSettings,
} from '@/features/settings';
import { getErrorMessage } from '@/utils/errors';
import { colors, spacing, typography } from '@/theme';

export default function RentalSettingsScreen() {
  const { can } = usePermissions();
  const settings = useOrganizationSettings();
  const update = useUpdateOrganizationSettings();

  const [deposit, setDeposit] = useState('');
  const [kmLimit, setKmLimit] = useState('');
  const [extraKm, setExtraKm] = useState('');
  const [tolerance, setTolerance] = useState('');
  const [lateFee, setLateFee] = useState('');

  useEffect(() => {
    const s = settings.data;
    if (!s) return;
    setDeposit(String(s.default_deposit_amount ?? 0));
    setKmLimit(
      s.default_daily_km_limit == null ? '' : String(s.default_daily_km_limit),
    );
    setExtraKm(String(s.extra_km_price ?? 0));
    setTolerance(String(s.late_return_tolerance_minutes ?? 60));
    setLateFee(String(s.late_return_fee ?? 0));
  }, [settings.data]);

  if (!can('settings.update')) {
    return <ErrorState message="Bu işlem için yetkiniz bulunmuyor." />;
  }
  if (settings.isLoading) return <LoadingSkeleton />;
  if (settings.isError) {
    return (
      <ErrorState
        message="Ayarlar yüklenemedi."
        onRetry={() => void settings.refetch()}
      />
    );
  }

  const save = () => {
    void update
      .mutateAsync({
        default_deposit_amount: Number(deposit) || 0,
        default_daily_km_limit: kmLimit.trim() === '' ? null : Number(kmLimit),
        extra_km_price: Number(extraKm) || 0,
        late_return_tolerance_minutes: Number(tolerance) || 0,
        late_return_fee: Number(lateFee) || 0,
        onboarding_rental_done: true,
        onboarding_completed:
          Boolean(settings.data?.onboarding_business_done) &&
          Boolean(settings.data?.onboarding_vehicle_done),
      })
      .then(() =>
        Alert.alert(
          'Kaydedildi',
          'Yeni kiralamalar bu değerleri snapshot olarak kullanır. Eski kiralamalar değişmez.',
        ),
      )
      .catch((e: unknown) =>
        Alert.alert('Hata', getErrorMessage(e, 'Kaydedilemedi.')),
      );
  };

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.hint}>
        Günlük km limiti × kiralama günü = toplam km limiti (snapshot).
      </Text>
      <Input
        label="Varsayılan depozito (₺)"
        value={deposit}
        onChangeText={setDeposit}
        keyboardType="decimal-pad"
      />
      <Input
        label="Varsayılan günlük km limiti"
        value={kmLimit}
        onChangeText={setKmLimit}
        keyboardType="number-pad"
        placeholder="örn. 300"
      />
      <Input
        label="Ek km ücreti (₺)"
        value={extraKm}
        onChangeText={setExtraKm}
        keyboardType="decimal-pad"
      />
      <Input
        label="Geç teslim toleransı (dk)"
        value={tolerance}
        onChangeText={setTolerance}
        keyboardType="number-pad"
      />
      <Input
        label="Geç teslim ücreti (₺)"
        value={lateFee}
        onChangeText={setLateFee}
        keyboardType="decimal-pad"
      />
      <Button title="Kaydet" onPress={save} loading={update.isPending} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, gap: spacing.md },
  hint: { ...typography.caption, color: colors.textSecondary },
});
