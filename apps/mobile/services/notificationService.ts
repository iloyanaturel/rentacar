import { supabase } from '@/lib/supabase';
import { getErrorMessage } from '@/utils/errors';

export type AppNotification = {
  id: string;
  organization_id: string;
  user_id: string | null;
  type: string;
  title: string;
  message: string;
  is_read: boolean;
  related_entity_type: string | null;
  related_entity_id: string | null;
  created_at: string;
};

export type NotificationSettings = {
  id: string;
  rental_start_reminder: boolean;
  rental_return_reminder: boolean;
  overdue_rental: boolean;
  payment_due: boolean;
  document_expiring: boolean;
  maintenance_due: boolean;
  reminder_hours_before_start: number;
  reminder_hours_before_return: number;
  document_days_before: number;
  maintenance_days_before: number;
};

function mapError(error: unknown, fallback: string): Error {
  return new Error(getErrorMessage(error, fallback));
}

export const notificationService = {
  async getNotifications(): Promise<AppNotification[]> {
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100);
    if (error) throw mapError(error, 'Bildirimler yüklenemedi.');
    return (data ?? []) as AppNotification[];
  },

  async getUnreadCount(): Promise<number> {
    const { count, error } = await supabase
      .from('notifications')
      .select('id', { count: 'exact', head: true })
      .eq('is_read', false);
    if (error) throw mapError(error, 'Bildirimler yüklenemedi.');
    return count ?? 0;
  },

  async markAsRead(ids: string[]): Promise<void> {
    const { error } = await supabase.rpc('mark_notifications_read' as never, {
      p_all: false,
      p_ids: ids,
    } as never);
    if (error) throw mapError(error, 'Bildirim güncellenemedi.');
  },

  async markAllAsRead(): Promise<void> {
    const { error } = await supabase.rpc('mark_notifications_read' as never, {
      p_all: true,
      p_ids: null,
    } as never);
    if (error) throw mapError(error, 'Bildirimler güncellenemedi.');
  },

  async refreshOperational(): Promise<number> {
    const { data, error } = await supabase.rpc(
      'refresh_operational_notifications' as never,
    );
    if (error) throw mapError(error, 'Bildirimler yenilenemedi.');
    return Number(data ?? 0);
  },

  async getSettings(): Promise<NotificationSettings> {
    const { data, error } = await supabase.rpc(
      'ensure_notification_settings' as never,
    );
    if (error || !data) throw mapError(error, 'Bildirim ayarları yüklenemedi.');
    return data as NotificationSettings;
  },

  async updateSettings(
    patch: Partial<NotificationSettings>,
  ): Promise<void> {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error('Oturum bulunamadı.');
    const { error } = await supabase
      .from('notification_settings')
      .update(patch as never)
      .eq('user_id', user.id);
    if (error) throw mapError(error, 'Ayarlar kaydedilemedi.');
  },

  async registerPushToken(token: string, platform: 'ios' | 'android' | 'web') {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    const { data: profile } = await supabase
      .from('profiles')
      .select('organization_id')
      .eq('id', user.id)
      .single();
    const orgId = (profile as { organization_id?: string } | null)
      ?.organization_id;
    if (!orgId) return;

    const { error } = await supabase.from('device_push_tokens').upsert(
      {
        organization_id: orgId,
        user_id: user.id,
        token,
        platform,
        updated_at: new Date().toISOString(),
      } as never,
      { onConflict: 'token' },
    );
    if (error) console.warn('[push] token save', error.message);
  },
};

export function notificationDeepLink(n: AppNotification): string | null {
  if (!n.related_entity_id) return null;
  switch (n.related_entity_type) {
    case 'rental':
      return `/(app)/rentals/${n.related_entity_id}`;
    case 'vehicle':
      return `/(app)/vehicles/${n.related_entity_id}`;
    case 'maintenance':
      return `/(app)/more/maintenance`;
    case 'customer':
      return `/(app)/customers/${n.related_entity_id}`;
    default:
      return null;
  }
}
