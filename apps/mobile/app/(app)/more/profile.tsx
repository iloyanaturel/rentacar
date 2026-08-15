import { StyleSheet, Text, View } from 'react-native';
import { Card } from '@/components/ui';
import { useAuth } from '@/features/auth';
import { roleLabel } from '@/utils/labels';
import { colors, spacing, typography } from '@/theme';

function Row({ label, value }: { label: string; value?: string | null }) {
  return (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value || '—'}</Text>
    </View>
  );
}

export default function ProfileScreen() {
  const { profile, organization, user, role } = useAuth();

  return (
    <View style={styles.screen}>
      <Card style={styles.card}>
        <Row label="Ad Soyad" value={profile?.full_name} />
        <Row label="E-posta" value={user?.email} />
        <Row label="Telefon" value={profile?.phone} />
        <Row label="Rol" value={role ? roleLabel(role) : null} />
        <Row label="Firma" value={organization?.name} />
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
    padding: spacing.lg,
  },
  card: { gap: spacing.md },
  row: { gap: 4 },
  label: {
    ...typography.caption,
    color: colors.textMuted,
  },
  value: {
    ...typography.bodyMedium,
    color: colors.text,
  },
});
