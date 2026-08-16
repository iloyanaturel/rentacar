'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Pencil, Trash2 } from 'lucide-react';
import {
  Badge,
  Button,
  Card,
  EmptyState,
  ErrorBanner,
  LoadingBlock,
  PageHeader,
  StatCard,
} from '@/components/ui';
import { usePermissions } from '@/features/auth/usePermissions';
import { customersService } from '@/services/customersService';
import { formatCurrency } from '@/utils/currency';
import { formatDate } from '@/utils/date';
import { paymentStatusLabel, rentalStatusLabel } from '@/utils/labels';
import { getErrorMessage } from '@/utils/errors';

export default function CustomerDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const queryClient = useQueryClient();
  const { can } = usePermissions();
  const [actionError, setActionError] = useState<string | null>(null);
  const [archiving, setArchiving] = useState(false);

  const customer = useQuery({
    queryKey: ['customer', id],
    queryFn: () => customersService.getCustomer(id),
  });
  const stats = useQuery({
    queryKey: ['customer-stats', id],
    queryFn: () => customersService.getCustomerStats(id),
  });
  const rentals = useQuery({
    queryKey: ['customer-rentals', id],
    queryFn: () => customersService.getCustomerRentals(id),
  });

  if (customer.isLoading) return <LoadingBlock />;
  if (customer.isError || !customer.data) {
    return (
      <EmptyState
        title="Müşteri bulunamadı"
        description={getErrorMessage(customer.error, 'Müşteri bilgileri yüklenemedi.')}
        action={
          <Link href="/customers">
            <Button variant="secondary">Müşterilere Dön</Button>
          </Link>
        }
      />
    );
  }

  const c = customer.data;

  async function handleArchive() {
    if (
      !window.confirm(
        `${c.first_name} ${c.last_name} isimli müşteriyi pasife almak istediğinize emin misiniz?`,
      )
    ) {
      return;
    }
    setArchiving(true);
    setActionError(null);
    try {
      await customersService.archiveCustomer(id);
      await queryClient.invalidateQueries({ queryKey: ['customer', id] });
      await queryClient.invalidateQueries({ queryKey: ['customers'] });
    } catch (error) {
      setActionError(getErrorMessage(error, 'Müşteri pasife alınamadı.'));
    } finally {
      setArchiving(false);
    }
  }

  return (
    <div>
      <PageHeader
        title={`${c.first_name} ${c.last_name}`}
        description={c.phone ?? undefined}
        actions={
          <>
            <Link href="/customers">
              <Button variant="secondary">
                <ArrowLeft className="h-4 w-4" /> Geri
              </Button>
            </Link>
            {can('customers.update') ? (
              <Link href={`/customers/${id}/edit`}>
                <Button variant="secondary">
                  <Pencil className="h-4 w-4" /> Düzenle
                </Button>
              </Link>
            ) : null}
            {can('customers.update') && c.is_active ? (
              <Button variant="danger" onClick={handleArchive} loading={archiving}>
                <Trash2 className="h-4 w-4" /> Pasife Al
              </Button>
            ) : null}
          </>
        }
      />

      {actionError ? <ErrorBanner message={actionError} /> : null}

      <div className="mb-4">
        <Badge tone={c.is_active ? 'success' : 'neutral'}>
          {c.is_active ? 'Aktif' : 'Pasif'}
        </Badge>
      </div>

      {stats.data ? (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard label="Toplam Kiralama" value={stats.data.rental_count} />
          <StatCard label="Toplam Harcama" value={formatCurrency(stats.data.total_spend)} />
          <StatCard label="Toplam Ödeme" value={formatCurrency(stats.data.total_paid)} />
          <StatCard
            label="Açık Bakiye"
            value={formatCurrency(stats.data.open_balance)}
          />
        </div>
      ) : null}

      <Card className="mt-6">
        <h2 className="mb-3 font-display text-lg font-semibold">Müşteri Bilgileri</h2>
        <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
          <div>
            <dt className="text-rf-faint">E-posta</dt>
            <dd className="font-medium">{c.email ?? '—'}</dd>
          </div>
          <div>
            <dt className="text-rf-faint">TC Kimlik No</dt>
            <dd className="font-medium">{c.national_id ?? '—'}</dd>
          </div>
          <div>
            <dt className="text-rf-faint">Ehliyet No</dt>
            <dd className="font-medium">{c.license_number ?? '—'}</dd>
          </div>
          <div>
            <dt className="text-rf-faint">Ehliyet Geçerlilik</dt>
            <dd className="font-medium">{formatDate(c.license_expiry)}</dd>
          </div>
          <div>
            <dt className="text-rf-faint">Doğum Tarihi</dt>
            <dd className="font-medium">{formatDate(c.birth_date)}</dd>
          </div>
          <div>
            <dt className="text-rf-faint">Adres</dt>
            <dd className="font-medium">{c.address ?? '—'}</dd>
          </div>
        </dl>
        {c.notes ? (
          <p className="mt-3 rounded-xl bg-rf-muted px-3 py-2 text-sm text-rf-secondary">
            {c.notes}
          </p>
        ) : null}
      </Card>

      <Card className="mt-4">
        <h2 className="mb-3 font-display text-lg font-semibold">Kiralama Geçmişi</h2>
        {rentals.isLoading ? (
          <LoadingBlock />
        ) : (rentals.data ?? []).length === 0 ? (
          <p className="text-sm text-rf-secondary">Bu müşteri için kiralama kaydı yok.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-sm">
              <thead>
                <tr className="border-b border-rf-border text-left text-xs uppercase tracking-wide text-rf-faint">
                  <th className="py-2">Araç</th>
                  <th className="py-2">Tarihler</th>
                  <th className="py-2">Durum</th>
                  <th className="py-2">Ödeme</th>
                  <th className="py-2">Tutar</th>
                </tr>
              </thead>
              <tbody>
                {(rentals.data ?? []).map((r) => (
                  <tr key={r.id} className="border-b border-rf-border last:border-0">
                    <td className="py-2">
                      <Link href={`/rentals/${r.id}`} className="font-medium text-rf-primary hover:underline">
                        {r.vehicle_plate}
                      </Link>
                      <p className="text-xs text-rf-faint">
                        {r.vehicle_brand} {r.vehicle_model}
                      </p>
                    </td>
                    <td className="py-2 text-rf-secondary">
                      {formatDate(r.start_date)} – {formatDate(r.end_date)}
                    </td>
                    <td className="py-2">{rentalStatusLabel(r.status)}</td>
                    <td className="py-2">{paymentStatusLabel(r.payment_status)}</td>
                    <td className="py-2">{formatCurrency(r.total_amount)}</td>
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
