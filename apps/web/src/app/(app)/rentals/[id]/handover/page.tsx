'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft } from 'lucide-react';
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
import { handoverService } from '@/services/handoverService';
import { FUEL_LEVELS, type FuelLevel } from '@/utils/operations';
import { getErrorMessage } from '@/utils/errors';

export default function RentalHandoverPage() {
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
  const [checklistConfirmed, setChecklistConfirmed] = useState(false);
  const [customerAckName, setCustomerAckName] = useState('');
  const [notes, setNotes] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (!permsLoading && !can('rentals.complete')) {
    return (
      <EmptyState
        title="Yetkiniz yok"
        description="Teslim formu oluşturma yetkiniz bulunmuyor."
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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);

    if (!checklistConfirmed) {
      setFormError('Teslim kontrol listesini onaylamanız gerekiyor.');
      return;
    }
    const km = Number(odometerKm);
    if (!odometerKm || Number.isNaN(km) || km < 0) {
      setFormError('Geçerli bir kilometre değeri giriniz.');
      return;
    }

    setSubmitting(true);
    try {
      await handoverService.createHandover({
        rentalId: id,
        odometerKm: km,
        fuelLevel,
        checklistConfirmed,
        customerAckName: customerAckName.trim() || undefined,
        notes: notes.trim() || undefined,
      });
      router.push(`/rentals/${id}`);
    } catch (error) {
      setFormError(getErrorMessage(error, 'Teslim tamamlanamadı.'));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="Araç Teslim Formu"
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
              placeholder="Örn. 45000"
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
            <Input
              label="Müşteri Onay Adı (opsiyonel)"
              value={customerAckName}
              onChange={(e) => setCustomerAckName(e.target.value)}
            />
          </div>

          <TextArea
            label="Notlar"
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
              Aracın kontrol listesini (dış görünüm, hasar, aksesuar) müşteri ile birlikte
              kontrol ettim ve onaylıyorum.
            </span>
          </label>

          <div className="flex justify-end gap-2">
            <Link href={`/rentals/${id}`}>
              <Button type="button" variant="secondary">
                Vazgeç
              </Button>
            </Link>
            <Button type="submit" loading={submitting}>
              Teslimi Tamamla
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
