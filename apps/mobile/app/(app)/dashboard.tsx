import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
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
  useTodayReturns,
  useUpcomingRentals,
} from '@/features/dashboard/hooks';
import { VehicleStatusChart } from '@/features/dashboard/VehicleStatusChart';
import { TodayReturnCard } from '@/features/dashboard/TodayReturnCard';
import { UpcomingRentalRow } from '@/features/dashboard/UpcomingRentalRow';
import { dashboardService } from '@/services/dashboardService';
import { formatCurrency } from '@/utils/currency';
import { formatFriendlyDate, getTodayInIstanbul } from '@/utils/date';
import { colors, spacing, typography } from '@/theme';

export default function DashboardScreen() {
  const insets = useSafeAreaInsets();
  const { profile } = useAuth();
  const summaryQuery = useDashboardStats();
  const todayQuery = useTodayReturns();
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
          {todayQuery.data && todayQuery.data.length > 0 ? (
            todayQuery.data.map((item) => (
              <TodayReturnCard key={item.rental_id} item={item} />
            ))
          ) : (
            <EmptyState
              title="Bugün teslim edilecek kiralama yok."
              description="Planlanan teslimler burada listelenir."
            />
          )}

          <SectionHeader
            title="Yaklaşan Kiralamalar"
            action={
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Yeni Kiralama"
                onPress={() => {
                  // TODO(STEP 5): navigate to rental create wizard
                }}
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
            <EmptyState
              title="Henüz kiralama bulunmuyor."
              description="Yeni bir kiralama oluşturarak başlayabilirsiniz."
            />
          )}
        </>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    paddingHorizontal: spacing.lg,
  },
  header: {
    marginBottom: spacing.xl,
    gap: spacing.xs,
  },
  hello: {
    ...typography.title,
    color: colors.text,
  },
  date: {
    ...typography.body,
    color: colors.textSecondary,
  },
  kpiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  linkBtn: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    minHeight: 44,
    justifyContent: 'center',
  },
  linkText: {
    ...typography.label,
    color: colors.primary,
  },
});
