'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowLeft } from 'lucide-react';
import {
  Button,
  Card,
  EmptyState,
  ErrorBanner,
  Input,
  LoadingBlock,
  PageHeader,
  TextArea,
} from '@/components/ui';
import { usePermissions } from '@/features/auth/usePermissions';
import { rentalsService, calcRentalPricing } from '@/services/rentalsService';
import {
  parseNumber,
  rentalEditSchema,
  type RentalEditFormValues,
} from '@/features/rentals/schemas';
import { formatCurrency } from '@/utils/currency';
import { getErrorMessage } from '@/utils/errors';

export default function EditRentalPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const router = useRouter();
  const { can, isLoading: permsLoading } = usePermissions();
  const [formError, setFormError] = useState<string | null>(null);

  const rental = useQuery({
    queryKey: ['rental', id],
    queryFn: () => rentalsService.getRental(id),
  });

  const {
    control,
    handleSubmit,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<RentalEditFormValues>({
    resolver: zodResolver(rentalEditSchema),
    defaultValues: {
      start_date: '',
      start_time: '',
      end_date: '',
      end_time: '',
      daily_price: '',
      discount_amount: '0',
      extra_charge: '0',
      deposit_amount: '0',
      notes: '',
    },
  });

  useEffect(() => {
    if (!rental.data) return;
    const r = rental.data;
    reset({
      start_date: r.start_date,
      start_time: r.start_time,
      end_date: r.end_date,
      end_time: r.end_time,
      daily_price: String(r.daily_price),
      discount_amount: String(r.discount_amount),
      extra_charge: String(r.extra_charge),
      deposit_amount: String(r.deposit_amount),
      notes: r.notes ?? '',
    });
  }, [rental.data, reset]);

  const values = watch();
  const pricing = useMemo(() => {
    try {
      return {
        result: calcRentalPricing({
          dailyPrice: parseNumber(values.daily_price),
          startDate: values.start_date,
          startTime: values.start_time,
          endDate: values.end_date,
          endTime: values.end_time,
          discount: parseNumber(values.discount_amount),
          extra: parseNumber(values.extra_charge),
          deposit: parseNumber(values.deposit_amount),
        }),
        error: null as string | null,
      };
    } catch (error) {
      return { result: null, error: getErrorMessage(error) };
    }
  }, [values]);

  if (!permsLoading && !can('rentals.update')) {
    return (
      <EmptyState
        title="Yetkiniz yok"
        description="Kiralama düzenleme yetkiniz bulunmuyor."
        action={
          <Link href="/rentals">
            <Button variant="secondary">Kiralamalara Dön</Button>
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

  if (rental.data.status !== 'RESERVED') {
    return (
      <EmptyState
        title="Bu kiralama düzenlenemez"
        description="Sadece rezervasyon durumundaki kiralamalar düzenlenebilir."
        action={
          <Link href={`/rentals/${id}`}>
            <Button variant="secondary">Kiralamaya Dön</Button>
          </Link>
        }
      />
    );
  }

  const onSubmit = handleSubmit(async (formValues) => {
    setFormError(null);
    try {
      await rentalsService.updateReservedRental(id, {
        start_date: formValues.start_date,
        start_time: formValues.start_time,
        end_date: formValues.end_date,
        end_time: formValues.end_time,
        daily_price: parseNumber(formValues.daily_price),
        discount_amount: parseNumber(formValues.discount_amount),
        extra_charge: parseNumber(formValues.extra_charge),
        deposit_amount: parseNumber(formValues.deposit_amount),
        notes: formValues.notes?.trim() || null,
      });
      router.push(`/rentals/${id}`);
    } catch (error) {
      setFormError(getErrorMessage(error, 'Kiralama güncellenemedi.'));
    }
  });

  return (
    <div>
      <PageHeader
        title="Kiralamayı Düzenle"
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
          <form onSubmit={onSubmit} className="space-y-5">
            {formError ? <ErrorBanner message={formError} /> : null}

            <div className="grid gap-4 sm:grid-cols-2">
              <Controller
                control={control}
                name="start_date"
                render={({ field }) => (
                  <Input {...field} type="date" label="Başlangıç Tarihi" error={errors.start_date?.message} />
                )}
              />
              <Controller
                control={control}
                name="start_time"
                render={({ field }) => (
                  <Input {...field} type="time" label="Başlangıç Saati" error={errors.start_time?.message} />
                )}
              />
              <Controller
                control={control}
                name="end_date"
                render={({ field }) => (
                  <Input {...field} type="date" label="Teslim Tarihi" error={errors.end_date?.message} />
                )}
              />
              <Controller
                control={control}
                name="end_time"
                render={({ field }) => (
                  <Input {...field} type="time" label="Teslim Saati" error={errors.end_time?.message} />
                )}
              />
              <Controller
                control={control}
                name="daily_price"
                render={({ field }) => (
                  <Input {...field} type="number" step="0.01" label="Günlük Fiyat (₺)" error={errors.daily_price?.message} />
                )}
              />
              <Controller
                control={control}
                name="discount_amount"
                render={({ field }) => (
                  <Input {...field} type="number" step="0.01" label="İndirim (₺)" error={errors.discount_amount?.message} />
                )}
              />
              <Controller
                control={control}
                name="extra_charge"
                render={({ field }) => (
                  <Input {...field} type="number" step="0.01" label="Ek Ücret (₺)" error={errors.extra_charge?.message} />
                )}
              />
              <Controller
                control={control}
                name="deposit_amount"
                render={({ field }) => (
                  <Input {...field} type="number" step="0.01" label="Depozito (₺)" error={errors.deposit_amount?.message} />
                )}
              />
            </div>

            <Controller
              control={control}
              name="notes"
              render={({ field }) => <TextArea {...field} label="Notlar" rows={3} />}
            />

            <div className="flex justify-end gap-2">
              <Link href={`/rentals/${id}`}>
                <Button type="button" variant="secondary">
                  Vazgeç
                </Button>
              </Link>
              <Button type="submit" loading={isSubmitting}>
                Değişiklikleri Kaydet
              </Button>
            </div>
          </form>
        </Card>

        <Card>
          <h2 className="mb-3 font-display text-lg font-semibold">Fiyat Özeti</h2>
          {pricing.error ? (
            <ErrorBanner message={pricing.error} />
          ) : pricing.result ? (
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-rf-secondary">Gün Sayısı</dt>
                <dd className="font-medium">{pricing.result.days}</dd>
              </div>
              <div className="flex justify-between border-t border-rf-border pt-2">
                <dt className="font-semibold text-rf-text">Toplam</dt>
                <dd className="font-display text-lg font-bold text-rf-primary">
                  {formatCurrency(pricing.result.total)}
                </dd>
              </div>
            </dl>
          ) : null}
        </Card>
      </div>
    </div>
  );
}
