'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { ArrowLeft } from 'lucide-react';
import {
  Button,
  Card,
  EmptyState,
  ErrorBanner,
  Input,
  PageHeader,
  TextArea,
} from '@/components/ui';
import { useAuth } from '@/features/auth/AuthProvider';
import { usePermissions } from '@/features/auth/usePermissions';
import { settingsService } from '@/services/settingsService';
import { getErrorMessage } from '@/utils/errors';

type BusinessFormValues = {
  name: string;
  phone: string;
  email: string;
  address: string;
  website: string;
  tax_office: string;
  tax_number: string;
};

export default function BusinessSettingsPage() {
  const { organization, refreshProfile } = useAuth();
  const { can, isLoading: permsLoading } = usePermissions();
  const [formError, setFormError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const {
    control,
    handleSubmit,
    reset,
    formState: { isSubmitting },
  } = useForm<BusinessFormValues>({
    defaultValues: {
      name: '',
      phone: '',
      email: '',
      address: '',
      website: '',
      tax_office: '',
      tax_number: '',
    },
  });

  useEffect(() => {
    if (!organization) return;
    reset({
      name: organization.name ?? '',
      phone: organization.phone ?? '',
      email: organization.email ?? '',
      address: organization.address ?? '',
      website: organization.website ?? '',
      tax_office: organization.tax_office ?? '',
      tax_number: organization.tax_number ?? '',
    });
  }, [organization, reset]);

  if (!permsLoading && !can('settings.update')) {
    return (
      <EmptyState
        title="Yetkiniz yok"
        description="İşletme bilgilerini düzenleme yetkiniz bulunmuyor."
        action={
          <Link href="/settings">
            <Button variant="secondary">Ayarlara Dön</Button>
          </Link>
        }
      />
    );
  }

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    setSuccess(false);
    try {
      await settingsService.updateBusinessProfile({
        name: values.name.trim(),
        phone: values.phone.trim() || null,
        email: values.email.trim() || null,
        address: values.address.trim() || null,
        website: values.website.trim() || null,
        tax_office: values.tax_office.trim() || null,
        tax_number: values.tax_number.trim() || null,
      });
      await refreshProfile();
      setSuccess(true);
    } catch (error) {
      setFormError(getErrorMessage(error, 'İşletme bilgileri kaydedilemedi.'));
    }
  });

  return (
    <div>
      <PageHeader
        title="İşletme Bilgileri"
        description="Organizasyon iletişim ve vergi bilgilerinizi güncelleyin."
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
              İşletme bilgileri güncellendi.
            </div>
          ) : null}

          <div className="grid gap-4 sm:grid-cols-2">
            <Controller
              control={control}
              name="name"
              render={({ field }) => <Input {...field} label="İşletme Adı" />}
            />
            <Controller
              control={control}
              name="phone"
              render={({ field }) => <Input {...field} label="Telefon" />}
            />
            <Controller
              control={control}
              name="email"
              render={({ field }) => <Input {...field} type="email" label="E-posta" />}
            />
            <Controller
              control={control}
              name="website"
              render={({ field }) => <Input {...field} label="Web Sitesi" />}
            />
            <Controller
              control={control}
              name="tax_office"
              render={({ field }) => <Input {...field} label="Vergi Dairesi" />}
            />
            <Controller
              control={control}
              name="tax_number"
              render={({ field }) => <Input {...field} label="Vergi No" />}
            />
          </div>

          <Controller
            control={control}
            name="address"
            render={({ field }) => <TextArea {...field} label="Adres" rows={3} />}
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
