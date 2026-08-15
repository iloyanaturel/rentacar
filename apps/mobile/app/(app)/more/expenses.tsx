import { StyleSheet, View } from 'react-native';
import { EmptyState } from '@/components/ui';
import { colors, spacing } from '@/theme';

export default function ExpensesPlaceholder() {
  return (
    <View style={styles.screen}>
      <EmptyState
        title="Masraflar yakında"
        description="Araç ve işletme giderlerinizi buradan takip edebileceksiniz."
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
    padding: spacing.lg,
  },
});
