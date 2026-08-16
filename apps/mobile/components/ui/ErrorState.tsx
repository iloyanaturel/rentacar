import { StyleSheet, Text, View } from 'react-native';
import { Button } from './Button';
import { colors, spacing, typography } from '@/theme';

type Props = {
  message?: string;
  onRetry?: () => void;
};

export function ErrorState({
  message = 'Veriler yüklenirken bir sorun oluştu.',
  onRetry,
}: Props) {
  return (
    <View style={styles.wrap} accessibilityRole="alert">
      <Text style={styles.title}>{message}</Text>
      {onRetry ? (
        <Button title="Tekrar Dene" onPress={onRetry} style={styles.button} />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    gap: spacing.md,
  },
  title: {
    ...typography.bodyMedium,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  button: {
    alignSelf: 'stretch',
  },
});
