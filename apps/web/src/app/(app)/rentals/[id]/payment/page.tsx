'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft } from 'lucide-react';
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
  TextArea,
} from '@/components/ui';
import { usePermissions } from '@/features/auth/usePermissions';
import { rentalsService } from '@/services/rentalsService';
import { paymentsService } from '@/services/paymentsService';
import { formatCurrency } from '@/utils/currency';
import { formatDate } from '@/utils/date';
import { paymentMethodLabel } from '@/utils/operations';
import { getErrorMessage } from '@/utils/errors';
import type { PaymentMethod } from '@rentaflow/shared';

const PAYMENT_METHODS: PaymentMethod[] = ['CASH', 'CREDIT_CARD', 'BANK_TRANSFER', 'OTHER'];

export default function RentalPaymentPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const router = useRouter();
  const queryClient = useQueryClient();
  const { can, isLoading: permsLoading } = usePermissions();

  const rental = useQuery({
    queryKey: ['rental', id],
    queryFn: () => rentalsService.getRental(id),
  });
  const summary = useQuery({
    queryKey: ['rental-payments', id],
    queryFn: () => paymentsService.getRentalPaymentSummary(id),
  });

  const [amount, setAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('CASH');
  const [paymentDate, setPaymentDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [referenceNumber, setReferenceNumber] = useState('');
  const [note, setNote] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [reversingId, setReversingId] = useState<string | null>(null);

  if (!permsLoading && !can('payments.create')) {
    return (
      <EmptyState
        title="Yetkiniz yok"
        description="Ödeme kaydetme yetkiniz bulunmuyor."
        action={
          <Link href={`/rentals/${id}`}>
            <Button variant="secondary">Kiralamaya Dön</Button>
          </Link>
        }
      />
    );
  }

  if (rental.isLoading) return <LoadingBlock />;
  if (rental.isError || !rental.data) {
    return (
      <EmptyState
        title="Kiralama bulunamadı"
        description={getErrorMessage(rental.error, 'Kiralama bilgileri yüklenemedi.')}
      />
    );
  }

  async function refresh() {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['rental-payments', id] }),
      queryClient.invalidateQueries({ queryKey: ['rental', id] }),
    ]);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    const value = Number(amount);
    if (!amount || Number.isNaN(value) || value <= 0) {
      setFormError('Geçerli bir ödeme tutarı giriniz.');
      return;
    }

    setSubmitting(true);
    try {
      await paymentsService.createPayment({
        rentalId: id,
        amount: value,
        paymentMethod,
        paymentDate: paymentDate ? new Date(paymentDate).toISOString() : undefined,
        referenceNumber: referenceNumber.trim() || undefined,
        note: note.trim() || undefined,
      });
      setAmount('');
      setReferenceNumber('');
      setNote('');
      await refresh();
      router.push(`/rentals/${id}`);
    } catch (error) {
      setFormError(getErrorMessage(error, 'Ödeme kaydedilemedi.'));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleReverse(paymentId: string) {
    const reason = window.prompt('İptal nedeni (opsiyonel):') ?? undefined;
    setReversingId(paymentId);
    try {
      await paymentsService.reversePayment(paymentId, reason);
      await refresh();
    } catch (error) {
      setFormError(getErrorMessage(error, 'Ödeme iptal edilemedi.'));
    } finally {
      setReversingId(null);
    }
  }

  return (
    <div>
      <PageHeader
        title="Ödeme Al"
        description={`${rental.data.vehicle_plate} · ${rental.data.customer_name}`}
        actions={
          <Link href={`/rentals/${id}`}>
            <Button variant="secondary">
              <ArrowLeft className="h-4 w-4" /> Geri
            </Button>
          </Link>
        }
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <form onSubmit={handleSubmit} className="space-y-5">
            {formError ? <ErrorBanner message={formError} /> : null}
            <div className="grid gap-4 sm:grid-cols-2">
              <Input
                label="Tutar (₺)"
                type="number"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder={summary.data ? String(summary.data.remaining_amount) : '0'}
              />
              <Select
                label="Ödeme Yöntemi"
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
              >
                {PAYMENT_METHODS.map((m) => (
                  <option key={m} value={m}>
                    {paymentMethodLabel(m)}
                  </option>
                ))}
              </Select>
              <Input
                label="Ödeme Tarihi"
                type="date"
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
              />
              <Input
                label="Referans No (opsiyonel)"
                value={referenceNumber}
                onChange={(e) => setReferenceNumber(e.target.value)}
              />
            </div>
            <TextArea
              label="Not (opsiyonel)"
              rows={2}
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
            <div className="flex justify-end gap-2">
              <Link href={`/rentals/${id}`}>
                <Button type="button" variant="secondary">
                  Vazgeç
                </Button>
              </Link>
              <Button type="submit" loading={submitting}>
                Ödemeyi Kaydet
              </Button>
            </div>
          </form>
        </Card>

        <Card>
          <h2 className="mb-3 font-display text-lg font-semibold">Bakiye</h2>
          {summary.data ? (
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-rf-secondary">Toplam</dt>
                <dd className="font-medium">{formatCurrency(summary.data.total_amount)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-rf-secondary">Ödenen</dt>
                <dd className="font-medium">{formatCurrency(summary.data.paid_amount)}</dd>
              </div>
              <div className="flex justify-between border-t border-rf-border pt-2">
                <dt className="font-semibold">Kalan</dt>
                <dd className="font-display text-lg font-bold text-rf-danger">
                  {formatCurrency(summary.data.remaining_amount)}
                </dd>
              </div>
            </dl>
          ) : (
            <LoadingBlock />
          )}
        </Card>
      </div>

      <Card className="mt-4">
        <h2 className="mb-3 font-display text-lg font-semibold">Ödeme Geçmişi</h2>
        {(summary.data?.payments ?? []).length === 0 ? (
          <p className="text-sm text-rf-secondary">Henüz ödeme yapılmadı.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[520px] text-sm">
              <thead>
                <tr className="border-b border-rf-border text-left text-xs uppercase tracking-wide text-rf-faint">
                  <th className="py-2">Tarih</th>
                  <th className="py-2">Yöntem</th>
                  <th className="py-2">Tutar</th>
                  <th className="py-2">Durum</th>
                  <th className="py-2" />
                </tr>
              </thead>
              <tbody>
                {(summary.data?.payments ?? []).map((p) => (
                  <tr key={p.id} className="border-b border-rf-border last:border-0">
                    <td className="py-2">{formatDate(p.payment_date)}</td>
                    <td className="py-2">{paymentMethodLabel(p.payment_method)}</td>
                    <td className="py-2">{formatCurrency(p.amount)}</td>
                    <td className="py-2">
                      {p.voided_at ? (
                        <Badge tone="danger">İptal Edildi</Badge>
                      ) : (
                        <Badge tone="success">Aktif</Badge>
                      )}
                    </td>
                    <td className="py-2 text-right">
                      {!p.voided_at && can('payments.reverse') ? (
                        <Button
                          variant="ghost"
                          className="text-xs"
                          onClick={() => handleReverse(p.id)}
                          loading={reversingId === p.id}
                        >
                          İptal Et
                        </Button>
                      ) : null}
                    </td>
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
