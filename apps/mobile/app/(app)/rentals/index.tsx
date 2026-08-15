import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import {
  Card,
  EmptyState,
  ErrorState,
  Input,
  LoadingSkeleton,
  PaymentStatusBadge,
  RentalStatusBadge,
} from '@/components/ui';
import { useRentals } from '@/features/rentals/hooks';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import type {
  RentalDateFilter,
  RentalPaymentFilter,
} from '@/services/rentalsService';
import type { RentalStatus } from '@rentaflow/shared';
import { formatCurrency } from '@/utils/currency';
import { formatDate } from '@/utils/date';
import { colors, spacing, typography } from '@/theme';

const STATUS_FILTERS: { value: RentalStatus | 'ALL' | 'OVERDUE'; label: string }[] =
  [
    { value: 'ALL', label: 'Tümü' },
    { value: 'RESERVED', label: 'Rezervasyon' },
    { value: 'ACTIVE', label: 'Aktif' },
    { value: 'COMPLETED', label: 'Tamamlandı' },
    { value: 'CANCELLED', label: 'İptal' },
    { value: 'OVERDUE', label: 'Gecikmiş' },
  ];

const PAYMENT_FILTERS: { value: RentalPaymentFilter; label: string }[] = [
  { value: 'ALL', label: 'Ödeme: Tümü' },
  { value: 'PAID', label: 'Ödendi' },
  { value: 'PARTIALLY_PAID', label: 'Kısmi' },
  { value: 'UNPAID', label: 'Ödenmedi' },
];

const DATE_FILTERS: { value: RentalDateFilter; label: string }[] = [
  { value: 'ALL', label: 'Tarih: Tümü' },
  { value: 'TODAY', label: 'Bugün' },
  { value: 'WEEK', label: 'Bu hafta' },
  { value: 'MONTH', label: 'Bu ay' },
];

export default function RentalsListScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [search, setSearch] = useState('');
  const debounced = useDebouncedValue(search, 350);
  const [status, setStatus] = useState<RentalStatus | 'ALL' | 'OVERDUE'>('ALL');
  const [payment, setPayment] = useState<RentalPaymentFilter>('ALL');
  const [dateFilter, setDateFilter] = useState<RentalDateFilter>('ALL');

  const filters = useMemo(
    () => ({ search: debounced, status, payment, dateFilter }),
    [debounced, status, payment, dateFilter],
  );
  const query = useRentals(filters);
  const items = query.data?.pages.flatMap((p) => p.items) ?? [];

  return (
    <View style={[styles.screen, { paddingTop: insets.top + spacing.md }]}>
      <View style={styles.header}>
        <Text style={styles.title}>Kiralama Yönetimi</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Yeni kiralama"
          style={styles.addBtn}
          onPress={() => router.push('/(app)/rentals/create')}
        >
          <Ionicons name="add" size={26} color={colors.textInverse} />
        </Pressable>
      </View>

      <View style={styles.search}>
        <Input
          placeholder="Plaka, araç veya müşteri ara..."
          value={search}
          onChangeText={setSearch}
          autoCorrect={false}
        />
      </View>

      <View style={styles.chips}>
        {STATUS_FILTERS.map((item) => (
          <Chip
            key={item.value}
            label={item.label}
            active={status === item.value}
            onPress={() => setStatus(item.value)}
          />
        ))}
      </View>
      <View style={styles.chips}>
        {PAYMENT_FILTERS.map((item) => (
          <Chip
            key={item.value}
            label={item.label}
            active={payment === item.value}
            onPress={() => setPayment(item.value)}
          />
        ))}
      </View>
      <View style={styles.chips}>
        {DATE_FILTERS.map((item) => (
          <Chip
            key={item.value}
            label={item.label}
            active={dateFilter === item.value}
            onPress={() => setDateFilter(item.value)}
          />
        ))}
      </View>

      {query.isLoading ? (
        <View style={styles.pad}>
          <LoadingSkeleton height={140} />
          <LoadingSkeleton height={140} style={{ marginTop: 12 }} />
        </View>
      ) : null}

      {query.isError ? (
        <ErrorState
          message="Kiralamalar yüklenirken bir sorun oluştu."
          onRetry={() => void query.refetch()}
        />
      ) : null}

      {!query.isLoading && !query.isError ? (
        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl
              refreshing={query.isRefetching && !query.isFetchingNextPage}
              onRefresh={() => void query.refetch()}
              tintColor={colors.primary}
            />
          }
          onEndReached={() => {
            if (query.hasNextPage && !query.isFetchingNextPage) {
              void query.fetchNextPage();
            }
          }}
          ListEmptyComponent={
            <EmptyState
              title="Henüz kiralama bulunmuyor."
              description="Yeni bir kiralama oluşturarak başlayın."
              actionLabel="+ Yeni Kiralama"
              onAction={() => router.push('/(app)/rentals/create')}
            />
          }
          ListFooterComponent={
            query.isFetchingNextPage ? (
              <ActivityIndicator color={colors.primary} style={{ margin: 16 }} />
            ) : null
          }
          renderItem={({ item }) => (
            <Pressable onPress={() => router.push(`/(app)/rentals/${item.id}`)}>
              <Card style={styles.card}>
                <View style={styles.row}>
                  <View style={styles.flex}>
                    <Text style={styles.vehicle}>
                      {item.vehicle_brand} {item.vehicle_model}
                    </Text>
                    <Text style={styles.meta}>{item.vehicle_plate}</Text>
                  </View>
                  <RentalStatusBadge status={item.display_status} />
                </View>
                <Text style={styles.customer}>{item.customer_name}</Text>
                <Text style={styles.meta}>
                  {formatDate(item.start_date)} → {formatDate(item.end_date)} ·{' '}
                  {item.total_days} Gün
                </Text>
                <Text style={styles.total}>
                  {formatCurrency(item.total_amount)}
                </Text>
                <Text style={styles.meta}>
                  Ödenen: {formatCurrency(item.paid_amount)} · Kalan:{' '}
                  {formatCurrency(item.remaining_amount)}
                </Text>
                <PaymentStatusBadge status={item.payment_status} />
              </Card>
            </Pressable>
          )}
        />
      ) : null}
    </View>
  );
}

function Chip({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.chip, active && styles.chipActive]}
    >
      <Text style={[styles.chipText, active && styles.chipTextActive]}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  header: {
    paddingHorizontal: spacing.lg,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  title: { ...typography.title, color: colors.text },
  addBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  search: { paddingHorizontal: spacing.lg, marginBottom: spacing.sm },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.sm,
  },
  chip: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 999,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.surface,
  },
  chipActive: {
    backgroundColor: colors.primarySoft,
    borderColor: colors.primary,
  },
  chipText: { ...typography.caption, color: colors.textSecondary },
  chipTextActive: { color: colors.primary, fontFamily: 'DMSans_600SemiBold' },
  list: { paddingHorizontal: spacing.lg, paddingBottom: 32 },
  pad: { paddingHorizontal: spacing.lg },
  card: { marginBottom: spacing.md, gap: 6 },
  row: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
  flex: { flex: 1 },
  vehicle: { ...typography.subtitle, color: colors.text },
  customer: { ...typography.bodyMedium, color: colors.text },
  meta: { ...typography.caption, color: colors.textSecondary },
  total: { ...typography.subtitle, color: colors.primary },
});
