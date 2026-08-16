import { StyleSheet, Text, View } from 'react-native';
import { colors, spacing, typography } from '@/theme';

type Props = {
  title: string;
  action?: React.ReactNode;
};

export function SectionHeader({ title, action }: Props) {
  return (
    <View style={styles.row}>
      <Text style={styles.title}>{title}</Text>
      {action}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
    marginTop: spacing.sm,
  },
  title: {
    ...typography.subtitle,
    color: colors.text,
  },
});
