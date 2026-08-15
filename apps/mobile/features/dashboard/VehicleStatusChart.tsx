import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { colors, spacing, typography } from '@/theme';
import type { VehicleStatus } from '@rentaflow/shared';

type Slice = {
  key: VehicleStatus;
  label: string;
  value: number;
};

const STATUS_COLORS: Record<VehicleStatus, string> = {
  AVAILABLE: colors.status.AVAILABLE,
  RENTED: colors.status.RENTED,
  MAINTENANCE: colors.status.MAINTENANCE,
  INACTIVE: colors.status.INACTIVE,
};

type Props = {
  data: Slice[];
};

export function VehicleStatusChart({ data }: Props) {
  const total = data.reduce((sum, item) => sum + item.value, 0) || 1;
  const size = 140;
  const stroke = 18;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;

  let offset = 0;

  return (
    <View style={styles.wrap}>
      <View style={styles.chartWrap}>
        <Svg width={size} height={size}>
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={colors.surfaceMuted}
            strokeWidth={stroke}
            fill="none"
          />
          {data.map((item) => {
            const length = (item.value / total) * circumference;
            const circle = (
              <Circle
                key={item.key}
                cx={size / 2}
                cy={size / 2}
                r={radius}
                stroke={STATUS_COLORS[item.key]}
                strokeWidth={stroke}
                fill="none"
                strokeDasharray={`${length} ${circumference - length}`}
                strokeDashoffset={-offset}
                strokeLinecap="butt"
                rotation={-90}
                origin={`${size / 2}, ${size / 2}`}
              />
            );
            offset += length;
            return circle;
          })}
        </Svg>
        <View style={styles.center}>
          <Text style={styles.centerValue}>{data.reduce((s, i) => s + i.value, 0)}</Text>
          <Text style={styles.centerLabel}>Araç</Text>
        </View>
      </View>
      <View style={styles.legend}>
        {data.map((item) => (
          <View key={item.key} style={styles.legendRow}>
            <View
              style={[styles.dot, { backgroundColor: STATUS_COLORS[item.key] }]}
            />
            <Text style={styles.legendLabel}>{item.label}</Text>
            <Text style={styles.legendValue}>{item.value}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
  },
  chartWrap: {
    width: 140,
    height: 140,
    alignItems: 'center',
    justifyContent: 'center',
  },
  center: {
    position: 'absolute',
    alignItems: 'center',
  },
  centerValue: {
    ...typography.kpi,
    color: colors.text,
  },
  centerLabel: {
    ...typography.caption,
    color: colors.textMuted,
  },
  legend: {
    flex: 1,
    gap: spacing.sm,
  },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendLabel: {
    ...typography.body,
    color: colors.textSecondary,
    flex: 1,
  },
  legendValue: {
    ...typography.bodyMedium,
    color: colors.text,
  },
});
