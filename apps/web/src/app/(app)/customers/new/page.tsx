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
  TextArea,
} from '@/components/ui';
import { usePermissions } from '@/features/auth/usePermissions';
import { customersService } from '@/services/customersService';
import {
  customerFormSchema,
  normalizePhone,
  type CustomerFormValues,
} from '@/features/customers/schemas';
import { getErrorMessage } from '@/utils/errors';

export default function NewCustomerPage() {
  const { can, isLoading: permsLoading } = usePermissions();
  const router = useRouter();
  const [formError, setFormError] = useState<string | null>(null);

  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<CustomerFormValues>({
    resolver: zodResolver(customerFormSchema),
    defaultValues: {
      first_name: '',
      last_name: '',
      phone: '',
      email: '',
      national_id: '',
      license_number: '',
      license_expiry: '',
      birth_date: '',
      address: '',
      notes: '',
    },
  });

  if (!permsLoading && !can('customers.create')) {
    return (
      <EmptyState
        title="Yetkiniz yok"
        description="Müşteri ekleme yetkiniz bulunmuyor."
        action={
          <Link href="/customers">
            <Button variant="secondary">Müşterilere Dön</Button>
          </Link>
        }
      />
    );
  }

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    try {
      const customer = await customersService.createCustomer({
        first_name: values.first_name,
        last_name: values.last_name,
        phone: normalizePhone(values.phone),
        email: values.email?.trim() || null,
        national_id: values.national_id?.trim() || null,
        license_number: values.license_number?.trim() || null,
        license_expiry: values.license_expiry || null,
        birth_date: values.birth_date || null,
        address: values.address?.trim() || null,
        notes: values.notes?.trim() || null,
        is_active: true,
      });
      router.push(`/customers/${customer.id}`);
    } catch (error) {
      setFormError(getErrorMessage(error, 'Müşteri kaydedilemedi.'));
    }
  });

  return (
    <div>
      <PageHeader
        title="Yeni Müşteri"
        description="Kiracı bilgilerini kaydedin."
        actions={
          <Link href="/customers">
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
              name="first_name"
              render={({ field }) => (
                <Input {...field} label="Ad" error={errors.first_name?.message} />
              )}
            />
            <Controller
              control={control}
              name="last_name"
              render={({ field }) => (
                <Input {...field} label="Soyad" error={errors.last_name?.message} />
              )}
            />
            <Controller
              control={control}
              name="phone"
              render={({ field }) => (
                <Input
                  {...field}
                  label="Telefon"
                  placeholder="05XX XXX XX XX"
                  error={errors.phone?.message}
                />
              )}
            />
            <Controller
              control={control}
              name="email"
              render={({ field }) => (
                <Input
                  {...field}
                  type="email"
                  label="E-posta"
                  error={errors.email?.message}
                />
              )}
            />
            <Controller
              control={control}
              name="national_id"
              render={({ field }) => (
                <Input
                  {...field}
                  label="TC Kimlik No"
                  error={errors.national_id?.message}
                />
              )}
            />
            <Controller
              control={control}
              name="birth_date"
              render={({ field }) => (
                <Input {...field} type="date" label="Doğum Tarihi" />
              )}
            />
            <Controller
              control={control}
              name="license_number"
              render={({ field }) => <Input {...field} label="Ehliyet No" />}
            />
            <Controller
              control={control}
              name="license_expiry"
              render={({ field }) => (
                <Input {...field} type="date" label="Ehliyet Geçerlilik Tarihi" />
              )}
            />
          </div>

          <Controller
            control={control}
            name="address"
            render={({ field }) => <TextArea {...field} label="Adres" rows={2} />}
          />
          <Controller
            control={control}
            name="notes"
            render={({ field }) => <TextArea {...field} label="Notlar" rows={3} />}
          />

          <div className="flex justify-end gap-2">
            <Link href="/customers">
              <Button type="button" variant="secondary">
                Vazgeç
              </Button>
            </Link>
            <Button type="submit" loading={isSubmitting}>
              Müşteriyi Kaydet
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
