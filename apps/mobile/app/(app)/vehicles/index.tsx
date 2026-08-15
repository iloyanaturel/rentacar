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
  EmptyState,
  ErrorState,
  Input,
  LoadingSkeleton,
} from '@/components/ui';
import { VehicleCard } from '@/features/vehicles/VehicleCard';
import {
  VehicleFiltersModal,
  type VehicleFilterState,
} from '@/features/vehicles/VehicleFiltersModal';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { useVehicleBrands, useVehicles } from '@/features/vehicles/hooks';
import { colors, spacing, typography } from '@/theme';

const defaultFilters: VehicleFilterState = {
  status: 'ALL',
  brand: 'ALL',
  documentExpiry: 'ALL',
};

export default function VehiclesListScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search, 350);
  const [filters, setFilters] = useState<VehicleFilterState>(defaultFilters);
  const [filterOpen, setFilterOpen] = useState(false);

  const queryFilters = useMemo(
    () => ({
      search: debouncedSearch,
      status: filters.status,
      brand: filters.brand,
      documentExpiry: filters.documentExpiry,
    }),
    [debouncedSearch, filters],
  );

  const listQuery = useVehicles(queryFilters);
  const brandsQuery = useVehicleBrands();

  const items =
    listQuery.data?.pages.flatMap((page) => page.items) ?? [];
  const isFiltered =
    Boolean(debouncedSearch.trim()) ||
    filters.status !== 'ALL' ||
    filters.brand !== 'ALL' ||
    filters.documentExpiry !== 'ALL';

  return (
    <View style={[styles.screen, { paddingTop: insets.top + spacing.md }]}>
      <View style={styles.header}>
        <Text style={styles.title}>Araçlar</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Yeni araç ekle"
          onPress={() => router.push('/(app)/vehicles/create')}
          style={styles.addBtn}
        >
          <Ionicons name="add" size={26} color={colors.textInverse} />
        </Pressable>
      </View>

      <View style={styles.searchRow}>
        <View style={styles.searchFlex}>
          <Input
            placeholder="Plaka, marka veya model ara..."
            value={search}
            onChangeText={setSearch}
            autoCorrect={false}
          />
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Filtreler"
          onPress={() => setFilterOpen(true)}
          style={styles.filterBtn}
        >
          <Ionicons name="options-outline" size={22} color={colors.primary} />
        </Pressable>
      </View>

      {listQuery.isLoading ? (
        <View style={styles.skel}>
          <LoadingSkeleton height={220} />
          <LoadingSkeleton height={220} style={{ marginTop: 12 }} />
        </View>
      ) : null}

      {listQuery.isError ? (
        <ErrorState
          message="Araçlar yüklenirken bir sorun oluştu."
          onRetry={() => void listQuery.refetch()}
        />
      ) : null}

      {!listQuery.isLoading && !listQuery.isError ? (
        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl
              refreshing={listQuery.isRefetching && !listQuery.isFetchingNextPage}
              onRefresh={() => void listQuery.refetch()}
              tintColor={colors.primary}
            />
          }
          onEndReached={() => {
            if (listQuery.hasNextPage && !listQuery.isFetchingNextPage) {
              void listQuery.fetchNextPage();
            }
          }}
          onEndReachedThreshold={0.4}
          ListEmptyComponent={
            <EmptyState
              title={
                isFiltered
                  ? 'Bu kriterlere uygun araç bulunamadı.'
                  : 'Henüz araç eklenmemiş.'
              }
              description={
                isFiltered
                  ? 'Filtreleri temizleyerek tekrar deneyin.'
                  : 'İlk aracınızı ekleyerek başlayın.'
              }
              actionLabel={isFiltered ? undefined : '+ Araç Ekle'}
              onAction={
                isFiltered
                  ? undefined
                  : () => router.push('/(app)/vehicles/create')
              }
            />
          }
          ListFooterComponent={
            listQuery.isFetchingNextPage ? (
              <ActivityIndicator color={colors.primary} style={{ margin: 16 }} />
            ) : null
          }
          renderItem={({ item }) => (
            <VehicleCard
              vehicle={item}
              onPress={() => router.push(`/(app)/vehicles/${item.id}`)}
            />
          )}
        />
      ) : null}

      <VehicleFiltersModal
        visible={filterOpen}
        value={filters}
        brands={brandsQuery.data ?? []}
        onChange={setFilters}
        onClose={() => setFilterOpen(false)}
        onClear={() => setFilters(defaultFilters)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  header: {
    paddingHorizontal: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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
  searchRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  searchFlex: { flex: 1 },
  filterBtn: {
    width: 52,
    height: 52,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  list: { paddingHorizontal: spacing.lg, paddingBottom: 32 },
  skel: { paddingHorizontal: spacing.lg },
});
