import { useMemo, useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Button,
  Card,
  EmptyState,
  ErrorState,
  ScreenHeader,
  SectionHeader,
  StatCard,
} from '@/components/ui';
import { DualBarChart } from '@/features/reports/DualBarChart';
import {
  useBrandPerformance,
  useCustomerPerformance,
  useExpenseBreakdown,
  useFinancialSummary,
  useMonthlyFinancialReport,
  usePaymentMethodReport,
  useRentalStatistics,
  useRevenueBreakdown,
  useVehiclePerformance,
} from '@/features/reports/hooks';
import {
  exportExcelWorkbook,
  exportReportPdf,
  exportVehicleCsv,
} from '@/features/reports/export';
import {
  getRangeForPreset,
  REPORT_PRESETS,
  type ReportPreset,
} from '@/utils/reportRange';
import { formatCurrency } from '@/utils/currency';
import { formatDate } from '@/utils/date';
import { getErrorMessage } from '@/utils/errors';
import { expenseCategoryLabel } from '@/utils/labels';
import { paymentMethodLabel } from '@/utils/operations';
import { colors, radius, spacing, typography } from '@/theme';

const MONTHS_TR = [
  'Oca',
  'Şub',
  'Mar',
  'Nis',
  'May',
  'Haz',
  'Tem',
  'Ağu',
  'Eyl',
  'Eki',
  'Kas',
  'Ara',
];

function monthLabel(iso: string): string {
  const m = Number(iso.slice(5, 7)) - 1;
  return MONTHS_TR[m] ?? iso.slice(5, 7);
}

