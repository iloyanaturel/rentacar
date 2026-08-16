'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Plus, Trash2 } from 'lucide-react';
import {
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
import { returnService, type ExtraChargeDraft } from '@/services/returnService';
import { FUEL_LEVELS, EXTRA_CHARGE_TYPES, type FuelLevel } from '@/utils/operations';
import { paymentMethodLabel } from '@/utils/operations';
import { getErrorMessage } from '@/utils/errors';
import type { PaymentMethod } from '@rentaflow/shared';

const DEPOSIT_ACTIONS: { value: 'FULL_REFUND' | 'PARTIAL_REFUND' | 'FORFEIT' | 'NONE'; label: string }[] = [
  { value: 'FULL_REFUND', label: 'Tam İade' },
  { value: 'PARTIAL_REFUND', label: 'Kısmi İade' },
  { value: 'FORFEIT', label: 'Mahsup Et' },
  { value: 'NONE', label: 'İşlem Yok' },
];

const PAYMENT_METHODS: PaymentMethod[] = ['CASH', 'CREDIT_CARD', 'BANK_TRANSFER', 'OTHER'];

export default function RentalReturnPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const router = useRouter();
  const { can, isLoading: permsLoading } = usePermissions();

  const rental = useQuery({
    queryKey: ['rental', id],
    queryFn: () => rentalsService.getRental(id),
  });

  const [odometerKm, setOdometerKm] = useState('');
  const [fuelLevel, setFuelLevel] = useState<FuelLevel>('FULL');
  const [sendToMaintenance, setSendToMaintenance] = useState(false);
  const [depositAction, setDepositAction] = useState<'FULL_REFUND' | 'PARTIAL_REFUND' | 'FORFEIT' | 'NONE'>('FULL_REFUND');
  const [depositDeduction, setDepositDeduction] = useState('0');
  const [checklistConfirmed, setChecklistConfirmed] = useState(false);
  const [notes, setNotes] = useState('');
  const [extraCharges, setExtraCharges] = useState<ExtraChargeDraft[]>([]);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('CASH');
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (!permsLoading && !can('rentals.complete')) {
    return (
      <EmptyState
        title="Yetkiniz yok"
        description="İade formu oluşturma yetkiniz bulunmuyor."
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

  function addExtraCharge() {
    setExtraCharges((rows) => [
      ...rows,
      { charge_type: 'OTHER', description: '', amount: 0 },
    ]);
  }

  function updateExtraCharge(index: number, patch: Partial<ExtraChargeDraft>) {
    setExtraCharges((rows) =>
      rows.map((row, i) => (i === index ? { ...row, ...patch } : row)),
    );
  }

  function removeExtraCharge(index: number) {
    setExtraCharges((rows) => rows.filter((_, i) => i !== index));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);

    if (!checklistConfirmed) {
      setFormError('İade kontrol listesini onaylamanız gerekiyor.');
      return;
    }
    const km = Number(odometerKm);
    if (!odometerKm || Number.isNaN(km) || km < 0) {
      setFormError('Geçerli bir kilometre değeri giriniz.');
      return;
    }

    setSubmitting(true);
    try {
      await returnService.completeReturn({
        rentalId: id,
        odometerKm: km,
        fuelLevel,
        sendToMaintenance,
        depositAction,
        depositDeduction: Number(depositDeduction) || 0,
        checklistConfirmed,
        notes: notes.trim() || undefined,
        extraCharges: extraCharges
          .filter((c) => c.amount > 0)
          .map((c) => ({ ...c, amount: Number(c.amount) || 0 })),
        paymentAmount: paymentAmount ? Number(paymentAmount) : undefined,
        paymentMethod: paymentAmount ? paymentMethod : undefined,
      });
      router.push(`/rentals/${id}`);
    } catch (error) {
      setFormError(getErrorMessage(error, 'İade tamamlanamadı.'));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="Araç İade Formu"
        description={`${rental.data.vehicle_plate} · ${rental.data.customer_name}`}
        actions={
          <Link href={`/rentals/${id}`}>
            <Button variant="secondary">
              <ArrowLeft className="h-4 w-4" /> Geri
            </Button>
          </Link>
        }
      />

      <Card>
        <form onSubmit={handleSubmit} className="space-y-5">
          {formError ? <ErrorBanner message={formError} /> : null}

          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="Kilometre"
              type="number"
              value={odometerKm}
              onChange={(e) => setOdometerKm(e.target.value)}
              placeholder="Örn. 45350"
            />
            <Select
              label="Yakıt Seviyesi"
              value={fuelLevel}
              onChange={(e) => setFuelLevel(e.target.value as FuelLevel)}
            >
              {FUEL_LEVELS.map((f) => (
                <option key={f.value} value={f.value}>
                  {f.label}
                </option>
              ))}
            </Select>
            <Select
              label="Depozito İşlemi"
              value={depositAction}
              onChange={(e) => setDepositAction(e.target.value as typeof depositAction)}
            >
              {DEPOSIT_ACTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </Select>
            {depositAction === 'PARTIAL_REFUND' ? (
              <Input
                label="Depozito Kesintisi (₺)"
                type="number"
                step="0.01"
                value={depositDeduction}
                onChange={(e) => setDepositDeduction(e.target.value)}
              />
            ) : null}
          </div>

          <label className="flex items-center gap-3 text-sm">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-rf-border text-rf-primary"
              checked={sendToMaintenance}
              onChange={(e) => setSendToMaintenance(e.target.checked)}
            />
            Araç bakıma gönderilsin
          </label>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <p className="text-sm font-medium text-rf-secondary">Ek Ücretler</p>
              <Button type="button" variant="ghost" onClick={addExtraCharge}>
                <Plus className="h-4 w-4" /> Ekle
              </Button>
            </div>
            {extraCharges.length === 0 ? (
              <p className="text-sm text-rf-faint">Ek ücret eklenmedi.</p>
            ) : (
              <div className="space-y-2">
                {extraCharges.map((charge, index) => (
                  <div
                    key={index}
                    className="grid gap-2 rounded-xl border border-rf-border p-3 sm:grid-cols-[1fr_1fr_120px_auto]"
                  >
                    <Select
                      value={charge.charge_type}
                      onChange={(e) =>
                        updateExtraCharge(index, {
                          charge_type: e.target.value as ExtraChargeDraft['charge_type'],
                        })
                      }
                    >
                      {EXTRA_CHARGE_TYPES.map((t) => (
                        <option key={t.value} value={t.value}>
                          {t.label}
                        </option>
                      ))}
                    </Select>
                    <Input
                      placeholder="Açıklama"
                      value={charge.description ?? ''}
                      onChange={(e) => updateExtraCharge(index, { description: e.target.value })}
                    />
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="Tutar"
                      value={charge.amount || ''}
                      onChange={(e) =>
                        updateExtraCharge(index, { amount: Number(e.target.value) || 0 })
                      }
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => removeExtraCharge(index)}
                      aria-label="Kaldır"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="grid gap-4 rounded-xl bg-rf-muted p-3 sm:grid-cols-2">
            <Input
              label="Tahsilat Tutarı (opsiyonel)"
              type="number"
              step="0.01"
              value={paymentAmount}
              onChange={(e) => setPaymentAmount(e.target.value)}
              placeholder="Kalan bakiye için ödeme al"
            />
            <Select
              label="Ödeme Yöntemi"
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
              disabled={!paymentAmount}
            >
              {PAYMENT_METHODS.map((m) => (
                <option key={m} value={m}>
                  {paymentMethodLabel(m)}
                </option>
              ))}
            </Select>
          </div>

          <TextArea
            label="İade Notları"
            rows={3}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />

          <label className="flex items-start gap-3 rounded-xl bg-rf-muted px-3 py-3 text-sm">
            <input
              type="checkbox"
              className="mt-0.5 h-4 w-4 rounded border-rf-border text-rf-primary"
              checked={checklistConfirmed}
              onChange={(e) => setChecklistConfirmed(e.target.checked)}
            />
            <span>
              Aracın iade kontrol listesini (dış görünüm, hasar, kilometre, yakıt) kontrol
              ettim ve onaylıyorum.
            </span>
          </label>

          <div className="flex justify-end gap-2">
            <Link href={`/rentals/${id}`}>
              <Button type="button" variant="secondary">
                Vazgeç
              </Button>
            </Link>
            <Button type="submit" loading={submitting}>
              İadeyi Tamamla
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
