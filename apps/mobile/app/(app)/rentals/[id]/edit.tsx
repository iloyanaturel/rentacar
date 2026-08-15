import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  Button,
  ErrorState,
  Input,
  LoadingSkeleton,
} from '@/components/ui';
import { DateField } from '@/features/vehicles/DateField';
import { useRental, useUpdateReservedRental } from '@/features/rentals/hooks';
import { calcRentalPricing } from '@/utils/rentalPricing';
import { isoToTrDate, trDateToIso } from '@/features/vehicles/schemas';
import { formatCurrency } from '@/utils/currency';
import { formatTime } from '@/utils/date';
import { getErrorMessage } from '@/utils/errors';
import { colors, spacing, typography } from '@/theme';

export default function EditRentalScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const rentalQuery = useRental(id);
  const updateMutation = useUpdateReservedRental(id);

  const [startDate, setStartDate] = useState('');
  const [startTime, setStartTime] = useState('10:00');
  const [endDate, setEndDate] = useState('');
  const [endTime, setEndTime] = useState('10:00');
  const [dailyPrice, setDailyPrice] = useState('');
  const [discount, setDiscount] = useState('0');
  const [extra, setExtra] = useState('0');
  const [deposit, setDeposit] = useState('0');
  const [notes, setNotes] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (!rentalQuery.data) return;
    const r = rentalQuery.data;
    setStartDate(isoToTrDate(r.start_date) ?? '');
    setEndDate(isoToTrDate(r.end_date) ?? '');
    setStartTime(formatTime(r.start_time));
    setEndTime(formatTime(r.end_time));
    setDailyPrice(String(r.daily_price));
    setDiscount(String(r.discount_amount));
    setExtra(String(r.extra_charge));
    setDeposit(String(r.deposit_amount));
    setNotes(r.notes ?? '');
  }, [rentalQuery.data]);

  const startIso = trDateToIso(startDate) ?? '';
  const endIso = trDateToIso(endDate) ?? '';

  const pricing = useMemo(() => {
    if (!startIso || !endIso) return null;
    try {
      return calcRentalPricing({
        dailyPrice: Number(dailyPrice) || 0,
        startDate: startIso,
        startTime,
        endDate: endIso,
        endTime,
        discount: Number(discount) || 0,
        extra: Number(extra) || 0,
        deposit: Number(deposit) || 0,
      });
    } catch (error) {
      return { error: getErrorMessage(error) } as const;
    }
  }, [startIso, endIso, startTime, endTime, dailyPrice, discount, extra, deposit]);

  if (rentalQuery.isLoading) {
    return (
      <ScrollView contentContainerStyle={styles.content}>
        <LoadingSkeleton height={280} />
      </ScrollView>
    );
  }

  if (rentalQuery.isError || !rentalQuery.data) {
    return (
      <ErrorState
        message="Kiralama yüklenemedi."
        onRetry={() => void rentalQuery.refetch()}
      />
    );
  }

  if (rentalQuery.data.status !== 'RESERVED') {
    return (
      <ErrorState
        message="Yalnızca rezervasyon durumundaki kiralamalar düzenlenebilir."
        onRetry={() => router.back()}
      />
    );
  }

  const onSave = async () => {
    setFormError(null);
    if (!startIso || !endIso) {
      setFormError('Tarih alanları zorunludur.');
      return;
    }
    if (`${endIso}T${endTime}` < `${startIso}T${startTime}`) {
      setFormError('Teslim tarihi başlangıç tarihinden önce olamaz.');
      return;
    }
    if (!pricing || 'error' in pricing) {
      setFormError(pricing && 'error' in pricing ? pricing.error : 'Fiyat hesaplanamadı.');
      return;
    }
    try {
      await updateMutation.mutateAsync({
        start_date: startIso,
        start_time: startTime,
        end_date: endIso,
        end_time: endTime,
        daily_price: Number(dailyPrice) || 0,
        discount_amount: Number(discount) || 0,
        extra_charge: Number(extra) || 0,
        deposit_amount: Number(deposit) || 0,
        notes: notes.trim() || null,
      });
      Alert.alert('Başarılı', 'Kiralama güncellendi.', [
        { text: 'Tamam', onPress: () => router.back() },
      ]);
    } catch (error) {
      setFormError(getErrorMessage(error, 'Kiralama güncellenemedi.'));
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.hint}>
          Araç değiştirilemez. Aktif kiralamalarda kritik alanlar kilitlidir.
        </Text>
        <DateField label="Başlangıç tarihi" value={startDate} onChange={setStartDate} />
        <Input label="Başlangıç saati" value={startTime} onChangeText={setStartTime} />
        <DateField label="Teslim tarihi" value={endDate} onChange={setEndDate} />
        <Input label="Teslim saati" value={endTime} onChangeText={setEndTime} />
        <Input
          label="Günlük fiyat"
          keyboardType="decimal-pad"
          value={dailyPrice}
          onChangeText={setDailyPrice}
        />
        <Input
          label="İndirim"
          keyboardType="decimal-pad"
          value={discount}
          onChangeText={setDiscount}
        />
        <Input
          label="Ek ücret"
          keyboardType="decimal-pad"
          value={extra}
          onChangeText={setExtra}
        />
        <Input
          label="Depozito"
          keyboardType="decimal-pad"
          value={deposit}
          onChangeText={setDeposit}
        />
        <Input
          label="Not"
          value={notes}
          onChangeText={setNotes}
          multiline
          style={{ minHeight: 80, textAlignVertical: 'top' }}
        />
        {pricing && !('error' in pricing) ? (
          <Text style={styles.meta}>
            {pricing.days} gün · Toplam {formatCurrency(pricing.total)} · Depozito{' '}
            {formatCurrency(pricing.deposit)}
          </Text>
        ) : null}
        {formError ? <Text style={styles.error}>{formError}</Text> : null}
        <Button
          title={updateMutation.isPending ? 'Kaydediliyor...' : 'Kaydet'}
          loading={updateMutation.isPending}
          disabled={updateMutation.isPending}
          onPress={() => void onSave()}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, gap: spacing.lg, paddingBottom: 40 },
  hint: { ...typography.caption, color: colors.textSecondary },
  meta: { ...typography.bodyMedium, color: colors.text },
  error: { ...typography.caption, color: colors.danger },
});
