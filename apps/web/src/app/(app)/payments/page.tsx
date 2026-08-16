'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { Wallet } from 'lucide-react';
import {
  Button,
  Card,
  EmptyState,
  ErrorBanner,
  LoadingBlock,
  PageHeader,
  StatCard,
} from '@/components/ui';
import { usePermissions } from '@/features/auth/usePermissions';
import { dashboardService } from '@/services/dashboardService';
import { formatCurrency } from '@/utils/currency';
import { getErrorMessage } from '@/utils/errors';

export default function PaymentsPage() {
  const { can, isLoading: permsLoading } = usePermissions();

  const outstanding = useQuery({
    queryKey: ['outstanding-payments'],
    queryFn: () => dashboardService.getOutstandingPayments(),
  });
  const overdue = useQuery({
    queryKey: ['overdue-rentals'],
    queryFn: () => dashboardService.getOverdueRentals(),
  });

  if (!permsLoading && !can('payments.view')) {
    return (
      <EmptyState
        title="Yetkiniz yok"
        description="Ödemeleri görüntüleme yetkiniz bulunmuyor."
      />
    );
  }

  const items = outstanding.data ?? [];
  const totalOutstanding = items.reduce((sum, i) => sum + Number(i.remaining_amount), 0);

  return (
    <div>
      <PageHeader
        title="Ödemeler"
        description="Açık bakiyeleri ve gecikmiş ödemeleri takip edin."
      />

      <div className="grid gap-3 sm:grid-cols-2">
        <StatCard label="Açık Bakiye Sayısı" value={items.length} />
        <StatCard label="Toplam Açık Bakiye" value={formatCurrency(totalOutstanding)} />
      </div>

      {outstanding.isLoading ? <LoadingBlock /> : null}
      {outstanding.isError ? (
        <ErrorBanner message={getErrorMessage(outstanding.error, 'Ödemeler yüklenemedi.')} />
      ) : null}

      {!outstanding.isLoading && !outstanding.isError && items.length === 0 ? (
        <EmptyState title="Açık bakiye yok" description="Tüm ödemeler tahsil edilmiş." />
      ) : null}

      {items.length > 0 ? (
        <Card className="mt-4 overflow-x-auto p-0">
          <table className="w-full min-w-[560px] text-sm">
            <thead>
              <tr className="border-b border-rf-border text-left text-xs uppercase tracking-wide text-rf-faint">
                <th className="px-4 py-3">Araç</th>
                <th className="px-4 py-3">Müşteri</th>
                <th className="px-4 py-3">Toplam</th>
                <th className="px-4 py-3">Ödenen</th>
                <th className="px-4 py-3">Kalan</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {items.map((p) => (
                <tr key={p.rental_id} className="border-b border-rf-border last:border-0">
                  <td className="px-4 py-3 font-medium">{p.plate}</td>
                  <td className="px-4 py-3">{p.customer_name}</td>
                  <td className="px-4 py-3">{formatCurrency(p.total_amount)}</td>
                  <td className="px-4 py-3">{formatCurrency(p.paid_amount)}</td>
                  <td className="px-4 py-3 font-semibold text-rf-danger">
                    {formatCurrency(p.remaining_amount)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {can('payments.create') ? (
                      <Link href={`/rentals/${p.rental_id}/payment`}>
                        <Button variant="secondary" className="text-xs">
                          <Wallet className="h-3.5 w-3.5" /> Ödeme Al
                        </Button>
                      </Link>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      ) : null}

      <Card className="mt-6">
        <h2 className="mb-3 font-display text-lg font-semibold">Gecikmiş Kiralamalar</h2>
        {overdue.isLoading ? (
          <LoadingBlock />
        ) : (overdue.data ?? []).length === 0 ? (
          <p className="text-sm text-rf-secondary">Gecikmiş kiralama yok.</p>
        ) : (
          <ul className="space-y-2">
            {(overdue.data ?? []).map((r) => (
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
                      Teslim: {r.end_date} {r.end_time}
                    </p>
                  </div>
                  <span className="text-sm font-semibold text-rf-danger">
                    {formatCurrency(r.remaining_amount)}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
