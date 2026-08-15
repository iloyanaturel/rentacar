import { useMemo, useState } from 'react';
import {
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Button,
  EmptyState,
  ErrorState,
  Input,
  ScreenHeader,
} from '@/components/ui';
import {
  useCreateExpense,
  useDeleteExpense,
  useExpenses,
} from '@/features/ops/hooks';
import { useVehicles } from '@/features/vehicles/hooks';
import { formatCurrency } from '@/utils/currency';
import { formatDate, getTodayIsoInIstanbul } from '@/utils/date';
import { getErrorMessage } from '@/utils/errors';
import { expenseCategoryLabel } from '@/utils/labels';
import type { ExpenseCategory } from '@rentaflow/shared';
import { colors, radius, spacing, typography } from '@/theme';

const CATEGORIES: ExpenseCategory[] = [
  'MAINTENANCE',
  'FUEL',
  'INSURANCE',
  'CASCO',
  'TAX',
  'TIRES',
  'REPAIR',
  'CLEANING',
  'OTHER',
];

export default function ExpensesScreen() {
  const insets = useSafeAreaInsets();
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<ExpenseCategory | 'all'>('all');
  const [formOpen, setFormOpen] = useState(false);

  const query = useExpenses({
    category: category === 'all' ? undefined : category,
    search: search.trim() || undefined,
  });
  const create = useCreateExpense();
  const remove = useDeleteExpense();

  const vehiclesQuery = useVehicles({ search: '', status: 'ALL', pageSize: 50 });
  const vehicles = useMemo(
    () => vehiclesQuery.data?.pages.flatMap((p) => p.items) ?? [],
    [vehiclesQuery.data],
  );

  const [vehicleId, setVehicleId] = useState('');
  const [formCategory, setFormCategory] = useState<ExpenseCategory>('FUEL');
  const [amount, setAmount] = useState('');
  const [expenseDate, setExpenseDate] = useState(getTodayIsoInIstanbul());
  const [description, setDescription] = useState('');
  const [vendor, setVendor] = useState('');
  const [notes, setNotes] = useState('');
  const [receiptUri, setReceiptUri] = useState<string | null>(null);

  const pickReceipt = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('İzin gerekli', 'Fiş fotoğrafı için galeri izni verin.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.9,
    });
    if (!result.canceled && result.assets[0]?.uri) {
      setReceiptUri(result.assets[0].uri);
    }
  };

  const submit = async () => {
    if (!vehicleId) {
      Alert.alert('Eksik', 'Araç seçiniz.');
      return;
    }
    const value = Number(amount.replace(',', '.'));
    if (!value || value <= 0) {
      Alert.alert('Eksik', 'Geçerli tutar giriniz.');
      return;
    }
    try {
      await create.mutateAsync({
        vehicleId,
        category: formCategory,
        amount: value,
        expenseDate,
        description: description || undefined,
        vendor: vendor || undefined,
        notes: notes || undefined,
        receiptUri: receiptUri ?? undefined,
      });
      setFormOpen(false);
      setAmount('');
      setDescription('');
      setVendor('');
      setNotes('');
      setReceiptUri(null);
      Alert.alert('Başarılı', 'Masraf kaydedildi.');
    } catch (error) {
      Alert.alert('Hata', getErrorMessage(error, 'Masraf kaydedilemedi.'));
    }
  };

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <ScreenHeader
        title="Masraflar"
        subtitle="Araç giderleri"
        right={<Button title="+ Yeni" onPress={() => setFormOpen(true)} />}
      />

      <Input
        label="Ara"
        value={search}
        onChangeText={setSearch}
        placeholder="Açıklama veya firma…"
        style={styles.search}
      />

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filters}
      >
        <Pressable
          onPress={() => setCategory('all')}
          style={[styles.chip, category === 'all' && styles.chipActive]}
        >
          <Text
            style={[
              styles.chipText,
              category === 'all' && styles.chipTextActive,
            ]}
          >
            Tümü
          </Text>
        </Pressable>
        {CATEGORIES.map((c) => (
          <Pressable
            key={c}
            onPress={() => setCategory(c)}
            style={[styles.chip, category === c && styles.chipActive]}
          >
            <Text
              style={[
                styles.chipText,
                category === c && styles.chipTextActive,
              ]}
            >
              {expenseCategoryLabel(c)}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      <ScrollView contentContainerStyle={styles.list}>
        {query.isError ? (
          <ErrorState
            message="Masraflar yüklenemedi."
            onRetry={() => void query.refetch()}
          />
        ) : null}
        {!query.isError && (query.data ?? []).length === 0 ? (
          <EmptyState title="Masraf kaydı yok." />
        ) : null}
        {(query.data ?? []).map((item) => (
          <View key={item.id} style={styles.card}>
            <Text style={styles.cardTitle}>
              {expenseCategoryLabel(item.category)} ·{' '}
              {formatCurrency(item.amount)}
            </Text>
            <Text style={styles.cardMeta}>
              {item.vehicle_brand} · {item.vehicle_plate} ·{' '}
              {formatDate(item.expense_date)}
            </Text>
            {item.vendor ? (
              <Text style={styles.cardMeta}>{item.vendor}</Text>
            ) : null}
            {item.description ? (
              <Text style={styles.cardMeta}>{item.description}</Text>
            ) : null}
            {item.receipt_url ? (
              <Text style={styles.receipt}>Fiş eklendi</Text>
            ) : null}
            {!item.maintenance_id ? (
              <Button
                title="Sil"
                variant="ghost"
                onPress={() =>
                  void remove.mutateAsync(item.id).catch((e: Error) =>
                    Alert.alert('Hata', e.message),
                  )
                }
              />
            ) : (
              <Text style={styles.cardMeta}>Bakımdan otomatik</Text>
            )}
          </View>
        ))}
      </ScrollView>

      <Modal visible={formOpen} animationType="slide">
        <ScrollView
          contentContainerStyle={[
            styles.form,
            { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 24 },
          ]}
        >
          <Text style={styles.formTitle}>Yeni Masraf</Text>
          <Text style={styles.label}>Araç *</Text>
          <ScrollView horizontal contentContainerStyle={styles.filters}>
            {vehicles.map((v) => (
              <Pressable
                key={v.id}
                onPress={() => setVehicleId(v.id)}
                style={[styles.chip, vehicleId === v.id && styles.chipActive]}
              >
                <Text
                  style={[
                    styles.chipText,
                    vehicleId === v.id && styles.chipTextActive,
                  ]}
                >
                  {v.plate}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
          <Text style={styles.label}>Kategori *</Text>
          <ScrollView horizontal contentContainerStyle={styles.filters}>
            {CATEGORIES.map((c) => (
              <Pressable
                key={c}
                onPress={() => setFormCategory(c)}
                style={[
                  styles.chip,
                  formCategory === c && styles.chipActive,
                ]}
              >
                <Text
                  style={[
                    styles.chipText,
                    formCategory === c && styles.chipTextActive,
                  ]}
                >
                  {expenseCategoryLabel(c)}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
          <Input
            label="Tutar *"
            value={amount}
            onChangeText={setAmount}
            keyboardType="decimal-pad"
          />
          <Input
            label="Tarih (YYYY-MM-DD) *"
            value={expenseDate}
            onChangeText={setExpenseDate}
          />
          <Input
            label="Açıklama"
            value={description}
            onChangeText={setDescription}
          />
          <Input label="Firma" value={vendor} onChangeText={setVendor} />
          <Input label="Not" value={notes} onChangeText={setNotes} />
          <Button
            title={receiptUri ? 'Fiş seçildi ✓' : 'Fiş / Fatura Ekle'}
            variant="secondary"
            onPress={() => void pickReceipt()}
          />
          <Button
            title={create.isPending ? 'Kaydediliyor…' : 'Kaydet'}
            loading={create.isPending}
            onPress={() => void submit()}
          />
          <Button
            title="Kapat"
            variant="ghost"
            onPress={() => setFormOpen(false)}
          />
        </ScrollView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  search: { marginHorizontal: spacing.lg },
  filters: { paddingHorizontal: spacing.lg, gap: 8, paddingVertical: 8 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    marginRight: 8,
  },
  chipActive: {
    backgroundColor: colors.primarySoft,
    borderColor: colors.primary,
  },
  chipText: { ...typography.caption, color: colors.textSecondary },
  chipTextActive: { color: colors.primary, fontFamily: 'DMSans_700Bold' },
  list: { padding: spacing.lg, gap: spacing.sm, paddingBottom: 40 },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: 4,
  },
  cardTitle: { ...typography.bodyMedium, color: colors.text },
  cardMeta: { ...typography.caption, color: colors.textSecondary },
  receipt: { ...typography.caption, color: colors.success },
  form: {
    padding: spacing.lg,
    gap: spacing.md,
    backgroundColor: colors.background,
  },
  formTitle: { ...typography.title, color: colors.text },
  label: { ...typography.label, color: colors.textSecondary },
});
