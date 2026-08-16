'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Controller, useForm } from 'react-hook-form';
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
import { settingsService } from '@/services/settingsService';
import { getErrorMessage } from '@/utils/errors';

type RentalSettingsFormValues = {
  default_deposit_amount: string;
  default_daily_km_limit: string;
  extra_km_price: string;
  late_return_tolerance_minutes: string;
  late_return_fee: string;
  tax_enabled: boolean;
  tax_rate: string;
  contract_title: string;
  contract_footer: string;
  contract_body: string;
};

export default function RentalSettingsPage() {
  const { can, isLoading: permsLoading } = usePermissions();
  const queryClient = useQueryClient();
  const [formError, setFormError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const settings = useQuery({
    queryKey: ['organization-settings'],
    queryFn: () => settingsService.getSettings(),
  });

  const {
    control,
    handleSubmit,
    reset,
    watch,
    formState: { isSubmitting },
  } = useForm<RentalSettingsFormValues>({
    defaultValues: {
      default_deposit_amount: '0',
      default_daily_km_limit: '',
      extra_km_price: '0',
      late_return_tolerance_minutes: '0',
      late_return_fee: '0',
      tax_enabled: false,
      tax_rate: '0',
      contract_title: '',
      contract_footer: '',
      contract_body: '',
    },
  });

  useEffect(() => {
    if (!settings.data) return;
    const s = settings.data;
    reset({
      default_deposit_amount: String(s.default_deposit_amount ?? 0),
      default_daily_km_limit:
        s.default_daily_km_limit != null ? String(s.default_daily_km_limit) : '',
      extra_km_price: String(s.extra_km_price ?? 0),
      late_return_tolerance_minutes: String(s.late_return_tolerance_minutes ?? 0),
      late_return_fee: String(s.late_return_fee ?? 0),
      tax_enabled: s.tax_enabled ?? false,
      tax_rate: String(s.tax_rate ?? 0),
      contract_title: s.contract_title ?? '',
      contract_footer: s.contract_footer ?? '',
      contract_body: s.contract_body ?? '',
    });
  }, [settings.data, reset]);

  const taxEnabled = watch('tax_enabled');

  if (!permsLoading && !can('settings.update')) {
    return (
      <EmptyState
        title="Yetkiniz yok"
        description="Kiralama ayarlarını düzenleme yetkiniz bulunmuyor."
        action={
          <Link href="/settings">
            <Button variant="secondary">Ayarlara Dön</Button>
          </Link>
        }
      />
    );
  }

  if (settings.isLoading) return <LoadingBlock />;
  if (settings.isError) {
    return <ErrorBanner message={getErrorMessage(settings.error, 'Ayarlar yüklenemedi.')} />;
  }

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    setSuccess(false);
    try {
      await settingsService.updateSettings({
        default_deposit_amount: Number(values.default_deposit_amount) || 0,
        default_daily_km_limit: values.default_daily_km_limit
          ? Number(values.default_daily_km_limit)
          : null,
        extra_km_price: Number(values.extra_km_price) || 0,
        late_return_tolerance_minutes: Number(values.late_return_tolerance_minutes) || 0,
        late_return_fee: Number(values.late_return_fee) || 0,
        tax_enabled: values.tax_enabled,
        tax_rate: Number(values.tax_rate) || 0,
        contract_title: values.contract_title.trim() || null,
        contract_footer: values.contract_footer.trim() || null,
        contract_body: values.contract_body.trim() || null,
      });
      await queryClient.invalidateQueries({ queryKey: ['organization-settings'] });
      setSuccess(true);
    } catch (error) {
      setFormError(getErrorMessage(error, 'Ayarlar kaydedilemedi.'));
    }
  });

  return (
    <div>
      <PageHeader
        title="Kiralama Ayarları"
        description="Varsayılan depozito, kilometre limiti ve sözleşme metnini yönetin."
        actions={
          <Link href="/settings">
            <Button variant="secondary">
              <ArrowLeft className="h-4 w-4" /> Geri
            </Button>
          </Link>
        }
      />

      <Card>
        <form onSubmit={onSubmit} className="space-y-5">
          {formError ? <ErrorBanner message={formError} /> : null}
          {success ? (
            <div className="rounded-xl bg-rf-success-soft px-4 py-3 text-sm text-rf-success">
              Ayarlar güncellendi.
            </div>
          ) : null}

          <div className="grid gap-4 sm:grid-cols-2">
            <Controller
              control={control}
              name="default_deposit_amount"
              render={({ field }) => (
                <Input {...field} type="number" step="0.01" label="Varsayılan Depozito (₺)" />
              )}
            />
            <Controller
              control={control}
              name="default_daily_km_limit"
              render={({ field }) => (
                <Input {...field} type="number" label="Günlük Kilometre Limiti (opsiyonel)" />
              )}
            />
            <Controller
              control={control}
              name="extra_km_price"
              render={({ field }) => (
                <Input {...field} type="number" step="0.01" label="Ekstra Km Ücreti (₺)" />
              )}
            />
            <Controller
              control={control}
              name="late_return_tolerance_minutes"
              render={({ field }) => (
                <Input {...field} type="number" label="Geç İade Tolerans Süresi (dk)" />
              )}
            />
            <Controller
              control={control}
              name="late_return_fee"
              render={({ field }) => (
                <Input {...field} type="number" step="0.01" label="Geç İade Ücreti (₺)" />
              )}
            />
            <Controller
              control={control}
              name="tax_rate"
              render={({ field }) => (
                <Input
                  {...field}
                  type="number"
                  step="0.01"
                  label="KDV Oranı (%)"
                  disabled={!taxEnabled}
                />
              )}
            />
          </div>

          <Controller
            control={control}
            name="tax_enabled"
            render={({ field }) => (
              <label className="flex items-center gap-3 text-sm">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-rf-border text-rf-primary"
                  checked={field.value}
                  onChange={(e) => field.onChange(e.target.checked)}
                />
                KDV hesaplamasını etkinleştir
              </label>
            )}
          />

          <Controller
            control={control}
            name="contract_title"
            render={({ field }) => <Input {...field} label="Sözleşme Başlığı" />}
          />
          <Controller
            control={control}
            name="contract_body"
            render={({ field }) => <TextArea {...field} label="Sözleşme İçeriği" rows={5} />}
          />
          <Controller
            control={control}
            name="contract_footer"
            render={({ field }) => <TextArea {...field} label="Sözleşme Alt Bilgisi" rows={2} />}
          />

          <div className="flex justify-end">
            <Button type="submit" loading={isSubmitting}>
              Kaydet
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
