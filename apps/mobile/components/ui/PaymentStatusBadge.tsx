import { StyleSheet, Text, View } from 'react-native';
import { Badge } from './Badge';
import { paymentStatusLabel } from '@/utils/labels';
import type { PaymentStatus } from '@rentaflow/shared';

const toneByStatus = {
  PAID: 'success',
  PARTIALLY_PAID: 'warning',
  UNPAID: 'danger',
} as const;

export function PaymentStatusBadge({ status }: { status: PaymentStatus }) {
  return (
    <View style={styles.wrap}>
      <Badge label={paymentStatusLabel(status)} tone={toneByStatus[status]} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {},
});
