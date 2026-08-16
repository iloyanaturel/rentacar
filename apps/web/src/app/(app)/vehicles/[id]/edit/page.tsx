'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
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
  Select,
  TextArea,
} from '@/components/ui';
import { usePermissions } from '@/features/auth/usePermissions';
import { vehiclesService } from '@/services/vehiclesService';
import {
  parseNumber,
  vehicleEditSchema,
  type VehicleEditFormValues,
} from '@/features/vehicles/schemas';
import {
  FUEL_OPTIONS,
  MANUAL_STATUS_OPTIONS,
  TRANSMISSION_OPTIONS,
} from '@/features/vehicles/constants';
import { BrandModelPickers } from '@/features/vehicles/BrandModelPickers';
import { getErrorMessage } from '@/utils/errors';
import type { FuelType, TransmissionType } from '@rentaflow/shared';

export default function EditVehiclePage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const router = useRouter();
  const { can, isLoading: permsLoading } = usePermissions();
  const [formError, setFormError] = useState<string | null>(null);

  const vehicle = useQuery({
    queryKey: ['vehicle', id],
    queryFn: () => vehiclesService.getVehicle(id),
  });

  const {
    control,
    handleSubmit,
    reset,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<VehicleEditFormValues>({
    resolver: zodResolver(vehicleEditSchema),
    defaultValues: {
      brand: '',
      model: '',
      plate: '',
      model_year: '',
      color: '',
      fuel_type: '',
      transmission: '',
      current_km: '',
      daily_price: '',
      deposit_amount: '',
      insurance_expiry: '',
      casco_expiry: '',
      inspection_expiry: '',
      notes: '',
    },
  });

  useEffect(() => {
    if (!vehicle.data) return;
    const v = vehicle.data;
    reset({
      brand: v.brand,
      model: v.model,
      plate: v.plate,
      model_year: v.model_year ? String(v.model_year) : '',
      color: v.color ?? '',
      fuel_type: v.fuel_type ?? '',
      transmission: v.transmission ?? '',
      current_km: v.current_km != null ? String(v.current_km) : '',
      daily_price: String(v.daily_price),
      deposit_amount: v.deposit_amount != null ? String(v.deposit_amount) : '',
      insurance_expiry: v.insurance_expiry ?? '',
      casco_expiry: v.casco_expiry ?? '',
      inspection_expiry: v.inspection_expiry ?? '',
      notes: v.notes ?? '',
      status:
        v.status === 'RENTED'
          ? undefined
          : (v.status as 'AVAILABLE' | 'MAINTENANCE' | 'INACTIVE'),
    });
  }, [vehicle.data, reset]);

  if (!permsLoading && !can('vehicles.update')) {
    return (
      <EmptyState
        title="Yetkiniz yok"
        description="Araç düzenleme yetkiniz bulunmuyor."
        action={
          <Link href="/vehicles">
            <Button variant="secondary">Araçlara Dön</Button>
          </Link>
        }
      />
    );
  }

  if (vehicle.isLoading) return <LoadingBlock />;
  if (vehicle.isError || !vehicle.data) {
    return (
      <EmptyState
        title="Araç bulunamadı"
        description={getErrorMessage(vehicle.error, 'Araç bilgileri yüklenemedi.')}
      />
    );
  }

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    try {
      await vehiclesService.updateVehicle(id, {
        plate: values.plate,
        brand: values.brand,
        model: values.model,
        model_year: values.model_year ? Number(values.model_year) : null,
        color: values.color?.trim() || null,
        fuel_type: (values.fuel_type as FuelType) || null,
        transmission: (values.transmission as TransmissionType) || null,
        current_km: parseNumber(values.current_km),
        daily_price: parseNumber(values.daily_price),
        deposit_amount: parseNumber(values.deposit_amount),
        insurance_expiry: values.insurance_expiry || null,
        casco_expiry: values.casco_expiry || null,
        inspection_expiry: values.inspection_expiry || null,
        notes: values.notes?.trim() || null,
        ...(values.status ? { status: values.status } : {}),
      });
      router.push(`/vehicles/${id}`);
    } catch (error) {
      setFormError(getErrorMessage(error, 'Araç güncellenemedi.'));
    }
  });

  const isRented = vehicle.data.status === 'RENTED';

  return (
    <div>
      <PageHeader
        title="Aracı Düzenle"
        description={vehicle.data.plate}
        actions={
          <Link href={`/vehicles/${id}`}>
            <Button variant="secondary">
              <ArrowLeft className="h-4 w-4" /> Geri
            </Button>
          </Link>
        }
      />

      <Card>
        <form onSubmit={onSubmit} className="space-y-5">
          {formError ? <ErrorBanner message={formError} /> : null}

          <div className="grid gap-4 sm:grid-cols-2">
            <Controller
              control={control}
              name="plate"
              render={({ field }) => (
                <Input {...field} label="Plaka" error={errors.plate?.message} />
              )}
            />
            <Controller
              control={control}
              name="model_year"
              render={({ field }) => (
                <Input
                  {...field}
                  value={field.value ?? ''}
                  type="number"
                  label="Model Yılı"
                  error={errors.model_year?.message}
                />
              )}
            />
            <BrandModelPickers
              control={control}
              brandError={errors.brand?.message}
              modelError={errors.model?.message}
              onBrandChange={() => setValue('model', '')}
            />
            <Controller
              control={control}
              name="color"
              render={({ field }) => (
                <Input {...field} label="Renk" error={errors.color?.message} />
              )}
            />
            <Controller
              control={control}
              name="current_km"
              render={({ field }) => (
                <Input
                  {...field}
                  value={field.value ?? ''}
                  type="number"
                  label="Güncel Kilometre"
                  error={errors.current_km?.message}
                />
              )}
            />
            <Controller
              control={control}
              name="fuel_type"
              render={({ field }) => (
                <Select {...field} label="Yakıt Tipi" error={errors.fuel_type?.message}>
                  <option value="">Seçiniz</option>
                  {FUEL_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </Select>
              )}
            />
            <Controller
              control={control}
              name="transmission"
              render={({ field }) => (
                <Select {...field} label="Vites" error={errors.transmission?.message}>
                  <option value="">Seçiniz</option>
                  {TRANSMISSION_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </Select>
              )}
            />
            <Controller
              control={control}
              name="daily_price"
              render={({ field }) => (
                <Input
                  {...field}
                  value={field.value ?? ''}
                  type="number"
                  step="0.01"
                  label="Günlük Fiyat (₺)"
                  error={errors.daily_price?.message}
                />
              )}
            />
            <Controller
              control={control}
              name="deposit_amount"
              render={({ field }) => (
                <Input
                  {...field}
                  value={field.value ?? ''}
                  type="number"
                  step="0.01"
                  label="Depozito (₺)"
                  error={errors.deposit_amount?.message}
                />
              )}
            />
            <Controller
              control={control}
              name="insurance_expiry"
              render={({ field }) => (
                <Input {...field} type="date" label="Sigorta Bitiş Tarihi" />
              )}
            />
            <Controller
              control={control}
              name="casco_expiry"
              render={({ field }) => (
                <Input {...field} type="date" label="Kasko Bitiş Tarihi" />
              )}
            />
            <Controller
              control={control}
              name="inspection_expiry"
              render={({ field }) => (
                <Input {...field} type="date" label="Muayene Bitiş Tarihi" />
              )}
            />
            {!isRented ? (
              <Controller
                control={control}
                name="status"
                render={({ field }) => (
                  <Select {...field} label="Durum">
                    {MANUAL_STATUS_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </Select>
                )}
              />
            ) : null}
          </div>

          <Controller
            control={control}
            name="notes"
            render={({ field }) => <TextArea {...field} label="Notlar" rows={3} />}
          />

          <div className="sticky bottom-[calc(4.5rem+env(safe-area-inset-bottom))] z-10 -mx-1 flex flex-col-reverse gap-2 border-t border-rf-border bg-white/95 p-3 backdrop-blur sm:static sm:mx-0 sm:flex-row sm:justify-end sm:border-0 sm:bg-transparent sm:p-0 lg:bottom-0">
            <Link href={`/vehicles/${id}`} className="sm:w-auto">
              <Button type="button" variant="secondary" className="w-full sm:w-auto">
                Vazgeç
              </Button>
            </Link>
            <Button type="submit" loading={isSubmitting} className="w-full sm:w-auto">
              Değişiklikleri Kaydet
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
