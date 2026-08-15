import { StyleSheet, View } from 'react-native';
import { EmptyState } from '@/components/ui';
import { colors, spacing } from '@/theme';

export default function SettingsPlaceholder() {
  return (
    <View style={styles.screen}>
      <EmptyState
        title="Ayarlar yakında"
        description="Firma bilgileri ve tercihler sonraki adımda düzenlenebilecek."
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
