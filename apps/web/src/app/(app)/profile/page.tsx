'use client';

import { useEffect, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { Card, ErrorBanner, Input, PageHeader, Button } from '@/components/ui';
import { useAuth } from '@/features/auth/AuthProvider';
import { settingsService } from '@/services/settingsService';
import { roleLabel } from '@/utils/labels';
import { getErrorMessage } from '@/utils/errors';

type ProfileFormValues = {
  full_name: string;
  phone: string;
};

type PasswordFormValues = {
  current_password: string;
  new_password: string;
  confirm_password: string;
};

export default function ProfilePage() {
  const { profile, organization, user, refreshProfile } = useAuth();
  const [profileError, setProfileError] = useState<string | null>(null);
  const [profileSuccess, setProfileSuccess] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState(false);

  const {
    control: profileControl,
    handleSubmit: handleProfileSubmit,
    reset: resetProfile,
    formState: { isSubmitting: savingProfile },
  } = useForm<ProfileFormValues>({
    defaultValues: { full_name: '', phone: '' },
  });

  const {
    control: passwordControl,
    handleSubmit: handlePasswordSubmit,
    reset: resetPassword,
    formState: { isSubmitting: savingPassword },
  } = useForm<PasswordFormValues>({
    defaultValues: { current_password: '', new_password: '', confirm_password: '' },
  });

  useEffect(() => {
    if (!profile) return;
    resetProfile({
      full_name: profile.full_name ?? '',
      phone: profile.phone ?? '',
    });
  }, [profile, resetProfile]);

  const onProfileSubmit = handleProfileSubmit(async (values) => {
    setProfileError(null);
    setProfileSuccess(false);
    try {
      await settingsService.updateProfile({
        full_name: values.full_name.trim(),
        phone: values.phone.trim() || null,
      });
      await refreshProfile();
      setProfileSuccess(true);
    } catch (error) {
      setProfileError(getErrorMessage(error, 'Profil güncellenemedi.'));
    }
  });

  const onPasswordSubmit = handlePasswordSubmit(async (values) => {
    setPasswordError(null);
    setPasswordSuccess(false);
    if (values.new_password !== values.confirm_password) {
      setPasswordError('Yeni şifreler eşleşmiyor.');
      return;
    }
    if (values.new_password.length < 8) {
      setPasswordError('Yeni şifre en az 8 karakter olmalıdır.');
      return;
    }
    try {
      await settingsService.changePassword(values.current_password, values.new_password);
      resetPassword({ current_password: '', new_password: '', confirm_password: '' });
      setPasswordSuccess(true);
    } catch (error) {
      setPasswordError(getErrorMessage(error, 'Şifre güncellenemedi.'));
    }
  });

  return (
    <div>
      <PageHeader
        title="Profil"
        description={organization?.name ? `${organization.name} organizasyonu` : undefined}
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <h2 className="mb-3 font-display text-lg font-semibold">Hesap Bilgileri</h2>
          <form onSubmit={onProfileSubmit} className="space-y-4">
            {profileError ? <ErrorBanner message={profileError} /> : null}
            {profileSuccess ? (
              <div className="rounded-xl bg-rf-success-soft px-4 py-3 text-sm text-rf-success">
                Profil güncellendi.
              </div>
            ) : null}
            <Input label="E-posta" value={user?.email ?? ''} disabled />
            <Input label="Rol" value={profile?.role ? roleLabel(profile.role) : ''} disabled />
            <Controller
              control={profileControl}
              name="full_name"
              render={({ field }) => <Input {...field} label="Ad Soyad" />}
            />
            <Controller
              control={profileControl}
              name="phone"
              render={({ field }) => <Input {...field} label="Telefon" />}
            />
            <div className="flex justify-end">
              <Button type="submit" loading={savingProfile}>
                Profili Kaydet
              </Button>
            </div>
          </form>
        </Card>

        <Card>
          <h2 className="mb-3 font-display text-lg font-semibold">Şifre Değiştir</h2>
          <form onSubmit={onPasswordSubmit} className="space-y-4">
            {passwordError ? <ErrorBanner message={passwordError} /> : null}
            {passwordSuccess ? (
              <div className="rounded-xl bg-rf-success-soft px-4 py-3 text-sm text-rf-success">
                Şifreniz güncellendi.
              </div>
            ) : null}
            <Controller
              control={passwordControl}
              name="current_password"
              render={({ field }) => (
                <Input {...field} type="password" label="Mevcut Şifre" autoComplete="current-password" />
              )}
            />
            <Controller
              control={passwordControl}
              name="new_password"
              render={({ field }) => (
                <Input {...field} type="password" label="Yeni Şifre" autoComplete="new-password" />
              )}
            />
            <Controller
              control={passwordControl}
              name="confirm_password"
              render={({ field }) => (
                <Input {...field} type="password" label="Yeni Şifre (Tekrar)" autoComplete="new-password" />
              )}
            />
            <div className="flex justify-end">
              <Button type="submit" loading={savingPassword}>
                Şifreyi Güncelle
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
}
