'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Pencil, PlayCircle, Wallet, X } from 'lucide-react';
import {
  Badge,
  Button,
  Card,
  EmptyState,
  ErrorBanner,
  LoadingBlock,
  PageHeader,
} from '@/components/ui';
import { usePermissions } from '@/features/auth/usePermissions';
import { rentalsService } from '@/services/rentalsService';
import { paymentsService } from '@/services/paymentsService';
import { handoverService } from '@/services/handoverService';
import { returnService } from '@/services/returnService';
import { formatCurrency } from '@/utils/currency';
import { formatDate, formatTime } from '@/utils/date';
import { paymentStatusLabel, rentalStatusLabel } from '@/utils/labels';
import { getErrorMessage } from '@/utils/errors';

const STATUS_TONE: Record<string, 'success' | 'info' | 'warning' | 'neutral' | 'danger'> = {
  RESERVED: 'info',
  ACTIVE: 'success',
  COMPLETED: 'neutral',
  CANCELLED: 'neutral',
  OVERDUE: 'danger',
};

export default function RentalDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const queryClient = useQueryClient();
  const { can } = usePermissions();
  const [actionError, setActionError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const rental = useQuery({
    queryKey: ['rental', id],
    queryFn: () => rentalsService.getRental(id),
  });
  const payments = useQuery({
    queryKey: ['rental-payments', id],
    queryFn: () => paymentsService.getRentalPaymentSummary(id),
  });
  const handover = useQuery({
    queryKey: ['rental-handover', id],
    queryFn: () => handoverService.getHandover(id),
  });
  const returnInfo = useQuery({
    queryKey: ['rental-return', id],
    queryFn: () => returnService.getReturn(id),
  });

  async function invalidateAll() {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['rental', id] }),
      queryClient.invalidateQueries({ queryKey: ['rentals'] }),
    ]);
  }

  if (rental.isLoading) return <LoadingBlock />;
  if (rental.isError || !rental.data) {
    return (
      <EmptyState
        title="Kiralama bulunamadı"
        description={getErrorMessage(rental.error, 'Kiralama bilgileri yüklenemedi.')}
        action={
          <Link href="/rentals">
            <Button variant="secondary">Kiralamalara Dön</Button>
          </Link>
        }
      />
    );
  }

  const r = rental.data;
  const hasHandover = Boolean(handover.data);
  const hasReturn = Boolean(returnInfo.data);

  async function handleCancel() {
    const reason = window.prompt('İptal nedeni (opsiyonel):') ?? undefined;
    setBusy('cancel');
    setActionError(null);
    try {
      await rentalsService.cancelRental(id, reason);
      await invalidateAll();
    } catch (error) {
      setActionError(getErrorMessage(error, 'Kiralama iptal edilemedi.'));
    } finally {
      setBusy(null);
    }
  }

  async function handleStart() {
    setBusy('start');
    setActionError(null);
    try {
      await rentalsService.startRental(id);
      await invalidateAll();
    } catch (error) {
      setActionError(getErrorMessage(error, 'Kiralama başlatılamadı.'));
    } finally {
      setBusy(null);
    }
  }

  return (
    <div>
      <PageHeader
        title={`${r.vehicle_plate} · ${r.customer_name}`}
        description={`${formatDate(r.start_date)} ${formatTime(r.start_time)} — ${formatDate(r.end_date)} ${formatTime(r.end_time)}`}
        actions={
          <>
            <Link href="/rentals">
              <Button variant="secondary">
                <ArrowLeft className="h-4 w-4" /> Geri
              </Button>
            </Link>
            {can('rentals.update') && r.status === 'RESERVED' ? (
              <Link href={`/rentals/${id}/edit`}>
                <Button variant="secondary">
                  <Pencil className="h-4 w-4" /> Düzenle
                </Button>
              </Link>
            ) : null}
            {can('payments.create') ? (
              <Link href={`/rentals/${id}/payment`}>
                <Button variant="secondary">
                  <Wallet className="h-4 w-4" /> Ödeme Al
                </Button>
              </Link>
            ) : null}
            {can('rentals.update') && r.status === 'RESERVED' ? (
              <Button variant="secondary" onClick={handleStart} loading={busy === 'start'}>
                <PlayCircle className="h-4 w-4" /> Kiralamayı Başlat
              </Button>
            ) : null}
            {can('rentals.complete') && (r.status === 'ACTIVE' || r.display_status === 'OVERDUE') && !hasHandover ? (
              <Link href={`/rentals/${id}/handover`}>
                <Button>Teslim Formu</Button>
              </Link>
            ) : null}
            {can('rentals.complete') && (r.status === 'ACTIVE' || r.display_status === 'OVERDUE') && hasHandover && !hasReturn ? (
              <Link href={`/rentals/${id}/return`}>
                <Button>İade Formu</Button>
              </Link>
            ) : null}
            {can('rentals.cancel') && (r.status === 'RESERVED' || r.status === 'ACTIVE') ? (
              <Button variant="danger" onClick={handleCancel} loading={busy === 'cancel'}>
                <X className="h-4 w-4" /> İptal Et
              </Button>
            ) : null}
          </>
        }
      />

      {actionError ? <ErrorBanner message={actionError} /> : null}

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Badge tone={STATUS_TONE[r.display_status] ?? 'neutral'}>
          {rentalStatusLabel(r.display_status)}
        </Badge>
        <Badge tone="neutral">{paymentStatusLabel(r.payment_status)}</Badge>
        {r.contract_number ? (
          <span className="text-sm text-rf-secondary">Sözleşme No: {r.contract_number}</span>
        ) : null}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <h2 className="mb-3 font-display text-lg font-semibold">Kiralama Bilgileri</h2>
          <dl className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <dt className="text-rf-faint">Araç</dt>
              <dd className="font-medium">
                <Link href={`/vehicles/${r.vehicle_id}`} className="text-rf-primary hover:underline">
                  {r.vehicle_plate}
                </Link>
                <span className="ml-1 text-rf-secondary">
                  {r.vehicle_brand} {r.vehicle_model}
                </span>
              </dd>
            </div>
            <div>
              <dt className="text-rf-faint">Müşteri</dt>
              <dd className="font-medium">
                <Link href={`/customers/${r.customer_id}`} className="text-rf-primary hover:underline">
                  {r.customer_name}
                </Link>
              </dd>
            </div>
            <div>
              <dt className="text-rf-faint">Toplam Gün</dt>
              <dd className="font-medium">{r.total_days}</dd>
            </div>
            <div>
              <dt className="text-rf-faint">Günlük Fiyat</dt>
              <dd className="font-medium">{formatCurrency(r.daily_price)}</dd>
            </div>
            <div>
              <dt className="text-rf-faint">İndirim</dt>
              <dd className="font-medium">{formatCurrency(r.discount_amount)}</dd>
            </div>
            <div>
              <dt className="text-rf-faint">Ek Ücret</dt>
              <dd className="font-medium">{formatCurrency(r.extra_charge)}</dd>
            </div>
            <div>
              <dt className="text-rf-faint">Depozito</dt>
              <dd className="font-medium">{formatCurrency(r.deposit_amount)}</dd>
            </div>
            <div>
              <dt className="text-rf-faint">Toplam Tutar</dt>
              <dd className="font-semibold">{formatCurrency(r.total_amount)}</dd>
            </div>
          </dl>
          {r.notes ? (
            <p className="mt-3 rounded-xl bg-rf-muted px-3 py-2 text-sm text-rf-secondary">
              {r.notes}
            </p>
          ) : null}
        </Card>

        <Card>
          <h2 className="mb-3 font-display text-lg font-semibold">Ödeme Özeti</h2>
          {payments.data ? (
            <>
              <dl className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <dt className="text-rf-faint">Toplam</dt>
                  <dd className="font-medium">{formatCurrency(payments.data.total_amount)}</dd>
                </div>
                <div>
                  <dt className="text-rf-faint">Ödenen</dt>
                  <dd className="font-medium">{formatCurrency(payments.data.paid_amount)}</dd>
                </div>
                <div>
                  <dt className="text-rf-faint">Kalan</dt>
                  <dd className="font-semibold text-rf-danger">
                    {formatCurrency(payments.data.remaining_amount)}
                  </dd>
                </div>
              </dl>
              {payments.data.payments.length > 0 ? (
                <ul className="mt-3 space-y-2">
                  {payments.data.payments.map((p) => (
                    <li
                      key={p.id}
                      className="flex items-center justify-between rounded-xl bg-rf-muted px-3 py-2 text-sm"
                    >
                      <span>
                        {formatDate(p.payment_date)}
                        {p.voided_at ? (
                          <Badge tone="danger" className="ml-2">
                            İptal
                          </Badge>
                        ) : null}
                      </span>
                      <span className="font-medium">{formatCurrency(p.amount)}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-3 text-sm text-rf-secondary">Henüz ödeme yapılmadı.</p>
              )}
            </>
          ) : (
            <LoadingBlock />
          )}
        </Card>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card>
          <h2 className="mb-3 font-display text-lg font-semibold">Teslim (Handover)</h2>
          {handover.data ? (
            <p className="text-sm text-rf-secondary">
              {formatDate(handover.data.completed_at)} tarihinde tamamlandı ·{' '}
              {handover.data.odometer_km.toLocaleString('tr-TR')} km
            </p>
          ) : (
            <p className="text-sm text-rf-secondary">Henüz teslim yapılmadı.</p>
          )}
        </Card>
        <Card>
          <h2 className="mb-3 font-display text-lg font-semibold">İade</h2>
          {returnInfo.data ? (
            <p className="text-sm text-rf-secondary">
              {formatDate(returnInfo.data.completed_at)} tarihinde tamamlandı ·{' '}
              {returnInfo.data.odometer_km.toLocaleString('tr-TR')} km
            </p>
          ) : (
            <p className="text-sm text-rf-secondary">Henüz iade yapılmadı.</p>
          )}
        </Card>
      </div>
    </div>
  );
}