export default function ReportsScreen() {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const kpiCols = width >= 900 ? 4 : width >= 600 ? 2 : 1;

  const [preset, setPreset] = useState<ReportPreset>('this_month');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');

  const range = useMemo(
    () =>
      getRangeForPreset(
        preset,
        preset === 'custom'
          ? { from: customFrom, to: customTo }
          : undefined,
      ),
    [preset, customFrom, customTo],
  );

  const from = range.from;
  const to = range.to;
  const ready = Boolean(from && to && from <= to);

  const summaryQ = useFinancialSummary(from, to);
  const monthlyQ = useMonthlyFinancialReport();
  const vehiclesQ = useVehiclePerformance(from, to);
  const customersQ = useCustomerPerformance(from, to);
  const rentalsQ = useRentalStatistics(from, to);
  const paymentsQ = usePaymentMethodReport(from, to);
  const expensesQ = useExpenseBreakdown(from, to);
  const revenueQ = useRevenueBreakdown(from, to);
  const brandsQ = useBrandPerformance(from, to);

  const monthly = monthlyQ.data ?? [];
  const vehicles = vehiclesQ.data ?? [];
  const customers = customersQ.data ?? [];
  const topCustomers = useMemo(
    () =>
      [...customers]
        .sort((a, b) => Number(b.total_spend) - Number(a.total_spend))
        .slice(0, 10),
    [customers],
  );
  const debtors = useMemo(
    () =>
      customers
        .filter((c) => Number(c.open_balance) > 0)
        .sort((a, b) => Number(b.open_balance) - Number(a.open_balance)),
    [customers],
  );
  const topExpenseVehicles = useMemo(
    () =>
      [...vehicles]
        .sort((a, b) => Number(b.expenses) - Number(a.expenses))
        .slice(0, 5),
    [vehicles],
  );
  const lowProfit = useMemo(
    () =>
      vehicles.filter(
        (v) =>
          Number(v.revenue) > 0 &&
          Number(v.net_income) < Number(v.revenue) * 0.2,
      ),
    [vehicles],
  );

  const chartRevenue = monthly.map((m) => ({
    label: monthLabel(String(m.month_start)),
    a: Number(m.revenue),
  }));
  const chartCollected = monthly.map((m) => ({
    label: monthLabel(String(m.month_start)),
    a: Number(m.collected),
  }));
  const chartExpenses = monthly.map((m) => ({
    label: monthLabel(String(m.month_start)),
    a: Number(m.expenses),
  }));
  const chartCompare = monthly.map((m) => ({
    label: monthLabel(String(m.month_start)),
    a: Number(m.revenue),
    b: Number(m.expenses),
  }));

  const onExport = async (kind: 'csv' | 'excel' | 'pdf') => {
    try {
      if (!summaryQ.data) throw new Error('Özet henüz yüklenmedi.');
      if (kind === 'csv') {
        await exportVehicleCsv(vehicles, from, to);
      } else if (kind === 'excel') {
        await exportExcelWorkbook({
          from,
          to,
          summary: summaryQ.data,
          vehicles,
          customers,
          monthly,
          expenses: expensesQ.data ?? [],
          payments: paymentsQ.data ?? [],
        });
      } else {
        await exportReportPdf({
          from,
          to,
          summary: summaryQ.data,
          vehicles,
          customers,
          expenses: expensesQ.data ?? [],
        });
      }
    } catch (error) {
      Alert.alert('Export', getErrorMessage(error, 'Dışa aktarım başarısız.'));
    }
  };

  const isError = summaryQ.isError;

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[
        styles.content,
        { paddingTop: insets.top + spacing.md, paddingBottom: insets.bottom + 40 },
      ]}
    >
      <ScreenHeader
        title="Raporlar"
        subtitle={`${formatDate(from)} – ${formatDate(to)}`}
      />

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.presets}
      >
        {REPORT_PRESETS.map((p) => (
          <Pressable
            key={p.key}
            onPress={() => setPreset(p.key)}
            style={[styles.chip, preset === p.key && styles.chipActive]}
          >
            <Text
              style={[styles.chipText, preset === p.key && styles.chipTextActive]}
            >
              {p.label}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      {preset === 'custom' ? (
        <View style={styles.customRow}>
          <TextInput
            value={customFrom}
            onChangeText={setCustomFrom}
            placeholder="Başlangıç YYYY-MM-DD"
            placeholderTextColor={colors.textMuted}
            style={styles.dateInput}
          />
          <TextInput
            value={customTo}
            onChangeText={setCustomTo}
            placeholder="Bitiş YYYY-MM-DD"
            placeholderTextColor={colors.textMuted}
            style={styles.dateInput}
          />
        </View>
      ) : null}

      {isError ? (
        <ErrorState
          message="Raporlar yüklenemedi."
          onRetry={() => void summaryQ.refetch()}
        />
      ) : null}

      {ready && summaryQ.data ? (
        <>
          <View style={styles.kpiGrid}>
            {[
              { label: 'Toplam Ciro', value: summaryQ.data.revenue },
              { label: 'Toplam Tahsilat', value: summaryQ.data.collected },
              { label: 'Bekleyen Alacak', value: summaryQ.data.outstanding },
              { label: 'Toplam Masraf', value: summaryQ.data.expenses },
              { label: 'Net Gelir', value: summaryQ.data.net_income },
            ].map((k) => (
              <View
                key={k.label}
                style={[
                  styles.kpiItem,
                  { width: kpiCols === 1 ? '100%' : kpiCols === 2 ? '48%' : '23%' },
                ]}
              >
                <StatCard label={k.label} value={formatCurrency(k.value)} />
              </View>
            ))}
          </View>

          <SectionHeader title="Grafikler (Son 12 Ay)" />
          <DualBarChart title="Gelir" data={chartRevenue} aLabel="Ciro" />
          <View style={{ height: spacing.md }} />
          <DualBarChart
            title="Tahsilat"
            data={chartCollected}
            aLabel="Tahsilat"
            aColor={colors.success}
          />
          <View style={{ height: spacing.md }} />
          <DualBarChart
            title="Masraf"
            data={chartExpenses}
            aLabel="Masraf"
            aColor={colors.warning}
          />
          <View style={{ height: spacing.md }} />
          <DualBarChart title="Gelir vs Masraf" data={chartCompare} />

          <SectionHeader title="Kiralama İstatistikleri" />
          <Card style={styles.block}>
            <Text style={styles.meta}>
              Toplam {rentalsQ.data?.total ?? 0} · Aktif{' '}
              {rentalsQ.data?.active ?? 0} · Tamamlanan{' '}
              {rentalsQ.data?.completed ?? 0} · İptal{' '}
              {rentalsQ.data?.cancelled ?? 0} · Geciken{' '}
              {rentalsQ.data?.overdue ?? 0}
            </Text>
            <Text style={styles.meta}>
              Ort. süre {rentalsQ.data?.avg_duration_days ?? 0} gün · Ort.
              değer {formatCurrency(rentalsQ.data?.avg_rental_value ?? 0)}
            </Text>
            <Text style={styles.meta}>
              Filo doluluk %{rentalsQ.data?.fleet_occupancy ?? 0}
            </Text>
          </Card>

          <SectionHeader title="Gelir Kırılımı" />
          <Card style={styles.block}>
            <Text style={styles.meta}>
              Kiralama {formatCurrency(revenueQ.data?.rental_subtotal ?? 0)}
            </Text>
            <Text style={styles.meta}>
              İndirim -{formatCurrency(revenueQ.data?.discount ?? 0)}
            </Text>
            <Text style={styles.meta}>
              Ek ücret {formatCurrency(revenueQ.data?.extra_charge ?? 0)}
            </Text>
            <Text style={styles.meta}>
              Geç teslim {formatCurrency(revenueQ.data?.late_fee ?? 0)}
            </Text>
            <Text style={styles.meta}>
              Depozito (hariç){' '}
              {formatCurrency(revenueQ.data?.deposit_excluded ?? 0)}
            </Text>
          </Card>

          <SectionHeader title="Ödeme Yöntemleri" />
          {(paymentsQ.data ?? []).length === 0 ? (
            <EmptyState title="Bu dönemde ödeme yok." />
          ) : (
            (paymentsQ.data ?? []).map((p) => (
              <Card key={p.payment_method} style={styles.rowCard}>
                <Text style={styles.rowTitle}>
                  {paymentMethodLabel(p.payment_method as never)}
                </Text>
                <Text style={styles.rowMeta}>{formatCurrency(p.amount)}</Text>
              </Card>
            ))
          )}

          <SectionHeader title="Masraf Kırılımı" />
          {(expensesQ.data ?? []).map((e) => (
            <Card key={e.category} style={styles.rowCard}>
              <Text style={styles.rowTitle}>
                {expenseCategoryLabel(e.category)}
              </Text>
              <Text style={styles.rowMeta}>{formatCurrency(e.amount)}</Text>
            </Card>
          ))}

          <SectionHeader title="Aylık Finans Özeti" />
          <Card style={styles.block}>
            <View style={styles.tableHead}>
              <Text style={styles.tableMuted}>Ay</Text>
              <Text style={styles.tableMuted}>Gelir</Text>
              <Text style={styles.tableMuted}>Masraf</Text>
              <Text style={styles.tableMuted}>Net</Text>
            </View>
            {monthly.map((m) => (
              <View key={String(m.month_start)} style={styles.tableRow}>
                <Text style={styles.tableCell}>
                  {formatDate(String(m.month_start)).slice(3)}
                </Text>
                <Text style={styles.tableCell}>
                  {formatCurrency(m.revenue)}
                </Text>
                <Text style={styles.tableCell}>
                  {formatCurrency(m.expenses)}
                </Text>
                <Text style={styles.tableCell}>
                  {formatCurrency(m.net_income)}
                </Text>
              </View>
            ))}
          </Card>

          <SectionHeader title="Araç Performansı" />
          {vehicles.map((v) => (
            <Card key={v.vehicle_id} style={styles.rowCard}>
              <Text style={styles.rowTitle}>
                {v.brand} {v.model}
              </Text>
              <Text style={styles.plate}>{v.plate}</Text>
              <Text style={styles.meta}>
                Kiralama: {v.rental_count} · Gün: {v.rental_days}
              </Text>
              <Text style={styles.meta}>
                Gelir: {formatCurrency(v.revenue)} · Masraf:{' '}
                {formatCurrency(v.expenses)}
              </Text>
              <Text style={styles.net}>Net: {formatCurrency(v.net_income)}</Text>
              <Text style={styles.meta}>Doluluk: %{v.occupancy_rate}</Text>
            </Card>
          ))}

          {lowProfit.length > 0 ? (
            <>
              <SectionHeader title="Düşük net katkı" />
              {lowProfit.slice(0, 3).map((v) => (
                <Card key={`low-${v.vehicle_id}`} style={styles.warnCard}>
                  <Text style={styles.rowTitle}>
                    {v.plate} — net {formatCurrency(v.net_income)}
                  </Text>
                  <Text style={styles.meta}>
                    Gelir {formatCurrency(v.revenue)} / Masraf{' '}
                    {formatCurrency(v.expenses)}. Matematiksel net katkı düşük.
                  </Text>
                </Card>
              ))}
            </>
          ) : null}

          <SectionHeader title="En Çok Masraf" />
          {topExpenseVehicles.map((v) => (
            <Card key={`exp-${v.vehicle_id}`} style={styles.rowCard}>
              <Text style={styles.rowTitle}>
                {v.plate} · {formatCurrency(v.expenses)}
              </Text>
            </Card>
          ))}

          <SectionHeader title="En Çok Kiralanan Markalar" />
          {(brandsQ.data ?? []).map((b) => (
            <Card key={b.brand} style={styles.rowCard}>
              <Text style={styles.rowTitle}>{b.brand}</Text>
              <Text style={styles.meta}>
                {b.rental_count} kiralama · {b.rental_days} gün ·{' '}
                {formatCurrency(b.revenue)}
              </Text>
            </Card>
          ))}

          <SectionHeader title="Müşteri Analizi — En İyi 10" />
          {topCustomers.map((c) => (
            <Card key={c.customer_id} style={styles.rowCard}>
              <Text style={styles.rowTitle}>
                {c.first_name} {c.last_name}
              </Text>
              <Text style={styles.meta}>
                {c.rental_count} kiralama · Harcama{' '}
                {formatCurrency(c.total_spend)} · Ödenen{' '}
                {formatCurrency(c.total_paid)} · Kalan{' '}
                {formatCurrency(c.open_balance)}
              </Text>
              <Text style={styles.meta}>
                Son kiralama: {formatDate(c.last_rental_date)}
              </Text>
            </Card>
          ))}

          <SectionHeader title="Müşteri Alacakları" />
          {debtors.length === 0 ? (
            <EmptyState title="Açık alacak yok." />
          ) : (
            debtors.map((c) => (
              <Card key={`d-${c.customer_id}`} style={styles.rowCard}>
                <Text style={styles.rowTitle}>
                  {c.first_name} {c.last_name}
                </Text>
                <Text style={styles.debt}>
                  {formatCurrency(c.open_balance)}
                </Text>
              </Card>
            ))
          )}

          <SectionHeader title="Export" />
          <View style={styles.exportRow}>
            <Button title="CSV" variant="secondary" onPress={() => void onExport('csv')} />
            <Button title="Excel" variant="secondary" onPress={() => void onExport('excel')} />
            <Button title="PDF Rapor" onPress={() => void onExport('pdf')} />
          </View>
        </>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { paddingHorizontal: spacing.lg, gap: spacing.sm },
  presets: { gap: 8, paddingBottom: spacing.sm },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    marginRight: 8,
  },
  chipActive: { backgroundColor: colors.primarySoft, borderColor: colors.primary },
  chipText: { ...typography.caption, color: colors.textSecondary },
  chipTextActive: { color: colors.primary, fontFamily: 'DMSans_700Bold' },
  customRow: { gap: 8, marginBottom: spacing.sm },
  dateInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: colors.surface,
    color: colors.text,
  },
  kpiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  kpiItem: {},
  block: { gap: 6, marginBottom: spacing.sm },
  meta: { ...typography.caption, color: colors.textSecondary },
  rowCard: { marginBottom: spacing.sm, gap: 4 },
  rowTitle: { ...typography.bodyMedium, color: colors.text },
  rowMeta: { ...typography.caption, color: colors.textSecondary },
  plate: { ...typography.caption, color: colors.primary, fontFamily: 'DMSans_700Bold' },
  net: { ...typography.bodyMedium, color: colors.success },
  debt: { ...typography.bodyMedium, color: colors.danger },
  warnCard: {
    marginBottom: spacing.sm,
    borderColor: colors.warning,
    backgroundColor: colors.warningSoft,
    gap: 4,
  },
  tableHead: { flexDirection: 'row', gap: 4, marginTop: 8 },
  tableRow: { flexDirection: 'row', gap: 4, paddingVertical: 4 },
  tableCell: { flex: 1, ...typography.caption, color: colors.text },
  tableMuted: { flex: 1, ...typography.caption, color: colors.textMuted },
  exportRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 24 },
});
