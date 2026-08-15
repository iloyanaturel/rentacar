import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
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
  useOpsTodaySummary,
  useOutstandingPayments,
  useOverdueRentals,
  useTodayHandovers,
  useTodayReturns,
  useUpcomingRentals,
} from '@/features/dashboard/hooks';
import { useMaintenances, useUnreadNotificationCount } from '@/features/ops/hooks';
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
import { maintenanceTypeLabel } from '@/utils/labels';
import { colors, radius, spacing, typography } from '@/theme';
import { useMemo, useState } from 'react';

function delayLabel(endDate: string, endTime: string): string {
  const end = new Date(`${endDate}T${String(endTime).slice(0, 8)}`);
  const diffH = Math.max(0, Math.floor((Date.now() - end.getTime()) / 3_600_000));
  if (diffH < 24) return `${diffH} saat gecikme`;
  return `${Math.floor(diffH / 24)} gün gecikme`;
}

export default function DashboardScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { profile } = useAuth();
  const [search, setSearch] = useState('');
  const summaryQuery = useDashboardStats();
  const opsQuery = useOpsTodaySummary();
  const todayQuery = useTodayReturns();
  const handoverQuery = useTodayHandovers();
  const outstandingQuery = useOutstandingPayments();
  const overdueQuery = useOverdueRentals();
  const upcomingQuery = useUpcomingRentals();
  const maintenanceQuery = useMaintenances({ status: 'SCHEDULED' });
  const unreadQuery = useUnreadNotificationCount();

  const firstName = profile?.full_name?.split(' ')[0] ?? 'Kullanıcı';
  const todayLabel = formatFriendlyDate(getTodayInIstanbul(), {
    withTodayPrefix: true,
  });

  const upcomingMaintenance = useMemo(
    () => (maintenanceQuery.data ?? []).slice(0, 5),
    [maintenanceQuery.data],
  );

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
    void opsQuery.refetch();
  };

  const onSearchSubmit = () => {
    const q = search.trim();
    if (!q) return;
    // Global search bootstrap: route to vehicles with query, customers as fallback hint
    router.push(`/(app)/vehicles?q=${encodeURIComponent(q)}`);
  };

  const ops = opsQuery.data;

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[
        styles.content,
        { paddingTop: insets.top + spacing.lg, paddingBottom: insets.bottom + 24 },
      ]}
    >
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View style={{ flex: 1 }}>
            <Text style={styles.hello}>Merhaba, {firstName}</Text>
            <Text style={styles.date}>{todayLabel}</Text>
          </View>
          <Pressable
            onPress={() => router.push('/(app)/more/notifications')}
            style={styles.bell}
            accessibilityLabel="Bildirimler"
          >
            <Ionicons name="notifications-outline" size={24} color={colors.text} />
            {(unreadQuery.data ?? 0) > 0 ? (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>
                  {(unreadQuery.data ?? 0) > 9 ? '9+' : unreadQuery.data}
                </Text>
              </View>
            ) : null}
          </Pressable>
        </View>
        <TextInput
          value={search}
          onChangeText={setSearch}
          onSubmitEditing={onSearchSubmit}
          placeholder="Plaka, müşteri, telefon ara…"
          placeholderTextColor={colors.textMuted}
          style={styles.search}
          returnKeyType="search"
        />
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
            <StatCard label="Müsait" value={summaryQuery.data.vehicles.available} />
            <StatCard label="Kirada" value={summaryQuery.data.vehicles.rented} />
            <StatCard
              label="Bakımda"
              value={summaryQuery.data.vehicles.maintenance}
            />
          </View>

          <SectionHeader title="Bugün" />
          <View style={styles.todayStrip}>
            <Text style={styles.todayLine}>
              🚗 {ops?.handovers_today ?? (handoverQuery.data ?? []).length} Araç Teslim
            </Text>
            <Text style={styles.todayLine}>
              🔄 {ops?.returns_today ?? (todayQuery.data ?? []).length} Araç İade
            </Text>
            <Text style={styles.todayLine}>
              ⚠️ {ops?.overdue ?? (overdueQuery.data ?? []).length} Gecikmiş
            </Text>
            <Text style={styles.todayLine}>
              💰 {ops?.payments_due ?? (outstandingQuery.data ?? []).length} Ödeme Bekliyor
            </Text>
            <Text style={styles.todayLine}>
              🔧 {ops?.maintenance_upcoming ?? upcomingMaintenance.length} Bakım Yaklaşıyor
            </Text>
          </View>

          <SectionHeader title="Hızlı İşlemler" />
          <View style={styles.quickRow}>
            {[
              { label: '+ Araç', href: '/(app)/vehicles/create' },
              { label: '+ Müşteri', href: '/(app)/customers/create' },
              { label: '+ Kiralama', href: '/(app)/rentals/create' },
              { label: '+ Ödeme', href: '/(app)/more/payments' },
              { label: '+ Bakım', href: '/(app)/more/maintenance' },
              { label: '+ Masraf', href: '/(app)/more/expenses' },
            ].map((a) => (
              <Pressable
                key={a.label}
                style={styles.quickBtn}
                onPress={() => router.push(a.href as never)}
              >
                <Text style={styles.quickText}>{a.label}</Text>
              </Pressable>
            ))}
          </View>

          {(overdueQuery.data ?? []).length > 0 ||
          (summaryQuery.data.vehicles.maintenance > 0 &&
            (outstandingQuery.data ?? []).length > 0) ? (
            <>
              <SectionHeader title="Kritik Uyarılar" />
              {(overdueQuery.data ?? []).map((item) => (
                <Pressable
                  key={`crit-${item.rental_id}`}
                  onPress={() => router.push(`/(app)/rentals/${item.rental_id}`)}
                >
                  <Card style={styles.alertCard}>
                    <Text style={styles.alertTitle}>⚠️ Geciken: {item.plate}</Text>
                    <Text style={styles.cardMeta}>
                      {item.customer_name} · Planlanan{' '}
                      {formatDate(item.end_date)} {formatTime(item.end_time)} ·{' '}
                      {delayLabel(item.end_date, item.end_time)}
                    </Text>
                  </Card>
                </Pressable>
              ))}
            </>
          ) : null}

          <SectionHeader title="Bugün Teslim" />
          {(handoverQuery.data ?? []).length > 0 ? (
            (handoverQuery.data ?? []).map((item) => (
              <Pressable
                key={item.rental_id}
                onPress={() => router.push(`/(app)/rentals/${item.rental_id}`)}
              >
                <Card style={styles.listCard}>
                  <Text style={styles.cardTitle}>
                    {item.brand} {item.model}
                  </Text>
                  <Text style={styles.cardMeta}>{item.plate}</Text>
                  <Text style={styles.cardMeta}>
                    {formatTime(item.start_time)} · {item.customer_name}
                  </Text>
                </Card>
              </Pressable>
            ))
          ) : (
            <EmptyState title="Bugün teslim edilecek rezervasyon yok." />
          )}

          <SectionHeader title="Bugün İade" />
          {todayQuery.data && todayQuery.data.length > 0 ? (
            todayQuery.data.map((item) => (
              <TodayReturnCard key={item.rental_id} item={item} />
            ))
          ) : (
            <EmptyState title="Bugün teslim alınacak kiralama yok." />
          )}

          <SectionHeader title="Geciken Kiralamalar" />
          {(overdueQuery.data ?? []).length > 0 ? (
            (overdueQuery.data ?? []).map((item) => (
              <Pressable
                key={item.rental_id}
                onPress={() => router.push(`/(app)/rentals/${item.rental_id}`)}
              >
                <Card style={styles.listCard}>
                  <Text style={styles.cardTitle}>{item.plate}</Text>
                  <Text style={styles.cardMeta}>{item.customer_name}</Text>
                  <Text style={styles.cardMeta}>
                    Planlanan: {formatDate(item.end_date)}{' '}
                    {formatTime(item.end_time)}
                  </Text>
                  <Text style={styles.delay}>
                    {delayLabel(item.end_date, item.end_time)}
                  </Text>
                </Card>
              </Pressable>
            ))
          ) : (
            <EmptyState title="Gecikmiş kiralama yok." />
          )}

          <SectionHeader title="Yaklaşan Kiralamalar" />
          {upcomingQuery.data && upcomingQuery.data.length > 0 ? (
            upcomingQuery.data.map((item) => (
              <UpcomingRentalRow key={item.rental_id} item={item} />
            ))
          ) : (
            <EmptyState title="Sonraki 7 günde kiralama yok." />
          )}

          <SectionHeader title="Yaklaşan Bakımlar" />
          {upcomingMaintenance.length > 0 ? (
            upcomingMaintenance.map((item) => (
              <Pressable
                key={item.id}
                onPress={() => router.push('/(app)/more/maintenance')}
              >
                <Card style={styles.listCard}>
                  <Text style={styles.cardTitle}>
                    {item.vehicle_plate} · {maintenanceTypeLabel(item.maintenance_type)}
                  </Text>
                  <Text style={styles.cardMeta}>
                    {formatDate(item.scheduled_date ?? item.maintenance_date)}
                  </Text>
                </Card>
              </Pressable>
            ))
          ) : (
            <EmptyState title="Yaklaşan bakım yok." />
          )}

          <SectionHeader title="Bu Ay" />
          <View style={styles.kpiGrid}>
            <StatCard
              label="Toplam Kiralama"
              value={summaryQuery.data.finance.month_rental_count}
            />
            <StatCard
              label="Toplam Ciro"
              value={formatCurrency(summaryQuery.data.finance.month_booked_amount)}
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
        </>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { paddingHorizontal: spacing.lg },
  header: { marginBottom: spacing.xl, gap: spacing.sm },
  headerTop: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
  hello: { ...typography.title, color: colors.text },
  date: { ...typography.body, color: colors.textSecondary },
  bell: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  badge: {
    position: 'absolute',
    top: 6,
    right: 6,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: colors.danger,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  badgeText: { color: '#fff', fontSize: 9, fontFamily: 'DMSans_700Bold' },
  search: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: colors.surface,
    color: colors.text,
    fontFamily: 'DMSans_400Regular',
  },
  kpiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  todayStrip: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: 6,
    marginBottom: spacing.lg,
  },
  todayLine: { ...typography.body, color: colors.text },
  quickRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: spacing.lg },
  quickBtn: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: radius.md,
    backgroundColor: colors.primarySoft,
  },
  quickText: { ...typography.caption, color: colors.primary, fontFamily: 'DMSans_700Bold' },
  listCard: { marginBottom: spacing.sm, gap: 4 },
  alertCard: {
    marginBottom: spacing.sm,
    gap: 4,
    borderColor: colors.danger,
    backgroundColor: colors.dangerSoft,
  },
  alertTitle: { ...typography.bodyMedium, color: colors.danger },
  cardTitle: { ...typography.bodyMedium, color: colors.text },
  cardMeta: { ...typography.caption, color: colors.textSecondary },
  delay: { ...typography.caption, color: colors.danger, fontFamily: 'DMSans_700Bold' },
});
