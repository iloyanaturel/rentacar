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

export default function EditCustomerPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const router = useRouter();
  const { can, isLoading: permsLoading } = usePermissions();
  const [formError, setFormError] = useState<string | null>(null);

  const customer = useQuery({
    queryKey: ['customer', id],
    queryFn: () => customersService.getCustomer(id),
  });

  const {
    control,
    handleSubmit,
    reset,
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

  useEffect(() => {
    if (!customer.data) return;
    const c = customer.data;
    reset({
      first_name: c.first_name,
      last_name: c.last_name,
      phone: c.phone ?? '',
      email: c.email ?? '',
      national_id: c.national_id ?? '',
      license_number: c.license_number ?? '',
      license_expiry: c.license_expiry ?? '',
      birth_date: c.birth_date ?? '',
      address: c.address ?? '',
      notes: c.notes ?? '',
    });
  }, [customer.data, reset]);

  if (!permsLoading && !can('customers.update')) {
    return (
      <EmptyState
        title="Yetkiniz yok"
        description="Müşteri düzenleme yetkiniz bulunmuyor."
        action={
          <Link href="/customers">
            <Button variant="secondary">Müşterilere Dön</Button>
          </Link>
        }
      />
    );
  }

  if (customer.isLoading) return <LoadingBlock />;
  if (customer.isError || !customer.data) {
    return (
      <EmptyState
        title="Müşteri bulunamadı"
        description={getErrorMessage(customer.error, 'Müşteri bilgileri yüklenemedi.')}
      />
    );
  }

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    try {
      await customersService.updateCustomer(id, {
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
      });
      router.push(`/customers/${id}`);
    } catch (error) {
      setFormError(getErrorMessage(error, 'Müşteri güncellenemedi.'));
    }
  });

  return (
    <div>
      <PageHeader
        title="Müşteriyi Düzenle"
        description={`${customer.data.first_name} ${customer.data.last_name}`}
        actions={
          <Link href={`/customers/${id}`}>
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
                <Input {...field} label="Telefon" error={errors.phone?.message} />
              )}
            />
            <Controller
              control={control}
              name="email"
              render={({ field }) => (
                <Input {...field} type="email" label="E-posta" error={errors.email?.message} />
              )}
            />
            <Controller
              control={control}
              name="national_id"
              render={({ field }) => (
                <Input {...field} label="TC Kimlik No" error={errors.national_id?.message} />
              )}
            />
            <Controller
              control={control}
              name="birth_date"
              render={({ field }) => <Input {...field} type="date" label="Doğum Tarihi" />}
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
            <Link href={`/customers/${id}`}>
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
    </div>
  );
}
