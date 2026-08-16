import { StyleSheet, Text, View } from 'react-native';
import { Card } from '@/components/ui';
import type { UpcomingRental } from '@/services/dashboardService';
import { formatFriendlyDate, formatTime } from '@/utils/date';
import { colors, spacing, typography } from '@/theme';

export function UpcomingRentalRow({ item }: { item: UpcomingRental }) {
  return (
    <Card style={styles.card}>
      <Text style={styles.date}>{formatFriendlyDate(item.start_date)}</Text>
      <Text style={styles.vehicle}>
        {item.brand} {item.model}
      </Text>
      <Text style={styles.plate}>{item.plate}</Text>
      <View style={styles.footer}>
        <Text style={styles.customer}>{item.customer_name}</Text>
        <Text style={styles.time}>{formatTime(item.start_time)}</Text>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: spacing.md,
  },
  date: {
    ...typography.label,
    color: colors.primary,
    marginBottom: spacing.xs,
  },
  vehicle: {
    ...typography.bodyMedium,
    color: colors.text,
  },
  plate: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  footer: {
    marginTop: spacing.sm,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  customer: {
    ...typography.body,
    color: colors.text,
  },
  time: {
    ...typography.caption,
    color: colors.textMuted,
  },
});
