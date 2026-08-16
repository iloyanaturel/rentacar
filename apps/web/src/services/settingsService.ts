import { supabase } from '@/lib/supabase';
import { getErrorMessage } from '@/utils/errors';
import type { UserRole } from '@rentaflow/shared';

export type OrganizationSettings = {
  organization_id: string;
  currency: string;
  timezone: string;
  locale: string;
  date_format: string;
  tax_enabled: boolean;
  tax_rate: number;
  default_deposit_amount: number;
  default_daily_km_limit: number | null;
  extra_km_price: number;
  late_return_tolerance_minutes: number;
  late_return_fee: number;
  contract_title: string;
  contract_footer: string | null;
  contract_body: string | null;
  onboarding_business_done: boolean;
  onboarding_vehicle_done: boolean;
  onboarding_user_done: boolean;
  onboarding_rental_done: boolean;
  onboarding_completed_at: string | null;
};

export type OrgUser = {
  id: string;
  full_name: string | null;
  phone: string | null;
  role: UserRole;
  status: 'ACTIVE' | 'INVITED' | 'SUSPENDED';
  avatar_url: string | null;
  last_sign_in_at: string | null;
  created_at: string;
  email: string | null;
};

export type OnboardingStatus = {
  business: boolean;
  vehicle: boolean;
  user: boolean;
  rental_settings: boolean;
  completed: boolean;
  percent: number;
  ready?: boolean;
};

function mapError(error: unknown, fallback: string): Error {
  return new Error(getErrorMessage(error, fallback));
}

