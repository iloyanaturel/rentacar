import { StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import Svg, { Rect, Line, Text as SvgText, G } from 'react-native-svg';
import { colors, spacing, typography } from '@/theme';

export type SeriesPoint = {
  label: string;
  a: number;
  b?: number;
};

type Props = {
  title: string;
  data: SeriesPoint[];
  aLabel?: string;
  bLabel?: string;
  aColor?: string;
  bColor?: string;
};

export function DualBarChart({
  title,
  data,
  aLabel = 'Gelir',
  bLabel = 'Masraf',
  aColor = colors.primary,
  bColor = colors.warning,
}: Props) {
  const { width: screenW } = useWindowDimensions();
  const width = Math.min(screenW - 48, 520);
  const height = 180;
  const padL = 8;
  const padR = 8;
  const padT = 16;
  const padB = 28;
  const chartW = width - padL - padR;
  const chartH = height - padT - padB;
  const max = Math.max(1, ...data.flatMap((d) => [d.a, d.b ?? 0]));
  const groupW = chartW / Math.max(data.length, 1);
  const dual = data.some((d) => d.b != null);
  const barW = dual ? groupW * 0.32 : groupW * 0.55;

  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>{title}</Text>
      <View style={styles.legend}>
        <Text style={[styles.legendItem, { color: aColor }]}>● {aLabel}</Text>
        {dual ? (
          <Text style={[styles.legendItem, { color: bColor }]}>● {bLabel}</Text>
        ) : null}
      </View>
      <Svg width={width} height={height}>
        <Line
          x1={padL}
          y1={padT + chartH}
          x2={padL + chartW}
          y2={padT + chartH}
          stroke={colors.border}
          strokeWidth={1}
        />
        {data.map((d, i) => {
          const x0 = padL + i * groupW + groupW * 0.15;
          const hA = (d.a / max) * chartH;
          const hB = ((d.b ?? 0) / max) * chartH;
          return (
            <G key={d.label}>
              <Rect
                x={x0}
                y={padT + chartH - hA}
                width={barW}
                height={Math.max(hA, 0)}
                fill={aColor}
                rx={3}
              />
              {dual ? (
                <Rect
                  x={x0 + barW + 4}
                  y={padT + chartH - hB}
                  width={barW}
                  height={Math.max(hB, 0)}
                  fill={bColor}
                  rx={3}
                />
              ) : null}
              <SvgText
                x={x0 + (dual ? barW : barW / 2)}
                y={height - 8}
                fontSize={9}
                fill={colors.textMuted}
                textAnchor="middle"
              >
                {d.label}
              </SvgText>
            </G>
          );
        })}
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: spacing.sm,
  },
  title: { ...typography.bodyMedium, color: colors.text },
  legend: { flexDirection: 'row', gap: 12 },
  legendItem: { ...typography.caption },
});
