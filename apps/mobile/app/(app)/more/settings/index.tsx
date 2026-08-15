import { ScrollView, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Card, ListItem, ScreenHeader } from '@/components/ui';
import { usePermissions } from '@/features/settings';
import { useI18n } from '@/i18n';
import { colors, spacing } from '@/theme';

export default function SettingsHubScreen() {
  const router = useRouter();
  const { t } = useI18n();
  const { can } = usePermissions();

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <ScreenHeader title={t('settings.title')} subtitle="Hesap ve işletme" />

      <Card padded={false} style={styles.menu}>
        <ListItem
          title={t('settings.profile')}
          onPress={() => router.push('/(app)/more/profile')}
        />
        {can('settings.update') ? (
          <ListItem
            title={t('settings.business')}
            onPress={() => router.push('/(app)/more/settings/business')}
          />
        ) : null}
        {can('users.view') ? (
          <ListItem
            title={t('settings.users')}
            onPress={() => router.push('/(app)/more/settings/users')}
          />
        ) : null}
        <ListItem
          title={t('settings.roles')}
          onPress={() => router.push('/(app)/more/settings/roles')}
        />
        {can('settings.update') ? (
          <ListItem
            title={t('settings.rental')}
            onPress={() => router.push('/(app)/more/settings/rental')}
          />
        ) : null}
        <ListItem
          title={t('settings.notifications')}
          onPress={() => router.push('/(app)/more/settings/notifications')}
        />
        {can('settings.update') ? (
          <ListItem
            title={t('settings.contract')}
            onPress={() => router.push('/(app)/more/settings/contract')}
          />
        ) : null}
        {can('settings.update') ? (
          <ListItem
            title={t('settings.finance')}
            onPress={() => router.push('/(app)/more/settings/finance')}
          />
        ) : null}
        <ListItem
          title={t('settings.security')}
          onPress={() => router.push('/(app)/more/settings/security')}
        />
        <ListItem
          title={t('settings.app')}
          onPress={() => router.push('/(app)/more/settings/app')}
        />
        <ListItem
          title={t('settings.support')}
          onPress={() => router.push('/(app)/more/settings/support')}
        />
        <ListItem
          title={t('settings.about')}
          onPress={() => router.push('/(app)/more/settings/about')}
        />
      </Card>
      <View style={{ height: spacing.xl }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, gap: spacing.lg },
  menu: { overflow: 'hidden' },
});
