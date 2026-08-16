'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
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
  PageHeader,
  Select,
  TextArea,
} from '@/components/ui';
import { usePermissions } from '@/features/auth/usePermissions';
import { customersService } from '@/services/customersService';
import { rentalsService, calcRentalPricing } from '@/services/rentalsService';
import {
  parseNumber,
  rentalFormSchema,
  type RentalFormValues,
} from '@/features/rentals/schemas';
import { formatCurrency } from '@/utils/currency';
import { getErrorMessage } from '@/utils/errors';
import { getTodayIsoInIstanbul } from '@/utils/date';

export default function NewRentalPage() {
  const { can, isLoading: permsLoading } = usePermissions();
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectedVehicleId = searchParams.get('vehicleId') ?? '';
  const [formError, setFormError] = useState<string | null>(null);
  const [customerSearch, setCustomerSearch] = useState('');

  const vehiclesQuery = useQuery({
    queryKey: ['rental-vehicle-picker'],
    queryFn: () => rentalsService.getAvailableVehiclesForPicker(),
  });

  const customersQuery = useQuery({
    queryKey: ['rental-customer-picker', customerSearch],
    queryFn: () =>
      customersService.getCustomers({ search: customerSearch, pageSize: 20 }),
  });

  const today = getTodayIsoInIstanbul();

  const {
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<RentalFormValues>({
    resolver: zodResolver(rentalFormSchema),
    defaultValues: {
      vehicle_id: preselectedVehicleId,
      customer_id: '',
      start_date: today,
      start_time: '10:00',
      end_date: today,
      end_time: '10:00',
      daily_price: '',
      discount_amount: '0',
      extra_charge: '0',
      deposit_amount: '0',
      notes: '',
    },
  });

  const values = watch();
  const availableVehicles = (vehiclesQuery.data ?? []).filter(
    (v) => v.status === 'AVAILABLE' || v.id === values.vehicle_id,
  );

  useEffect(() => {
    if (!preselectedVehicleId || !vehiclesQuery.data) return;
    const vehicle = vehiclesQuery.data.find((v) => v.id === preselectedVehicleId);
    if (vehicle) {
      setValue('daily_price', String(vehicle.daily_price));
      setValue('deposit_amount', String(vehicle.deposit_amount));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vehiclesQuery.data, preselectedVehicleId]);

  function handleVehicleChange(vehicleId: string) {
    setValue('vehicle_id', vehicleId);
    const vehicle = vehiclesQuery.data?.find((v) => v.id === vehicleId);
    if (vehicle) {
      setValue('daily_price', String(vehicle.daily_price));
      setValue('deposit_amount', String(vehicle.deposit_amount));
    }
  }

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
  }, [
    values.daily_price,
    values.start_date,
    values.start_time,
    values.end_date,
    values.end_time,
    values.discount_amount,
    values.extra_charge,
    values.deposit_amount,
  ]);

  if (!permsLoading && !can('rentals.create')) {
    return (
      <EmptyState
        title="Yetkiniz yok"
        description="Kiralama oluşturma yetkiniz bulunmuyor."
        action={
          <Link href="/rentals">
            <Button variant="secondary">Kiralamalara Dön</Button>
          </Link>
        }
      />
    );
  }

  const onSubmit = handleSubmit(async (formValues) => {
    setFormError(null);
    try {
      const rental = await rentalsService.createRental({
        vehicle_id: formValues.vehicle_id,
        customer_id: formValues.customer_id,
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
      router.push(`/rentals/${rental.id}`);
    } catch (error) {
      setFormError(getErrorMessage(error, 'Kiralama oluşturulamadı.'));
    }
  });

  return (
    <div>
      <PageHeader
        title="Yeni Kiralama"
        description="Araç ve müşteri seçerek kiralama oluşturun."
        actions={
          <Link href="/rentals">
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
                name="vehicle_id"
                render={({ field }) => (
                  <Select
                    value={field.value}
                    onChange={(e) => handleVehicleChange(e.target.value)}
                    label="Araç"
                    error={errors.vehicle_id?.message}
                  >
                    <option value="">Araç seçin</option>
                    {availableVehicles.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.plate} · {v.brand} {v.model}
                      </option>
                    ))}
                  </Select>
                )}
              />

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-rf-secondary">Müşteri</label>
                <Input
                  value={customerSearch}
                  onChange={(e) => setCustomerSearch(e.target.value)}
                  placeholder="Müşteri ara…"
                />
                <Controller
                  control={control}
                  name="customer_id"
                  render={({ field }) => (
                    <Select {...field} error={errors.customer_id?.message}>
                      <option value="">Müşteri seçin</option>
                      {(customersQuery.data?.items ?? []).map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.first_name} {c.last_name} · {c.phone ?? ''}
                        </option>
                      ))}
                    </Select>
                  )}
                />
              </div>

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
                  <Input
                    {...field}
                    type="number"
                    step="0.01"
                    label="Günlük Fiyat (₺)"
                    error={errors.daily_price?.message}
                  />
                )}
              />
              <Controller
                control={control}
                name="discount_amount"
                render={({ field }) => (
                  <Input
                    {...field}
                    type="number"
                    step="0.01"
                    label="İndirim (₺)"
                    error={errors.discount_amount?.message}
                  />
                )}
              />
              <Controller
                control={control}
                name="extra_charge"
                render={({ field }) => (
                  <Input
                    {...field}
                    type="number"
                    step="0.01"
                    label="Ek Ücret (₺)"
                    error={errors.extra_charge?.message}
                  />
                )}
              />
              <Controller
                control={control}
                name="deposit_amount"
                render={({ field }) => (
                  <Input
                    {...field}
                    type="number"
                    step="0.01"
                    label="Depozito (₺)"
                    error={errors.deposit_amount?.message}
                  />
                )}
              />
            </div>

            <Controller
              control={control}
              name="notes"
              render={({ field }) => <TextArea {...field} label="Notlar" rows={3} />}
            />

            <div className="flex justify-end gap-2">
              <Link href="/rentals">
                <Button type="button" variant="secondary">
                  Vazgeç
                </Button>
              </Link>
              <Button type="submit" loading={isSubmitting}>
                Kiralamayı Oluştur
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
              <div className="flex justify-between">
                <dt className="text-rf-secondary">Ara Toplam</dt>
                <dd className="font-medium">{formatCurrency(pricing.result.subtotal)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-rf-secondary">İndirim</dt>
                <dd className="font-medium">-{formatCurrency(pricing.result.discount)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-rf-secondary">Ek Ücret</dt>
                <dd className="font-medium">{formatCurrency(pricing.result.extra)}</dd>
              </div>
              <div className="flex justify-between border-t border-rf-border pt-2">
                <dt className="font-semibold text-rf-text">Toplam</dt>
                <dd className="font-display text-lg font-bold text-rf-primary">
                  {formatCurrency(pricing.result.total)}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-rf-secondary">Depozito</dt>
                <dd className="font-medium">{formatCurrency(pricing.result.deposit)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-rf-secondary">Tahsil Edilecek</dt>
                <dd className="font-semibold">{formatCurrency(pricing.result.payable)}</dd>
              </div>
            </dl>
          ) : null}
        </Card>
      </div>
    </div>
  );
}
