import { ScrollView, StyleSheet, Text } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { colors, spacing, typography } from '@/theme';

/**
 * Placeholder legal copy — replace with counsel-approved text before production store release.
 */
export default function LegalSettingsScreen() {
  const { doc } = useLocalSearchParams<{ doc?: string }>();
  const isPrivacy = doc === 'privacy';

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.title}>
        {isPrivacy ? 'Gizlilik Politikası' : 'Kullanım Koşulları'}
      </Text>
      <Text style={styles.warn}>
        Bu metin yer tutucudur. Production öncesi gerçek hukuki metinlerle
        değiştirilmelidir.
      </Text>
      <Text style={styles.body}>
        {isPrivacy
          ? 'RentaFlow, işletme verilerinizi organizasyon izolasyonu ve RLS ile korur. Müşteri telefon, e-posta ve adres bilgileri hassas kabul edilir; loglara yazılmaz. Detaylı politika URL’si ayarlardan erişilebilir.'
          : 'RentaFlow hizmetini kullanarak organizasyonunuzun verilerinden ve kullanıcı erişiminden sorumlu olduğunuzu kabul edersiniz. Finansal kayıtlar soft-delete ile korunur; organization silme bu sürümde kullanıcıya kapalıdır.'}
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, gap: spacing.md },
  title: { ...typography.title, color: colors.text },
  warn: { ...typography.caption, color: colors.warning },
  body: { ...typography.body, color: colors.textSecondary, lineHeight: 22 },
});
