import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Card,
  DashboardSkeleton,
  EmptyState,
  ErrorState,
  SectionHeader,
  StatCard,
} from '@/components/ui';
import { useAuth } from '@/features/auth';
import {
  useDashboardStats,
  useOutstandingPayments,
  useOverdueRentals,
  useTodayHandovers,
  useTodayReturns,
  useUpcomingRentals,
} from '@/features/dashboard/hooks';
import { VehicleStatusChart } from '@/features/dashboard/VehicleStatusChart';
import { TodayReturnCard } from '@/features/dashboard/TodayReturnCard';
import { UpcomingRentalRow } from '@/features/dashboard/UpcomingRentalRow';
import { dashboardService } from '@/services/dashboardService';
import { formatCurrency } from '@/utils/currency';
import {
  formatDate,
  formatFriendlyDate,
  formatTime,
  getTodayInIstanbul,
} from '@/utils/date';
import { colors, spacing, typography } from '@/theme';

export default function DashboardScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { profile } = useAuth();
  const summaryQuery = useDashboardStats();
  const todayQuery = useTodayReturns();
  const handoverQuery = useTodayHandovers();
  const outstandingQuery = useOutstandingPayments();
  const overdueQuery = useOverdueRentals();
  const upcomingQuery = useUpcomingRentals();

  const firstName = profile?.full_name?.split(' ')[0] ?? 'Kullanıcı';
  const todayLabel = formatFriendlyDate(getTodayInIstanbul(), {
    withTodayPrefix: true,
  });

  const isLoading =
    summaryQuery.isLoading || todayQuery.isLoading || upcomingQuery.isLoading;
  const isError =
    summaryQuery.isError || todayQuery.isError || upcomingQuery.isError;

  const retry = () => {
    void summaryQuery.refetch();
    void todayQuery.refetch();
    void upcomingQuery.refetch();
    void handoverQuery.refetch();
    void outstandingQuery.refetch();
    void overdueQuery.refetch();
  };

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[
        styles.content,
        { paddingTop: insets.top + spacing.lg, paddingBottom: insets.bottom + 24 },
      ]}
    >
      <View style={styles.header}>
        <Text style={styles.hello}>Merhaba, {firstName}</Text>
        <Text style={styles.date}>{todayLabel}</Text>
      </View>

      {isLoading ? <DashboardSkeleton /> : null}

      {!isLoading && isError ? (
        <ErrorState
          message="Veriler yüklenirken bir sorun oluştu."
          onRetry={retry}
        />
      ) : null}

      {!isLoading && !isError && summaryQuery.data ? (
        <>
          <View style={styles.kpiGrid}>
            <StatCard label="Toplam Araç" value={summaryQuery.data.vehicles.total} />
            <StatCard label="Kirada" value={summaryQuery.data.vehicles.rented} />
            <StatCard label="Müsait" value={summaryQuery.data.vehicles.available} />
            <StatCard
              label="Bakımda"
              value={summaryQuery.data.vehicles.maintenance}
            />
          </View>

          <SectionHeader title="Bu Ay" />
          <View style={styles.kpiGrid}>
            <StatCard
              label="Toplam Kiralama"
              value={summaryQuery.data.finance.month_rental_count}
            />
            <StatCard
              label="Toplam Ciro"
              value={formatCurrency(summaryQuery.data.finance.month_booked_amount)}
              hint="Kiralanan tutar"
            />
            <StatCard
              label="Tahsil Edilen"
              value={formatCurrency(
                summaryQuery.data.finance.month_collected_amount,
              )}
            />
            <StatCard
              label="Bekleyen Ödeme"
              value={formatCurrency(summaryQuery.data.finance.outstanding_amount)}
            />
          </View>

          <SectionHeader title="Araç Durumu" />
          <Card>
            <VehicleStatusChart
              data={dashboardService.getVehicleStatusSummary(summaryQuery.data)}
            />
          </Card>

          <SectionHeader title="Bugün Teslim Edilecek" />
          {(handoverQuery.data ?? []).length > 0 ? (
            (handoverQuery.data ?? []).map((item) => (
              <Pressable
                key={item.rental_id}
                onPress={() => router.push(`/(app)/rentals/${item.rental_id}`)}
              >
                <Card style={styles.listCard}>
                  <Text style={styles.cardTitle}>
                    {item.brand} {item.model} · {item.plate}
                  </Text>
                  <Text style={styles.cardMeta}>
                    {item.customer_name} · {formatTime(item.start_time)}
                  </Text>
                </Card>
              </Pressable>
            ))
          ) : (
            <EmptyState title="Bugün teslim edilecek rezervasyon yok." />
          )}

          <SectionHeader title="Bugün Teslim Alınacak" />
          {todayQuery.data && todayQuery.data.length > 0 ? (
            todayQuery.data.map((item) => (
              <TodayReturnCard key={item.rental_id} item={item} />
            ))
          ) : (
            <EmptyState title="Bugün teslim alınacak kiralama yok." />
          )}

          <SectionHeader title="Geciken Araçlar" />
          {(overdueQuery.data ?? []).length > 0 ? (
            (overdueQuery.data ?? []).map((item) => (
              <Pressable
                key={item.rental_id}
                onPress={() => router.push(`/(app)/rentals/${item.rental_id}`)}
              >
                <Card style={styles.listCard}>
                  <Text style={styles.cardTitle}>{item.plate}</Text>
                  <Text style={styles.cardMeta}>
                    {item.customer_name} · {formatDate(item.end_date)}{' '}
                    {formatTime(item.end_time)}
                  </Text>
                </Card>
              </Pressable>
            ))
          ) : (
            <EmptyState title="Gecikmiş kiralama yok." />
          )}

          <SectionHeader title="Tahsil Edilecek Ödemeler" />
          {(outstandingQuery.data ?? []).slice(0, 5).length > 0 ? (
            (outstandingQuery.data ?? []).slice(0, 5).map((item) => (
              <Pressable
                key={item.rental_id}
                onPress={() => router.push(`/(app)/rentals/${item.rental_id}`)}
              >
                <Card style={styles.listCard}>
                  <Text style={styles.cardTitle}>
                    {item.plate} · {item.customer_name}
                  </Text>
                  <Text style={styles.cardMeta}>
                    Kalan {formatCurrency(item.remaining_amount)}
                  </Text>
                </Card>
              </Pressable>
            ))
          ) : (
            <EmptyState title="Açık ödeme bulunmuyor." />
          )}

          <SectionHeader
            title="Yaklaşan Kiralamalar"
            action={
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Yeni Kiralama"
                onPress={() => router.push('/(app)/rentals/create')}
                style={styles.linkBtn}
              >
                <Text style={styles.linkText}>Yeni Kiralama</Text>
              </Pressable>
            }
          />
          {upcomingQuery.data && upcomingQuery.data.length > 0 ? (
            upcomingQuery.data.map((item) => (
              <UpcomingRentalRow key={item.rental_id} item={item} />
            ))
          ) : (
            <EmptyState title="Henüz kiralama bulunmuyor." />
          )}
        </>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { paddingHorizontal: spacing.lg },
  header: { marginBottom: spacing.xl, gap: spacing.xs },
  hello: { ...typography.title, color: colors.text },
  date: { ...typography.body, color: colors.textSecondary },
  kpiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  listCard: { marginBottom: spacing.sm, gap: 4 },
  cardTitle: { ...typography.bodyMedium, color: colors.text },
  cardMeta: { ...typography.caption, color: colors.textSecondary },
  linkBtn: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    minHeight: 44,
    justifyContent: 'center',
  },
  linkText: { ...typography.label, color: colors.primary },
});
