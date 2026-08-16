'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useAuth } from '@/features/auth/AuthProvider';
import {
  forgotPasswordSchema,
  type ForgotPasswordFormValues,
} from '@/features/auth/schemas';
import { Button, ErrorBanner, Input } from '@/components/ui';
import { getErrorMessage } from '@/utils/errors';

export default function ForgotPasswordPage() {
  const { resetPassword } = useAuth();
  const [formError, setFormError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ForgotPasswordFormValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: '' },
  });

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    try {
      await resetPassword(values.email);
      setSent(true);
    } catch (error) {
      setFormError(getErrorMessage(error));
    }
  });

  return (
    <div className="flex min-h-screen items-center justify-center bg-[linear-gradient(180deg,#f4f6f8,#eef2f5)] px-4 py-10">
      <div className="w-full max-w-md rounded-3xl border border-rf-border bg-white p-6 md:p-8">
        <h1 className="font-display text-2xl font-bold">Şifremi Unuttum</h1>
        <p className="mt-1 text-sm text-rf-secondary">
          E-posta adresinize şifre sıfırlama bağlantısı göndereceğiz.
        </p>
        {sent ? (
          <div className="mt-6 rounded-xl bg-rf-success-soft px-4 py-3 text-sm text-rf-success">
            Bağlantı gönderildi. Gelen kutunuzu kontrol edin.
          </div>
        ) : (
          <form onSubmit={onSubmit} className="mt-6 space-y-4">
            {formError ? <ErrorBanner message={formError} /> : null}
            <Controller
              control={control}
              name="email"
              render={({ field }) => (
                <Input
                  {...field}
                  label="E-posta"
                  type="email"
                  error={errors.email?.message}
                />
              )}
            />
            <Button type="submit" className="w-full" loading={isSubmitting}>
              Bağlantı Gönder
            </Button>
          </form>
        )}
        <p className="mt-4 text-center text-sm">
          <Link href="/login" className="font-medium text-rf-primary">
            Giriş ekranına dön
          </Link>
        </p>
      </div>
    </div>
  );
}