export const settingsService = {
  async getSettings(): Promise<OrganizationSettings> {
    const { data, error } = await supabase.rpc(
      'ensure_organization_settings' as never,
    );
    if (error || !data) throw mapError(error, 'Ayarlar yüklenemedi.');
    return data as OrganizationSettings;
  },

  async updateSettings(patch: Record<string, unknown>) {
    const { data, error } = await supabase.rpc(
      'update_organization_settings' as never,
      { p_patch: patch } as never,
    );
    if (error || !data) throw mapError(error, 'Ayarlar kaydedilemedi.');
    return data as OrganizationSettings;
  },

  async updateBusinessProfile(patch: Record<string, unknown>) {
    const { data, error } = await supabase.rpc(
      'update_business_profile' as never,
      { p_patch: patch } as never,
    );
    if (error || !data) throw mapError(error, 'İşletme bilgileri kaydedilemedi.');
    return data;
  },

  async getOnboardingStatus(): Promise<OnboardingStatus> {
    const { data, error } = await supabase.rpc(
      'get_onboarding_status' as never,
    );
    if (error) throw mapError(error, 'Kurulum durumu yüklenemedi.');
    return data as OnboardingStatus;
  },

  async listUsers(): Promise<OrgUser[]> {
    const { data, error } = await supabase.rpc(
      'list_organization_users' as never,
    );
    if (error) throw mapError(error, 'Kullanıcılar yüklenemedi.');
    return (data as OrgUser[]) ?? [];
  },

  async inviteUser(input: {
    email: string;
    fullName: string;
    role: UserRole;
  }): Promise<{
    email: string;
    role: string;
    temporaryPassword?: string;
    note?: string;
  }> {
    const { data: sessionData, error: sessionError } =
      await supabase.auth.getSession();
    if (sessionError || !sessionData.session?.access_token) {
      throw new Error('Oturum bulunamadı. Lütfen tekrar giriş yapın.');
    }

    const { data, error } = await supabase.functions.invoke('invite-user', {
      body: {
        email: input.email,
        full_name: input.fullName,
        role: input.role,
      },
    });

    const payload = (data ?? {}) as {
      ok?: boolean;
      error?: string;
      email?: string;
      role?: string;
      temporary_password?: string;
      note?: string;
    };

    if (error) {
      // FunctionsHttpError often hides the JSON body; prefer payload.error when present.
      if (payload.error) {
        throw new Error(payload.error);
      }
      throw mapError(error, 'Davet gönderilemedi.');
    }

    if (!payload.ok) {
      throw new Error(payload.error || 'Davet gönderilemedi.');
    }

    return {
      email: payload.email ?? input.email,
      role: payload.role ?? input.role,
      temporaryPassword: payload.temporary_password,
      note: payload.note,
    };
  },

  async setUserStatus(userId: string, status: 'ACTIVE' | 'SUSPENDED') {
    const { error } = await supabase.rpc('set_user_status' as never, {
      p_user_id: userId,
      p_status: status,
    } as never);
    if (error) throw mapError(error, 'Kullanıcı durumu güncellenemedi.');
  },

  async setUserRole(userId: string, role: UserRole) {
    const { error } = await supabase.rpc('set_user_role' as never, {
      p_user_id: userId,
      p_role: role,
    } as never);
    if (error) throw mapError(error, 'Rol güncellenemedi.');
  },

  async getPermissions(): Promise<string[]> {
    const { data, error } = await supabase.rpc(
      'get_user_permissions' as never,
    );
    if (error) throw mapError(error, 'Yetkiler yüklenemedi.');
    return (data as string[]) ?? [];
  },

  async touchLastSignIn() {
    await supabase.rpc('touch_last_sign_in' as never);
  },

  async recordAuthEvent(action: 'LOGIN' | 'LOGOUT' | 'PASSWORD_CHANGED') {
    await supabase.rpc('record_auth_event' as never, {
      p_action: action,
    } as never);
  },

  async updateProfile(patch: {
    full_name?: string;
    phone?: string | null;
    avatar_url?: string | null;
  }) {
    const { error } = await supabase.rpc('update_own_profile' as never, {
      p_patch: {
        ...patch,
        fields: Object.keys(patch),
      },
    } as never);
    if (error) throw mapError(error, 'Profil güncellenemedi.');
  },

  async changePassword(currentPassword: string, newPassword: string) {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user?.email) throw new Error('Oturum bulunamadı.');
    const { error: reauth } = await supabase.auth.signInWithPassword({
      email: user.email,
      password: currentPassword,
    });
    if (reauth) throw mapError(reauth, 'Mevcut şifre hatalı.');
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) throw mapError(error, 'Şifre güncellenemedi.');
    await this.recordAuthEvent('PASSWORD_CHANGED');
  },

  async requestEmailChange(newEmail: string) {
    const { error } = await supabase.auth.updateUser({
      email: newEmail.trim(),
    });
    if (error) throw mapError(error, 'E-posta değişikliği başlatılamadı.');
  },

  async uploadLogo(file: File | Blob): Promise<string> {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error('Oturum bulunamadı.');
    const { data: profile } = await supabase
      .from('profiles')
      .select('organization_id')
      .eq('id', user.id)
      .single();
    const orgId = (profile as { organization_id?: string } | null)
      ?.organization_id;
    if (!orgId) throw new Error('Organizasyon bulunamadı.');

    const buffer = await file.arrayBuffer();
    const path = `${orgId}/branding/logo-${Date.now()}.png`;
    const { error } = await supabase.storage
      .from('documents')
      .upload(path, buffer, { contentType: file.type || 'image/png', upsert: true });
    if (error) throw mapError(error, 'Logo yüklenemedi.');
    const { data: signed } = await supabase.storage
      .from('documents')
      .createSignedUrl(path, 60 * 60 * 24 * 365);
    return signed?.signedUrl ?? path;
  },

  /** Extra km charge helper — mirrors DB calculate_extra_km_charge */
  calculateExtraKmCharge(input: {
    kmLimit: number | null;
    startKm: number | null;
    endKm: number | null;
    extraKmPrice: number | null;
  }): number {
    if (
      input.kmLimit == null ||
      input.startKm == null ||
      input.endKm == null ||
      input.endKm < input.startKm
    ) {
      return 0;
    }
    const used = input.endKm - input.startKm;
    const extra = Math.max(0, used - input.kmLimit);
    return extra * (input.extraKmPrice ?? 0);
  },
};
