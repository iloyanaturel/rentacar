'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  Card,
  EmptyState,
  ErrorBanner,
  LoadingBlock,
  PageHeader,
  Select,
  StatCard,
} from '@/components/ui';
import { usePermissions } from '@/features/auth/usePermissions';
import { reportService } from '@/services/reportService';
import { formatCurrency } from '@/utils/currency';
import { formatDate } from '@/utils/date';
import { getErrorMessage } from '@/utils/errors';
import { REPORT_PRESETS, getRangeForPreset, type ReportPreset } from '@/utils/reportRange';

export default function ReportsPage() {
  const { can, isLoading: permsLoading } = usePermissions();
  const [preset, setPreset] = useState<ReportPreset>('this_month');
  const range = getRangeForPreset(preset);

  const summary = useQuery({
    queryKey: ['report-financial-summary', range.from, range.to],
    queryFn: () => reportService.getFinancialSummary(range.from, range.to),
  });
  const monthly = useQuery({
    queryKey: ['report-monthly'],
    queryFn: () => reportService.getMonthlyFinancialReport(12),
  });
  const vehiclePerformance = useQuery({
    queryKey: ['report-vehicle-performance', range.from, range.to],
    queryFn: () => reportService.getVehiclePerformance(range.from, range.to),
  });

  if (!permsLoading && !can('reports.view')) {
    return (
      <EmptyState
        title="Yetkiniz yok"
        description="Raporları görüntüleme yetkiniz bulunmuyor."
      />
    );
  }

  const chartData = (monthly.data ?? []).map((row) => ({
    month: formatDate(row.month_start).slice(3),
    Gelir: Number(row.revenue),
    Tahsilat: Number(row.collected),
    Masraf: Number(row.expenses),
    Net: Number(row.net_income),
  }));

  return (
    <div>
      <PageHeader
        title="Raporlar"
        description="Finansal performansınızı analiz edin."
        actions={
          <Select
            value={preset}
            onChange={(e) => setPreset(e.target.value as ReportPreset)}
            className="w-40"
          >
            {REPORT_PRESETS.filter((p) => p.key !== 'custom').map((p) => (
              <option key={p.key} value={p.key}>
                {p.label}
              </option>
            ))}
          </Select>
        }
      />

      {summary.isLoading ? <LoadingBlock /> : null}
      {summary.isError ? (
        <ErrorBanner message={getErrorMessage(summary.error, 'Rapor yüklenemedi.')} />
      ) : null}

      {summary.data ? (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard label="Gelir" value={formatCurrency(summary.data.revenue)} />
          <StatCard label="Tahsilat" value={formatCurrency(summary.data.collected)} />
          <StatCard label="Açık Bakiye" value={formatCurrency(summary.data.outstanding)} />
          <StatCard
            label="Net Kâr"
            value={formatCurrency(summary.data.net_income)}
            hint={`Masraflar: ${formatCurrency(summary.data.expenses)}`}
          />
        </div>
      ) : null}

      <Card className="mt-6">
        <h2 className="mb-4 font-display text-lg font-semibold">Aylık Finansal Görünüm</h2>
        {monthly.isLoading ? (
          <LoadingBlock />
        ) : chartData.length === 0 ? (
          <p className="text-sm text-rf-secondary">Henüz veri bulunmuyor.</p>
        ) : (
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                <Legend />
                <Bar dataKey="Gelir" fill="#0f766e" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Tahsilat" fill="#0284c7" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Masraf" fill="#dc2626" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </Card>

      <Card className="mt-4">
        <h2 className="mb-3 font-display text-lg font-semibold">Araç Performansı</h2>
        {vehiclePerformance.isLoading ? (
          <LoadingBlock />
        ) : (vehiclePerformance.data ?? []).length === 0 ? (
          <p className="text-sm text-rf-secondary">Bu aralıkta veri bulunmuyor.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr className="border-b border-rf-border text-left text-xs uppercase tracking-wide text-rf-faint">
                  <th className="py-2">Araç</th>
                  <th className="py-2">Kiralama</th>
                  <th className="py-2">Doluluk</th>
                  <th className="py-2">Gelir</th>
                  <th className="py-2">Net</th>
                </tr>
              </thead>
              <tbody>
                {(vehiclePerformance.data ?? []).map((v) => (
                  <tr key={v.vehicle_id} className="border-b border-rf-border last:border-0">
                    <td className="py-2">
                      {v.plate}
                      <p className="text-xs text-rf-faint">
                        {v.brand} {v.model}
                      </p>
                    </td>
                    <td className="py-2">{v.rental_count}</td>
                    <td className="py-2">%{Math.round(Number(v.occupancy_rate))}</td>
                    <td className="py-2">{formatCurrency(v.revenue)}</td>
                    <td className="py-2">{formatCurrency(v.net_income)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
