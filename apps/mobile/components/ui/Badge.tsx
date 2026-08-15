import { StyleSheet, Text, View } from 'react-native';
import { colors, radius, spacing, typography } from '@/theme';

type Tone = 'neutral' | 'success' | 'warning' | 'danger' | 'info' | 'primary';

const toneMap: Record<Tone, { bg: string; fg: string }> = {
  neutral: { bg: colors.surfaceMuted, fg: colors.textSecondary },
  success: { bg: colors.successSoft, fg: colors.success },
  warning: { bg: colors.warningSoft, fg: colors.warning },
  danger: { bg: colors.dangerSoft, fg: colors.danger },
  info: { bg: colors.infoSoft, fg: colors.info },
  primary: { bg: colors.primarySoft, fg: colors.primary },
};

type Props = {
  label: string;
  tone?: Tone;
};

export function Badge({ label, tone = 'neutral' }: Props) {
  const palette = toneMap[tone];
  return (
    <View style={[styles.badge, { backgroundColor: palette.bg }]}>
      <Text style={[styles.text, { color: palette.fg }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.sm,
  },
  text: {
    ...typography.caption,
    fontFamily: 'DMSans_500Medium',
  },
});
