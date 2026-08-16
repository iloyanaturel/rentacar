'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/features/auth/AuthProvider';
import {
  Button,
  Card,
  EmptyState,
  LoadingBlock,
  PageHeader,
  StatCard,
} from '@/components/ui';
import { dashboardService } from '@/services/dashboardService';
import { formatCurrency } from '@/utils/currency';
import { formatFriendlyDate, getTodayInIstanbul } from '@/utils/date';
import { vehicleStatusLabel, rentalStatusLabel } from '@/utils/labels';

export default function DashboardPage() {
  const { profile } = useAuth();
  const summary = useQuery({
    queryKey: ['dashboard-summary'],
    queryFn: () => dashboardService.getDashboardStats(),
  });
  const returns = useQuery({
    queryKey: ['today-returns'],
    queryFn: () => dashboardService.getTodayReturns(),
  });
  const upcoming = useQuery({
    queryKey: ['upcoming-rentals'],
    queryFn: () => dashboardService.getUpcomingRentals(7),
  });
  const outstanding = useQuery({
    queryKey: ['outstanding-payments'],
    queryFn: () => dashboardService.getOutstandingPayments(),
  });

  const firstName = profile?.full_name?.split(' ')[0] ?? 'Kullanıcı';
  const today = formatFriendlyDate(getTodayInIstanbul(), {
    withTodayPrefix: true,
  });

  if (summary.isLoading) return <LoadingBlock />;
  if (summary.isError || !summary.data) {
    const detail =
      summary.error instanceof Error ? summary.error.message : null;
    return (
      <EmptyState
        title="Özet yüklenemedi"
        description={
          detail ??
          'Profil veya organizasyon kaydı eksik olabilir. Yenileyin; devam ederse yöneticinize bildirin.'
        }
        action={
          <Button onClick={() => void summary.refetch()}>Yenile</Button>
        }
      />
    );
  }

  const s = summary.data;
  const fleet = [
    { key: 'AVAILABLE' as const, value: s.vehicles.available },
    { key: 'RENTED' as const, value: s.vehicles.rented },
    { key: 'MAINTENANCE' as const, value: s.vehicles.maintenance },
    { key: 'INACTIVE' as const, value: s.vehicles.inactive },
  ];

  return (
    <div>
      <PageHeader
        title={`Merhaba, ${firstName}`}
        description={today}
        actions={
          <>
            <Link href="/rentals/new">
              <Button>Yeni Kiralama</Button>
            </Link>
            <Link href="/vehicles/new">
              <Button variant="secondary">Araç Ekle</Button>
            </Link>
          </>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Toplam Araç"
          value={s.vehicles.total}
          hint={`${s.vehicles.available} müsait`}
        />
        <StatCard label="Kirada" value={s.vehicles.rented} />
        <StatCard
          label="Bu Ay Tahsilat"
          value={formatCurrency(s.finance.month_collected_amount)}
        />
        <StatCard
          label="Açık Bakiye"
          value={formatCurrency(s.finance.outstanding_amount)}
        />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <Card>
          <h2 className="mb-3 font-display text-lg font-semibold">Filo Durumu</h2>
          <div className="grid grid-cols-2 gap-3 text-sm">
            {fleet.map((item) => (
              <div key={item.key} className="rounded-xl bg-rf-muted px-3 py-3">
                <p className="text-rf-secondary">{vehicleStatusLabel(item.key)}</p>
                <p className="mt-1 font-display text-xl font-bold">{item.value}</p>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-display text-lg font-semibold">Bugün İade</h2>
            <Link href="/rentals" className="text-sm font-medium text-rf-primary">
              Tümü
            </Link>
          </div>
          {(returns.data ?? []).length === 0 ? (
            <p className="text-sm text-rf-secondary">Bugün iade planı yok.</p>
          ) : (
            <ul className="space-y-2">
              {(returns.data ?? []).slice(0, 6).map((r) => (
                <li key={r.rental_id}>
                  <Link
                    href={`/rentals/${r.rental_id}`}
                    className="flex items-center justify-between rounded-xl px-2 py-2 hover:bg-rf-muted"
                  >
                    <div>
                      <p className="text-sm font-medium">
                        {r.plate} · {r.customer_name}
                      </p>
                      <p className="text-xs text-rf-secondary">
                        {r.brand} {r.model}
                      </p>
                    </div>
                    <span className="text-xs text-rf-secondary">
                      {formatCurrency(r.remaining_amount)}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card>
          <h2 className="mb-3 font-display text-lg font-semibold">
            Yaklaşan Kiralamalar
          </h2>
          {(upcoming.data ?? []).length === 0 ? (
            <p className="text-sm text-rf-secondary">Yaklaşan rezervasyon yok.</p>
          ) : (
            <ul className="space-y-2">
              {(upcoming.data ?? []).slice(0, 6).map((r) => (
                <li key={r.rental_id}>
                  <Link
                    href={`/rentals/${r.rental_id}`}
                    className="flex items-center justify-between rounded-xl px-2 py-2 hover:bg-rf-muted"
                  >
                    <div>
                      <p className="text-sm font-medium">
                        {r.plate} · {r.customer_name}
                      </p>
                      <p className="text-xs text-rf-secondary">
                        {r.start_date} · {rentalStatusLabel(r.status)}
                      </p>
                    </div>
                    <span className="text-xs">{formatCurrency(r.total_amount)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card>
          <h2 className="mb-3 font-display text-lg font-semibold">Açık Ödemeler</h2>
          {(outstanding.data ?? []).length === 0 ? (
            <p className="text-sm text-rf-secondary">Açık bakiye yok.</p>
          ) : (
            <ul className="space-y-2">
              {(outstanding.data ?? []).slice(0, 6).map((r) => (
                <li key={r.rental_id}>
                  <Link
                    href={`/rentals/${r.rental_id}/payment`}
                    className="flex items-center justify-between rounded-xl px-2 py-2 hover:bg-rf-muted"
                  >
                    <div>
                      <p className="text-sm font-medium">{r.plate}</p>
                      <p className="text-xs text-rf-secondary">{r.customer_name}</p>
                    </div>
                    <span className="text-xs font-semibold text-rf-danger">
                      {formatCurrency(r.remaining_amount)}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}
