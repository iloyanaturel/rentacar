'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
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
import { vehiclesService } from '@/services/vehiclesService';
import {
  parseNumber,
  vehicleFormSchema,
  type VehicleFormValues,
} from '@/features/vehicles/schemas';
import { FUEL_OPTIONS, TRANSMISSION_OPTIONS } from '@/features/vehicles/constants';
import { getErrorMessage } from '@/utils/errors';
import type { FuelType, TransmissionType } from '@rentaflow/shared';

export default function NewVehiclePage() {
  const { can, isLoading: permsLoading } = usePermissions();
  const router = useRouter();
  const [formError, setFormError] = useState<string | null>(null);

  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<VehicleFormValues>({
    resolver: zodResolver(vehicleFormSchema),
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

  if (!permsLoading && !can('vehicles.create')) {
    return (
      <EmptyState
        title="Yetkiniz yok"
        description="Araç ekleme yetkiniz bulunmuyor."
        action={
          <Link href="/vehicles">
            <Button variant="secondary">Araçlara Dön</Button>
          </Link>
        }
      />
    );
  }

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    try {
      const vehicle = await vehiclesService.createVehicle({
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
      });
      router.push(`/vehicles/${vehicle.id}`);
    } catch (error) {
      setFormError(getErrorMessage(error, 'Araç kaydedilemedi.'));
    }
  });

  return (
    <div>
      <PageHeader
        title="Yeni Araç"
        description="Filonuza yeni bir araç ekleyin."
        actions={
          <Link href="/vehicles">
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
                <Input
                  {...field}
                  label="Plaka"
                  placeholder="34 ABC 123"
                  error={errors.plate?.message}
                />
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
                  placeholder="2023"
                  error={errors.model_year?.message}
                />
              )}
            />
            <Controller
              control={control}
              name="brand"
              render={({ field }) => (
                <Input {...field} label="Marka" placeholder="Renault" error={errors.brand?.message} />
              )}
            />
            <Controller
              control={control}
              name="model"
              render={({ field }) => (
                <Input {...field} label="Model" placeholder="Clio" error={errors.model?.message} />
              )}
            />
            <Controller
              control={control}
              name="color"
              render={({ field }) => (
                <Input {...field} label="Renk" placeholder="Beyaz" error={errors.color?.message} />
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
                  placeholder="0"
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
                  placeholder="1500"
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
                  placeholder="5000"
                  error={errors.deposit_amount?.message}
                />
              )}
            />
            <Controller
              control={control}
              name="insurance_expiry"
              render={({ field }) => (
                <Input
                  {...field}
                  type="date"
                  label="Sigorta Bitiş Tarihi"
                  error={errors.insurance_expiry?.message}
                />
              )}
            />
            <Controller
              control={control}
              name="casco_expiry"
              render={({ field }) => (
                <Input
                  {...field}
                  type="date"
                  label="Kasko Bitiş Tarihi"
                  error={errors.casco_expiry?.message}
                />
              )}
            />
            <Controller
              control={control}
              name="inspection_expiry"
              render={({ field }) => (
                <Input
                  {...field}
                  type="date"
                  label="Muayene Bitiş Tarihi"
                  error={errors.inspection_expiry?.message}
                />
              )}
            />
          </div>

          <Controller
            control={control}
            name="notes"
            render={({ field }) => (
              <TextArea {...field} label="Notlar" rows={3} error={errors.notes?.message} />
            )}
          />

          <div className="flex justify-end gap-2">
            <Link href="/vehicles">
              <Button type="button" variant="secondary">
                Vazgeç
              </Button>
            </Link>
            <Button type="submit" loading={isSubmitting}>
              Aracı Kaydet
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
