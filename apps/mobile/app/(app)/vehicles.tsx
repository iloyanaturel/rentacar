import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { EmptyState, ScreenHeader } from '@/components/ui';
import { colors, spacing } from '@/theme';

export default function VehiclesPlaceholderScreen() {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.screen, { paddingTop: insets.top + spacing.lg }]}>
      <ScreenHeader
        title="Araçlar"
        subtitle="Filonuzu buradan yöneteceksiniz."
      />
      <EmptyState
        title="Araç modülü hazırlanıyor."
        description="Bir sonraki adımda araç listesi ve ekleme ekranları eklenecek."
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
    paddingHorizontal: spacing.lg,
  },
});
