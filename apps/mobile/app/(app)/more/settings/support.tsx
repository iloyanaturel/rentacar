import { Linking, ScrollView, StyleSheet, Text } from 'react-native';
import { Card, ListItem } from '@/components/ui';
import {
  APP_NAME,
  APP_VERSION,
  PRIVACY_URL,
  SUPPORT_EMAIL,
  TERMS_URL,
} from '@/config/app';
import { colors, spacing, typography } from '@/theme';

export default function SupportSettingsScreen() {
  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Destek</Text>
      <Card padded={false}>
        <ListItem
          title="E-posta"
          subtitle={SUPPORT_EMAIL}
          onPress={() => void Linking.openURL(`mailto:${SUPPORT_EMAIL}`)}
        />
        <ListItem
          title="Yardım merkezi"
          subtitle="rentaflow.app/help (placeholder)"
          onPress={() => void Linking.openURL('https://rentaflow.app/help')}
        />
        <ListItem
          title="Uygulama versiyonu"
          subtitle={`${APP_NAME} ${APP_VERSION}`}
        />
        <ListItem
          title="Gizlilik Politikası"
          onPress={() => void Linking.openURL(PRIVACY_URL)}
        />
        <ListItem
          title="Kullanım Koşulları"
          onPress={() => void Linking.openURL(TERMS_URL)}
        />
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, gap: spacing.md },
  title: { ...typography.title, color: colors.text },
});
