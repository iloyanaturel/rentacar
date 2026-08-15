import { useEffect, useState } from 'react';
import {
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button, ErrorState, Input, ScreenHeader } from '@/components/ui';
import {
  useNotificationSettings,
  useUpdateNotificationSettings,
} from '@/features/ops/hooks';
import { notificationService } from '@/services/notificationService';
import {
  ensurePushPermissionsAndToken,
  getPushPermissionStatus,
} from '@/lib/pushNotifications';
import { colors, radius, spacing, typography } from '@/theme';

type ToggleKey =
  | 'rental_start_reminder'
  | 'rental_return_reminder'
  | 'overdue_rental'
  | 'payment_due'
  | 'document_expiring'
  | 'maintenance_due';

const TOGGLES: { key: ToggleKey; label: string }[] = [
  { key: 'rental_start_reminder', label: 'Kiralama başlangıcı' },
  { key: 'rental_return_reminder', label: 'Kiralama teslim tarihi' },
  { key: 'overdue_rental', label: 'Geciken araçlar' },
  { key: 'payment_due', label: 'Ödeme hatırlatmaları' },
  { key: 'document_expiring', label: 'Belge süresi' },
  { key: 'maintenance_due', label: 'Bakım' },
];

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const settingsQuery = useNotificationSettings();
  const update = useUpdateNotificationSettings();
  const [pushStatus, setPushStatus] = useState<string>('undetermined');
  const [startHours, setStartHours] = useState('24');
  const [returnHours, setReturnHours] = useState('24');
  const [docDays, setDocDays] = useState('30');
  const [maintDays, setMaintDays] = useState('7');

  useEffect(() => {
    void getPushPermissionStatus().then(setPushStatus);
  }, []);

  useEffect(() => {
    const s = settingsQuery.data;
    if (!s) return;
    setStartHours(String(s.reminder_hours_before_start));
    setReturnHours(String(s.reminder_hours_before_return));
    setDocDays(String(s.document_days_before));
    setMaintDays(String(s.maintenance_days_before));
  }, [settingsQuery.data]);

  const onToggle = (key: ToggleKey, value: boolean) => {
    void update.mutateAsync({ [key]: value }).catch((error: Error) => {
      Alert.alert('Hata', error.message);
    });
  };

  const saveWindows = () => {
    void update
      .mutateAsync({
        reminder_hours_before_start: Number(startHours) || 24,
        reminder_hours_before_return: Number(returnHours) || 24,
        document_days_before: Number(docDays) || 30,
        maintenance_days_before: Number(maintDays) || 7,
      })
      .then(() => Alert.alert('Kaydedildi', 'Bildirim zamanları güncellendi.'))
      .catch((error: Error) => Alert.alert('Hata', error.message));
  };

  const enablePush = async () => {
    try {
      const result = await ensurePushPermissionsAndToken();
      setPushStatus(result.status);
      if (result.token) {
        await notificationService.registerPushToken(
          result.token,
          Platform.OS === 'ios' ? 'ios' : Platform.OS === 'android' ? 'android' : 'web',
        );
        Alert.alert('Hazır', 'Push bildirimleri için cihaz kaydedildi.');
      } else if (result.status === 'denied') {
        Alert.alert(
          'İzin reddedildi',
          'Sistem ayarlarından bildirim iznini açabilirsiniz. Uygulama çalışmaya devam eder.',
        );
      }
    } catch (error) {
      Alert.alert(
        'Bilgi',
        error instanceof Error
          ? error.message
          : 'Push kaydı bu ortamda kullanılamıyor.',
      );
    }
  };

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[
        styles.content,
        { paddingTop: insets.top + spacing.md, paddingBottom: insets.bottom + 40 },
      ]}
    >
      <ScreenHeader title="Bildirim Ayarları" subtitle="Hatırlatma tercihleri" />

      {settingsQuery.isError ? (
        <ErrorState
          message="Ayarlar yüklenemedi."
          onRetry={() => void settingsQuery.refetch()}
        />
      ) : null}

      <Text style={styles.section}>Bildirim türleri</Text>
      <View style={styles.card}>
        {TOGGLES.map((t) => (
          <View key={t.key} style={styles.row}>
            <Text style={styles.rowLabel}>{t.label}</Text>
            <Switch
              value={Boolean(settingsQuery.data?.[t.key])}
              onValueChange={(v) => onToggle(t.key, v)}
              trackColor={{ true: colors.primary, false: colors.border }}
            />
          </View>
        ))}
      </View>

      <Text style={styles.section}>Zaman pencereleri</Text>
      <View style={styles.card}>
        <Input
          label="Başlangıç hatırlatması (saat önce)"
          value={startHours}
          onChangeText={setStartHours}
          keyboardType="number-pad"
        />
        <Input
          label="Teslim hatırlatması (saat önce)"
          value={returnHours}
          onChangeText={setReturnHours}
          keyboardType="number-pad"
        />
        <Input
          label="Belge uyarısı (gün önce)"
          value={docDays}
          onChangeText={setDocDays}
          keyboardType="number-pad"
        />
        <Input
          label="Bakım uyarısı (gün önce)"
          value={maintDays}
          onChangeText={setMaintDays}
          keyboardType="number-pad"
        />
        <Button
          title="Zamanları Kaydet"
          onPress={saveWindows}
          loading={update.isPending}
        />
      </View>

      <Text style={styles.section}>Push bildirimleri</Text>
      <View style={styles.card}>
        <Text style={styles.hint}>
          İzin uygulama ilk açılışında istenmez. Durum: {pushStatus}
        </Text>
        <Pressable onPress={() => void enablePush()} style={styles.pushBtn}>
          <Text style={styles.pushBtnText}>Push izinlerini aç / token kaydet</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, gap: spacing.md },
  section: {
    ...typography.label,
    color: colors.textMuted,
    marginTop: spacing.sm,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: spacing.md,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 44,
  },
  rowLabel: { ...typography.body, color: colors.text, flex: 1, paddingRight: 12 },
  hint: { ...typography.caption, color: colors.textSecondary },
  pushBtn: {
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: radius.md,
    backgroundColor: colors.primarySoft,
  },
  pushBtnText: {
    ...typography.label,
    color: colors.primary,
    fontFamily: 'DMSans_700Bold',
  },
});
