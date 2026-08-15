import { StyleSheet, View } from 'react-native';
import { EmptyState } from '@/components/ui';
import { colors, spacing } from '@/theme';

export default function ReportsPlaceholder() {
  return (
    <View style={styles.screen}>
      <EmptyState
        title="Raporlar yakında"
        description="Finansal ve operasyonel özetler burada hazır olacak."
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
