import { StyleSheet, Text, View } from 'react-native';
import { colors, spacing, typography } from '@/theme';
import { getExpiryStatus } from '@/utils/expiry';

type Props = {
  label: string;
  date?: string | null;
};

export function DocumentExpiryRow({ label, date }: Props) {
  const status = getExpiryStatus(date);
  const color =
    status.level === 'expired' || status.level === 'critical'
      ? colors.danger
      : status.level === 'warning'
        ? colors.warning
        : colors.textSecondary;

  const icon =
    status.level === 'expired'
      ? '⛔'
      : status.level === 'critical'
        ? '🔴'
        : status.level === 'warning'
          ? '🟡'
          : '';

  return (
    <View style={styles.row}>
      <View style={styles.flex}>
        <Text style={styles.label}>{label}</Text>
        <Text style={styles.date}>{status.dateLabel}</Text>
      </View>
      <Text style={[styles.status, { color }]}>
        {icon ? `${icon} ` : ''}
        {status.label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    paddingVertical: spacing.sm,
  },
  flex: { flex: 1 },
  label: { ...typography.bodyMedium, color: colors.text },
  date: { ...typography.caption, color: colors.textMuted, marginTop: 2 },
  status: { ...typography.label },
});
