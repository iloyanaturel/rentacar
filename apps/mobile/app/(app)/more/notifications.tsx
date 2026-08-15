import { StyleSheet, View } from 'react-native';
import { EmptyState } from '@/components/ui';
import { colors, spacing } from '@/theme';

export default function NotificationsPlaceholder() {
  return (
    <View style={styles.screen}>
      <EmptyState
        title="Bildirim yok"
        description="Teslim, ödeme ve belge hatırlatmaları burada listelenecek."
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
