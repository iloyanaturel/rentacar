import { Alert, ScrollView, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Avatar, Card, ListItem, ScreenHeader } from '@/components/ui';
import { useAuth } from '@/features/auth';
import { getErrorMessage } from '@/utils/errors';
import { colors, spacing } from '@/theme';

export default function MoreScreen() {
  const router = useRouter();
  const { profile, organization, signOut } = useAuth();

  const confirmLogout = () => {
    Alert.alert('Çıkış Yap', 'Çıkış yapmak istediğinize emin misiniz?', [
      { text: 'İptal', style: 'cancel' },
      {
        text: 'Çıkış Yap',
        style: 'destructive',
        onPress: () => {
          void (async () => {
            try {
              await signOut();
            } catch (error) {
              Alert.alert('Hata', getErrorMessage(error, 'Çıkış yapılamadı.'));
            }
          })();
        },
      },
    ]);
  };

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
    >
      <View style={styles.profileRow}>
        <Avatar name={profile?.full_name} size={56} />
        <View style={styles.profileText}>
          <ScreenHeader
            title={profile?.full_name ?? 'Kullanıcı'}
            subtitle={organization?.name ?? 'Organizasyon'}
          />
        </View>
      </View>

      <Card padded={false} style={styles.menu}>
        <ListItem title="Profil" onPress={() => router.push('/(app)/more/profile')} />
        <ListItem title="Ödemeler" onPress={() => router.push('/(app)/more/payments')} />
        <ListItem title="Masraflar" onPress={() => router.push('/(app)/more/expenses')} />
        <ListItem title="Bakım" onPress={() => router.push('/(app)/more/maintenance')} />
        <ListItem title="Raporlar" onPress={() => router.push('/(app)/more/reports')} />
        <ListItem
          title="Bildirimler"
          onPress={() => router.push('/(app)/more/notifications')}
        />
        <ListItem title="Ayarlar" onPress={() => router.push('/(app)/more/settings')} />
        <ListItem title="Çıkış Yap" destructive onPress={confirmLogout} />
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, gap: spacing.lg },
  profileRow: {
    flexDirection: 'row',
    gap: spacing.md,
    alignItems: 'center',
  },
  profileText: { flex: 1 },
  menu: { overflow: 'hidden' },
});
