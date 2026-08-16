import { useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { Button, ErrorState, Input, LoadingSkeleton } from '@/components/ui';
import {
  useOrganizationSettings,
  usePermissions,
  useUpdateOrganizationSettings,
} from '@/features/settings';
import { getErrorMessage } from '@/utils/errors';
import { colors, spacing, typography } from '@/theme';

const CURRENCIES = ['TRY', 'EUR', 'USD', 'GBP'] as const;

export default function FinanceSettingsScreen() {
  const { can } = usePermissions();
  const settings = useOrganizationSettings();
  const update = useUpdateOrganizationSettings();

  const [currency, setCurrency] = useState('TRY');
  const [timezone, setTimezone] = useState('Europe/Istanbul');
  const [locale, setLocale] = useState('tr-TR');
  const [dateFormat, setDateFormat] = useState('DD.MM.YYYY');
  const [taxEnabled, setTaxEnabled] = useState(false);
  const [taxRate, setTaxRate] = useState('20');

  useEffect(() => {
    const s = settings.data;
    if (!s) return;
    setCurrency(s.currency);
    setTimezone(s.timezone);
    setLocale(s.locale);
    setDateFormat(s.date_format);
    setTaxEnabled(s.tax_enabled);
    setTaxRate(String(s.tax_rate ?? 20));
  }, [settings.data]);

  if (!can('settings.update')) {
    return <ErrorState message="Bu işlem için yetkiniz bulunmuyor." />;
  }
  if (settings.isLoading) return <LoadingSkeleton />;

  const save = () => {
    void update
      .mutateAsync({
        currency,
        timezone,
        locale,
        date_format: dateFormat,
        tax_enabled: taxEnabled,
        tax_rate: Number(taxRate) || 0,
      })
      .then(() =>
        Alert.alert(
          'Kaydedildi',
          'KDV ve para birimi yalnızca yeni kiralama hesaplarında kullanılır.',
        ),
      )
      .catch((e: unknown) =>
        Alert.alert('Hata', getErrorMessage(e, 'Kaydedilemedi.')),
      );
  };

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.section}>Para birimi</Text>
      <View style={styles.row}>
        {CURRENCIES.map((c) => (
          <Button
            key={c}
            title={c}
            variant={currency === c ? 'primary' : 'secondary'}
            onPress={() => setCurrency(c)}
            style={styles.currencyBtn}
          />
        ))}
      </View>
      <Text style={styles.hint}>İlk sürümde TRY birincil para birimidir.</Text>

      <Input label="Saat dilimi" value={timezone} onChangeText={setTimezone} />
      <Input label="Locale" value={locale} onChangeText={setLocale} />
      <Input label="Tarih formatı" value={dateFormat} onChangeText={setDateFormat} />

      <View style={styles.switchRow}>
        <Text style={styles.switchLabel}>KDV Kullan</Text>
        <Switch
          value={taxEnabled}
          onValueChange={setTaxEnabled}
          trackColor={{ true: colors.primary, false: colors.border }}
        />
      </View>
      <Input
        label="KDV oranı (%)"
        value={taxRate}
        onChangeText={setTaxRate}
        keyboardType="decimal-pad"
        editable={taxEnabled}
      />

      <Button title="Kaydet" onPress={save} loading={update.isPending} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, gap: spacing.md },
  section: { ...typography.label, color: colors.textMuted },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  currencyBtn: { minWidth: 72 },
  hint: { ...typography.caption, color: colors.textSecondary },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  switchLabel: { ...typography.body, color: colors.text },
});
