import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { EmptyState, ScreenHeader } from '@/components/ui';
import { colors, spacing } from '@/theme';

export default function RentalsPlaceholderScreen() {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.screen, { paddingTop: insets.top + spacing.lg }]}>
      <ScreenHeader
        title="Kiralamalar"
        subtitle="Aktif ve yaklaşan kiralamalar."
      />
      <EmptyState
        title="Kiralama modülü hazırlanıyor."
        description="Kiralama oluşturma ve teslim işlemleri sonraki adımlarda eklenecek."
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
