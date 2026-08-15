import { StyleSheet, View } from 'react-native';
import { EmptyState } from '@/components/ui';
import { colors, spacing } from '@/theme';

export default function MaintenancePlaceholder() {
  return (
    <View style={styles.screen}>
      <EmptyState
        title="Bakım kayıtları yakında"
        description="Servis ve bakım geçmişi bu bölümde yer alacak."
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
