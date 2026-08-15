import { StyleSheet, View } from 'react-native';
import { colors, radius, spacing } from '@/theme';

type Props = {
  height?: number;
  width?: number | `${number}%`;
  style?: object;
};

export function LoadingSkeleton({ height = 16, width = '100%', style }: Props) {
  return <View style={[styles.base, { height, width }, style]} />;
}

export function DashboardSkeleton() {
  return (
    <View style={styles.dash}>
      <LoadingSkeleton height={28} width="60%" />
      <LoadingSkeleton height={16} width="40%" style={{ marginTop: 8 }} />
      <View style={styles.row}>
        <LoadingSkeleton height={88} style={styles.half} />
        <LoadingSkeleton height={88} style={styles.half} />
      </View>
      <View style={styles.row}>
        <LoadingSkeleton height={88} style={styles.half} />
        <LoadingSkeleton height={88} style={styles.half} />
      </View>
      <LoadingSkeleton height={120} style={{ marginTop: spacing.md }} />
      <LoadingSkeleton height={160} style={{ marginTop: spacing.md }} />
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    backgroundColor: colors.skeleton,
    borderRadius: radius.sm,
  },
  dash: {
    gap: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.md,
  },
  half: {
    flex: 1,
    borderRadius: radius.lg,
  },
});
