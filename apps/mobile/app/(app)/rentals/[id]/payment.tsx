import { useMemo, useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Button, Input } from '@/components/ui';
import { useAddPayment, useRentalPaymentSummary } from '@/features/operations/hooks';
import { formatCurrency } from '@/utils/currency';
import { getErrorMessage } from '@/utils/errors';
import { paymentMethodLabel } from '@/utils/operations';
import type { PaymentMethod } from '@rentaflow/shared';
import { colors, spacing, typography } from '@/theme';

const METHODS: PaymentMethod[] = [
  'CASH',
  'CREDIT_CARD',
  'BANK_TRANSFER',
  'OTHER',
];

export default function AddPaymentScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const summaryQuery = useRentalPaymentSummary(id);
  const addPayment = useAddPayment(id);

  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState<PaymentMethod>('CASH');
  const [reference, setReference] = useState('');
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);

  const remaining = summaryQuery.data?.remaining_amount ?? 0;

  const canSubmit = useMemo(() => {
    const n = Number(amount);
    return n > 0 && n <= remaining + 0.001 && !addPayment.isPending;
  }, [amount, remaining, addPayment.isPending]);

  const onSubmit = async () => {
    setError(null);
    const n = Number(amount);
    if (!(n > 0)) {
      setError('Ödeme tutarı sıfırdan büyük olmalıdır.');
      return;
    }
    if (n > remaining + 0.001) {
      setError('Ödeme tutarı kalan borçtan fazla olamaz.');
      return;
    }
    try {
      await addPayment.mutateAsync({
        amount: n,
        paymentMethod: method,
        referenceNumber: reference.trim() || undefined,
        note: note.trim() || undefined,
      });
      Alert.alert('Başarılı', 'Ödeme kaydedildi.', [
        { text: 'Tamam', onPress: () => router.back() },
      ]);
    } catch (e) {
      setError(getErrorMessage(e, 'Ödeme kaydedilemedi.'));
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <Text style={styles.summary}>
        Kalan borç: {formatCurrency(remaining)}
      </Text>
      <Input
        label="Tutar *"
        keyboardType="decimal-pad"
        value={amount}
        onChangeText={setAmount}
        placeholder="0"
      />
      <Text style={styles.label}>Ödeme yöntemi *</Text>
      <View style={styles.chips}>
        {METHODS.map((m) => (
          <Pressable
            key={m}
            onPress={() => setMethod(m)}
            style={[styles.chip, method === m && styles.chipActive]}
          >
            <Text style={[styles.chipText, method === m && styles.chipTextActive]}>
              {paymentMethodLabel(m)}
            </Text>
          </Pressable>
        ))}
      </View>
      <Input
        label="Referans no"
        value={reference}
        onChangeText={setReference}
      />
      <Input
        label="Not"
        value={note}
        onChangeText={setNote}
        multiline
        style={{ minHeight: 72, textAlignVertical: 'top' }}
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <Button
        title={addPayment.isPending ? 'Kaydediliyor...' : 'Ödemeyi Kaydet'}
        loading={addPayment.isPending}
        disabled={!canSubmit}
        onPress={() => void onSubmit()}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.lg, gap: spacing.lg, paddingBottom: 40 },
  summary: { ...typography.subtitle, color: colors.primary },
  label: { ...typography.label, color: colors.textSecondary },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 999,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.surface,
  },
  chipActive: { backgroundColor: colors.primarySoft, borderColor: colors.primary },
  chipText: { ...typography.caption, color: colors.textSecondary },
  chipTextActive: { color: colors.primary },
  error: { ...typography.caption, color: colors.danger },
});
