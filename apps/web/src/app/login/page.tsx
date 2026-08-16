'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useAuth } from '@/features/auth/AuthProvider';
import { loginSchema, type LoginFormValues } from '@/features/auth/schemas';
import { Button, ErrorBanner, Input } from '@/components/ui';
import { getErrorMessage } from '@/utils/errors';

export default function LoginPage() {
  const { signIn, isConfigured } = useAuth();
  const router = useRouter();
  const [formError, setFormError] = useState<string | null>(null);

  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    try {
      await signIn(values.email, values.password);
      router.replace('/dashboard');
    } catch (error) {
      setFormError(
        getErrorMessage(error, 'Girdiğiniz e-posta veya şifre hatalı.'),
      );
    }
  });

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-10">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_#ccfbf1_0%,_transparent_55%),linear-gradient(180deg,#f4f6f8_0%,#eef2f5_100%)]"
      />
      <div className="relative w-full max-w-md rounded-3xl border border-rf-border bg-white/95 p-6 shadow-[0_20px_60px_rgba(15,23,42,0.08)] md:p-8">
        <p className="font-display text-3xl font-bold text-rf-primary">RentaFlow</p>
        <h1 className="mt-3 font-display text-2xl font-bold text-rf-text">
          Hoş Geldiniz
        </h1>
        <p className="mt-1 text-sm text-rf-secondary">
          Rent a car işletmenizi tarayıcıdan yönetin.
        </p>

        {!isConfigured ? (
          <div className="mt-4 rounded-xl bg-rf-warning-soft px-3 py-2 text-sm text-rf-warning">
            Supabase yapılandırması eksik. `apps/web/.env.local` dosyasına
            NEXT_PUBLIC_SUPABASE_URL ve NEXT_PUBLIC_SUPABASE_ANON_KEY ekleyin.
          </div>
        ) : null}

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
                autoComplete="email"
                error={errors.email?.message}
              />
            )}
          />
          <Controller
            control={control}
            name="password"
            render={({ field }) => (
              <Input
                {...field}
                label="Şifre"
                type="password"
                autoComplete="current-password"
                error={errors.password?.message}
              />
            )}
          />
          <Button type="submit" className="w-full" loading={isSubmitting}>
            Giriş Yap
          </Button>
        </form>

        <p className="mt-4 text-center text-sm text-rf-secondary">
          <Link href="/forgot-password" className="font-medium text-rf-primary">
            Şifremi unuttum
          </Link>
        </p>
      </div>
    </div>
  );
}
