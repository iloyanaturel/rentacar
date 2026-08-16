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
} from '@/components/ui';
import { useCustomers } from '@/features/customers/hooks';
import type { CustomerFilter } from '@/services/customersService';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { formatCurrency } from '@/utils/currency';
import { formatDate } from '@/utils/date';
import { maskPhone } from '@/utils/labels';
import { colors, spacing, typography } from '@/theme';

const FILTERS: { value: CustomerFilter; label: string }[] = [
  { value: 'ALL', label: 'Tümü' },
  { value: 'ACTIVE', label: 'Aktif' },
  { value: 'HAS_RENTALS', label: 'Kiralayanlar' },
  { value: 'HAS_BALANCE', label: 'Borçlular' },
];

export default function CustomersListScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [search, setSearch] = useState('');
  const debounced = useDebouncedValue(search, 350);
  const [filter, setFilter] = useState<CustomerFilter>('ALL');

  const query = useCustomers(
    useMemo(() => ({ search: debounced, filter }), [debounced, filter]),
  );
  const items = query.data?.pages.flatMap((p) => p.items) ?? [];

  return (
    <View style={[styles.screen, { paddingTop: insets.top + spacing.md }]}>
      <View style={styles.header}>
        <Text style={styles.title}>Müşteriler</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Yeni müşteri"
          style={styles.addBtn}
          onPress={() => router.push('/(app)/customers/create')}
        >
          <Ionicons name="add" size={26} color={colors.textInverse} />
        </Pressable>
      </View>

      <View style={styles.search}>
        <Input
          placeholder="İsim, telefon veya e-posta ara..."
          value={search}
          onChangeText={setSearch}
          autoCorrect={false}
        />
      </View>

      <View style={styles.chips}>
        {FILTERS.map((item) => (
          <Pressable
            key={item.value}
            onPress={() => setFilter(item.value)}
            style={[styles.chip, filter === item.value && styles.chipActive]}
          >
            <Text
              style={[
                styles.chipText,
                filter === item.value && styles.chipTextActive,
              ]}
            >
              {item.label}
            </Text>
          </Pressable>
        ))}
      </View>

      {query.isLoading ? (
        <View style={styles.pad}>
          <LoadingSkeleton height={120} />
          <LoadingSkeleton height={120} style={{ marginTop: 12 }} />
        </View>
      ) : null}

      {query.isError ? (
        <ErrorState
          message="Müşteriler yüklenirken bir sorun oluştu."
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
              title="Henüz müşteri eklenmemiş."
              description="İlk müşterinizi ekleyerek başlayın."
              actionLabel="+ Müşteri Ekle"
              onAction={() => router.push('/(app)/customers/create')}
            />
          }
          ListFooterComponent={
            query.isFetchingNextPage ? (
              <ActivityIndicator color={colors.primary} style={{ margin: 16 }} />
            ) : null
          }
          renderItem={({ item }) => (
            <Pressable
              onPress={() => router.push(`/(app)/customers/${item.id}`)}
            >
              <Card style={styles.card}>
                <Text style={styles.name}>
                  {item.first_name} {item.last_name}
                </Text>
                <Text style={styles.meta}>{maskPhone(item.phone)}</Text>
                <Text style={styles.meta}>
                  {item.rental_count} Kiralama
                  {item.last_rental_date
                    ? ` · Son: ${formatDate(item.last_rental_date)}`
                    : ''}
                </Text>
                <Text style={styles.money}>
                  Toplam: {formatCurrency(item.total_spend)}
                </Text>
                <Text
                  style={[
                    styles.balance,
                    item.open_balance > 0 && styles.balanceDue,
                  ]}
                >
                  Açık bakiye: {formatCurrency(item.open_balance)}
                </Text>
              </Card>
            </Pressable>
          )}
        />
      ) : null}
    </View>
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
    marginBottom: spacing.md,
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
  card: { marginBottom: spacing.md, gap: 4 },
  name: { ...typography.subtitle, color: colors.text },
  meta: { ...typography.caption, color: colors.textSecondary },
  money: { ...typography.bodyMedium, color: colors.text, marginTop: 6 },
  balance: { ...typography.caption, color: colors.textMuted },
  balanceDue: { color: colors.warning },
});
