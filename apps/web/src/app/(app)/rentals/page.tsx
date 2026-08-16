'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Plus, Search } from 'lucide-react';
import {
  Badge,
  Button,
  Card,
  EmptyState,
  ErrorBanner,
  Input,
  LoadingBlock,
  PageHeader,
  Select,
} from '@/components/ui';
import { usePermissions } from '@/features/auth/usePermissions';
import {
  rentalsService,
  type RentalDateFilter,
  type RentalPaymentFilter,
} from '@/services/rentalsService';
import { formatCurrency } from '@/utils/currency';
import { formatDate } from '@/utils/date';
import { paymentStatusLabel, rentalStatusLabel } from '@/utils/labels';
import { getErrorMessage } from '@/utils/errors';
import type { RentalStatus } from '@rentaflow/shared';

type StatusFilter = RentalStatus | 'ALL' | 'OVERDUE';

const STATUS_OPTIONS: { value: StatusFilter; label: string }[] = [
  { value: 'ALL', label: 'Tüm Durumlar' },
  { value: 'RESERVED', label: 'Rezervasyon' },
  { value: 'ACTIVE', label: 'Aktif' },
  { value: 'OVERDUE', label: 'Gecikmiş' },
  { value: 'COMPLETED', label: 'Tamamlandı' },
  { value: 'CANCELLED', label: 'İptal' },
];

const PAYMENT_OPTIONS: { value: RentalPaymentFilter; label: string }[] = [
  { value: 'ALL', label: 'Tüm Ödemeler' },
  { value: 'PAID', label: 'Ödendi' },
  { value: 'PARTIALLY_PAID', label: 'Kısmi ödeme' },
  { value: 'UNPAID', label: 'Ödeme bekliyor' },
];

const DATE_OPTIONS: { value: RentalDateFilter; label: string }[] = [
  { value: 'ALL', label: 'Tüm Zamanlar' },
  { value: 'TODAY', label: 'Bugün' },
  { value: 'WEEK', label: 'Son 7 Gün' },
  { value: 'MONTH', label: 'Bu Ay' },
];

const STATUS_TONE: Record<string, 'success' | 'info' | 'warning' | 'neutral' | 'danger'> = {
  RESERVED: 'info',
  ACTIVE: 'success',
  COMPLETED: 'neutral',
  CANCELLED: 'neutral',
  OVERDUE: 'danger',
};

export default function RentalsPage() {
  const { can } = usePermissions();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<StatusFilter>('ALL');
  const [payment, setPayment] = useState<RentalPaymentFilter>('ALL');
  const [dateFilter, setDateFilter] = useState<RentalDateFilter>('ALL');
  const [page, setPage] = useState(0);

  const query = useQuery({
    queryKey: ['rentals', { search, status, payment, dateFilter, page }],
    queryFn: () =>
      rentalsService.getRentals({ search, status, payment, dateFilter, page }),
  });

  const items = query.data?.items ?? [];

  return (
    <div>
      <PageHeader
        title="Kiralamalar"
        description="Tüm kiralama işlemlerini görüntüleyin ve yönetin."
        actions={
          can('rentals.create') ? (
            <Link href="/rentals/new">
              <Button>
                <Plus className="h-4 w-4" /> Yeni Kiralama
              </Button>
            </Link>
          ) : undefined
        }
      />

      <Card className="mb-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="relative sm:col-span-2 lg:col-span-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-rf-faint" />
            <Input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(0);
              }}
              placeholder="Plaka, müşteri ara…"
              className="pl-9"
            />
          </div>
          <Select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value as StatusFilter);
              setPage(0);
            }}
          >
            {STATUS_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </Select>
          <Select
            value={payment}
            onChange={(e) => {
              setPayment(e.target.value as RentalPaymentFilter);
              setPage(0);
            }}
          >
            {PAYMENT_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </Select>
          <Select
            value={dateFilter}
            onChange={(e) => {
              setDateFilter(e.target.value as RentalDateFilter);
              setPage(0);
            }}
          >
            {DATE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </Select>
        </div>
      </Card>

      {query.isLoading ? <LoadingBlock /> : null}
      {query.isError ? (
        <ErrorBanner message={getErrorMessage(query.error, 'Kiralamalar yüklenemedi.')} />
      ) : null}

      {!query.isLoading && !query.isError && items.length === 0 ? (
        <EmptyState
          title="Kiralama bulunamadı"
          description="Filtreleri değiştirin veya yeni bir kiralama oluşturun."
          action={
            can('rentals.create') ? (
              <Link href="/rentals/new">
                <Button>Yeni Kiralama</Button>
              </Link>
            ) : undefined
          }
        />
      ) : null}

      {!query.isLoading && !query.isError && items.length > 0 ? (
        <Card className="overflow-x-auto p-0">
          <table className="w-full min-w-[760px] text-sm">
            <thead>
              <tr className="border-b border-rf-border text-left text-xs uppercase tracking-wide text-rf-faint">
                <th className="px-4 py-3">Araç</th>
                <th className="px-4 py-3">Müşteri</th>
                <th className="px-4 py-3">Tarihler</th>
                <th className="px-4 py-3">Durum</th>
                <th className="px-4 py-3">Ödeme</th>
                <th className="px-4 py-3">Tutar</th>
              </tr>
            </thead>
            <tbody>
              {items.map((r) => (
                <tr key={r.id} className="border-b border-rf-border last:border-0">
                  <td className="px-4 py-3">
                    <Link
                      href={`/rentals/${r.id}`}
                      className="font-semibold text-rf-primary hover:underline"
                    >
                      {r.vehicle_plate}
                    </Link>
                    <p className="text-xs text-rf-faint">
                      {r.vehicle_brand} {r.vehicle_model}
                    </p>
                  </td>
                  <td className="px-4 py-3">
                    {r.customer_name}
                    <p className="text-xs text-rf-faint">{r.customer_phone ?? '—'}</p>
                  </td>
                  <td className="px-4 py-3 text-rf-secondary">
                    {formatDate(r.start_date)} – {formatDate(r.end_date)}
                  </td>
                  <td className="px-4 py-3">
                    <Badge tone={STATUS_TONE[r.display_status] ?? 'neutral'}>
                      {rentalStatusLabel(r.display_status)}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">{paymentStatusLabel(r.payment_status)}</td>
                  <td className="px-4 py-3">{formatCurrency(r.total_amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      ) : null}

      {query.data ? (
        <div className="mt-4 flex items-center justify-between">
          <p className="text-sm text-rf-secondary">Sayfa {page + 1}</p>
          <div className="flex gap-2">
            <Button
              variant="secondary"
              disabled={page === 0}
              onClick={() => setPage((p) => Math.max(0, p - 1))}
            >
              Önceki
            </Button>
            <Button
              variant="secondary"
              disabled={!query.data.hasMore}
              onClick={() => setPage((p) => p + 1)}
            >
              Sonraki
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
