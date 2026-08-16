import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Card, ScreenHeader } from '@/components/ui';
import { permissionsForRole } from '@/features/auth/permissions';
import { roleLabel } from '@/utils/labels';
import type { UserRole } from '@rentaflow/shared';
import { colors, spacing, typography } from '@/theme';

const ROLES: UserRole[] = ['owner', 'admin', 'manager', 'staff', 'viewer'];

const DESCRIPTIONS: Record<UserRole, string> = {
  owner: 'Tüm yetkiler. Organizasyon sahipliği işlemleri.',
  admin:
    'Araç, müşteri, kiralama, ödeme, bakım, masraf, rapor ve kullanıcı yönetimi. Ownership sınırlı.',
  manager:
    'Araç, müşteri, kiralama, teslim/iade, bakım ve raporlar. Kullanıcı yönetimi yok.',
  staff: 'Müşteri, kiralama, teslim ve iade. Finansal raporlar sınırlı.',
  viewer: 'Salt okunur görünüm.',
};

export default function RolesSettingsScreen() {
  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <ScreenHeader
        title="Roller ve Yetkiler"
        subtitle="İzinler rol üzerinden atanır; güvenlik RLS/RPC tarafındadır."
      />
      {ROLES.map((role) => {
        const perms = permissionsForRole(role);
        return (
          <Card key={role} style={styles.card}>
            <Text style={styles.title}>{roleLabel(role)}</Text>
            <Text style={styles.desc}>{DESCRIPTIONS[role]}</Text>
            <Text style={styles.count}>{perms.length} izin</Text>
            <View style={styles.permWrap}>
              {perms.slice(0, 8).map((p) => (
                <Text key={p} style={styles.perm}>
                  {p}
                </Text>
              ))}
              {perms.length > 8 ? (
                <Text style={styles.perm}>+{perms.length - 8} daha</Text>
              ) : null}
            </View>
          </Card>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, gap: spacing.md },
  card: { gap: spacing.sm },
  title: { ...typography.subtitle, color: colors.text },
  desc: { ...typography.body, color: colors.textSecondary },
  count: { ...typography.caption, color: colors.textMuted },
  permWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  perm: {
    ...typography.caption,
    color: colors.primary,
    backgroundColor: colors.primarySoft,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    overflow: 'hidden',
  },
});
