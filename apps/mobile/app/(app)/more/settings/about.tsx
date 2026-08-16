import { useRouter } from 'expo-router';
import { ScrollView, StyleSheet, Text } from 'react-native';
import { Card, ListItem } from '@/components/ui';
import { APP_NAME, APP_VERSION, PRIVACY_URL, TERMS_URL } from '@/config/app';
import { colors, spacing, typography } from '@/theme';

export default function AboutSettingsScreen() {
  const router = useRouter();
  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.brand}>{APP_NAME}</Text>
      <Text style={styles.version}>Version {APP_VERSION}</Text>
      <Text style={styles.body}>
        Rent-a-car işletmeleri için operasyon, finans ve raporlama platformu.
      </Text>
      <Card padded={false}>
        <ListItem
          title="Kullanım Koşulları"
          onPress={() =>
            router.push({
              pathname: '/(app)/more/settings/legal',
              params: { doc: 'terms' },
            })
          }
        />
        <ListItem
          title="Gizlilik Politikası"
          onPress={() =>
            router.push({
              pathname: '/(app)/more/settings/legal',
              params: { doc: 'privacy' },
            })
          }
        />
        <ListItem title="Terms URL" subtitle={TERMS_URL} />
        <ListItem title="Privacy URL" subtitle={PRIVACY_URL} />
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, gap: spacing.md },
  brand: { ...typography.hero, color: colors.primary },
  version: { ...typography.body, color: colors.textSecondary },
  body: { ...typography.body, color: colors.text },
});
