import { StyleSheet, Text, View } from 'react-native';
import { Card, PaymentStatusBadge } from '@/components/ui';
import type { TodayReturn } from '@/services/dashboardService';
import { formatCurrency } from '@/utils/currency';
import { formatTime } from '@/utils/date';
import { colors, spacing, typography } from '@/theme';

export function TodayReturnCard({ item }: { item: TodayReturn }) {
  return (
    <Card style={styles.card}>
      <View style={styles.top}>
        <View style={styles.flex}>
          <Text style={styles.vehicle}>
            {item.brand} {item.model}
          </Text>
          <Text style={styles.plate}>{item.plate}</Text>
        </View>
        <PaymentStatusBadge status={item.payment_status} />
      </View>
      <Text style={styles.customer}>{item.customer_name}</Text>
      <Text style={styles.time}>Teslim: {formatTime(item.end_time)}</Text>
      <View style={styles.moneyRow}>
        <Text style={styles.total}>{formatCurrency(item.total_amount)}</Text>
        <Text style={styles.meta}>
          Ödenen: {formatCurrency(item.paid_amount)}
        </Text>
        <Text style={styles.meta}>
          Kalan: {formatCurrency(item.remaining_amount)}
        </Text>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: spacing.md,
  },
  top: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.md,
    marginBottom: spacing.sm,
  },
  flex: { flex: 1 },
  vehicle: {
    ...typography.bodyMedium,
    color: colors.text,
  },
  plate: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 2,
  },
  customer: {
    ...typography.body,
    color: colors.text,
  },
  time: {
    ...typography.label,
    color: colors.primary,
    marginTop: spacing.xs,
  },
  moneyRow: {
    marginTop: spacing.md,
    gap: 2,
  },
  total: {
    ...typography.subtitle,
    color: colors.text,
  },
  meta: {
    ...typography.caption,
    color: colors.textSecondary,
  },
});
