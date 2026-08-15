import { useMemo } from 'react';
import {
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button, EmptyState, ErrorState, ScreenHeader } from '@/components/ui';
import {
  useMarkNotificationsRead,
  useNotifications,
  useRefreshNotifications,
} from '@/features/ops/hooks';
import {
  notificationDeepLink,
  type AppNotification,
} from '@/services/notificationService';
import { colors, radius, spacing, typography } from '@/theme';

function relativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60_000);
  if (mins < 1) return 'Az önce';
  if (mins < 60) return `${mins} dakika önce`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} saat önce`;
  const days = Math.floor(hours / 24);
  return `${days} gün önce`;
}

function isToday(iso: string): boolean {
  const d = new Date(iso);
  const now = new Date();
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  );
}

function iconFor(type: string): string {
  if (type.includes('OVERDUE') || type.includes('DOCUMENT')) return '⚠️';
  if (type.includes('PAYMENT')) return '💰';
  if (type.includes('MAINTENANCE') || type.includes('VEHICLE')) return '🔧';
  if (type.includes('RETURN') || type.includes('START')) return '🚗';
  return '🔔';
}

export default function NotificationsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const query = useNotifications();
  const markRead = useMarkNotificationsRead();
  const refresh = useRefreshNotifications();

  const { today, earlier } = useMemo(() => {
    const rows = query.data ?? [];
    return {
      today: rows.filter((n) => isToday(n.created_at)),
      earlier: rows.filter((n) => !isToday(n.created_at)),
    };
  }, [query.data]);

  const onOpen = async (n: AppNotification) => {
    if (!n.is_read) {
      try {
        await markRead.mutateAsync([n.id]);
      } catch {
        /* ignore */
      }
    }
    const href = notificationDeepLink(n);
    if (href) router.push(href as never);
  };

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <ScreenHeader
        title="Bildirimler"
        subtitle="Operasyon hatırlatmaları"
        right={
          <Button
            title="Tümünü Okundu"
            variant="ghost"
            onPress={() => void markRead.mutateAsync(undefined)}
            disabled={markRead.isPending}
          />
        }
      />

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={query.isFetching || refresh.isPending}
            onRefresh={() => {
              void refresh.mutateAsync();
              void query.refetch();
            }}
          />
        }
      >
        {query.isError ? (
          <ErrorState
            message={
              query.error instanceof Error
                ? query.error.message
                : 'Bildirimler yüklenemedi.'
            }
            onRetry={() => void query.refetch()}
          />
        ) : null}

        {!query.isError && (query.data ?? []).length === 0 ? (
          <EmptyState
            title="Bildirim yok"
            description="Teslim, ödeme ve belge hatırlatmaları burada listelenir."
          />
        ) : null}

        {today.length > 0 ? (
          <>
            <Text style={styles.section}>Bugün</Text>
            {today.map((n) => (
              <NotificationRow key={n.id} item={n} onPress={() => void onOpen(n)} />
            ))}
          </>
        ) : null}

        {earlier.length > 0 ? (
          <>
            <Text style={styles.section}>Daha önce</Text>
            {earlier.map((n) => (
              <NotificationRow key={n.id} item={n} onPress={() => void onOpen(n)} />
            ))}
          </>
        ) : null}
      </ScrollView>
    </View>
  );
}

function NotificationRow({
  item,
  onPress,
}: {
  item: AppNotification;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.row, !item.is_read && styles.rowUnread]}
    >
      <Text style={styles.icon}>{iconFor(item.type)}</Text>
      <View style={styles.body}>
        <Text style={[styles.title, !item.is_read && styles.titleUnread]}>
          {item.title}
        </Text>
        {item.message ? (
          <Text style={styles.message} numberOfLines={2}>
            {item.message}
          </Text>
        ) : null}
        <Text style={styles.time}>{relativeTime(item.created_at)}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, paddingBottom: 40, gap: spacing.sm },
  section: {
    ...typography.label,
    color: colors.textMuted,
    marginTop: spacing.md,
    marginBottom: spacing.xs,
  },
  row: {
    flexDirection: 'row',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  rowUnread: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
  icon: { fontSize: 22, marginTop: 2 },
  body: { flex: 1, gap: 4 },
  title: { ...typography.body, color: colors.text },
  titleUnread: { fontFamily: 'DMSans_700Bold' },
  message: { ...typography.caption, color: colors.textSecondary },
  time: { ...typography.caption, color: colors.textMuted },
});
