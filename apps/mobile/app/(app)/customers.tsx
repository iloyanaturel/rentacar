import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { EmptyState, ScreenHeader } from '@/components/ui';
import { colors, spacing } from '@/theme';

export default function CustomersPlaceholderScreen() {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.screen, { paddingTop: insets.top + spacing.lg }]}>
      <ScreenHeader
        title="Müşteriler"
        subtitle="Müşteri kayıtlarınız burada olacak."
      />
      <EmptyState
        title="Müşteri modülü hazırlanıyor."
        description="Müşteri listesi ve detay ekranları sonraki adımda eklenecek."
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
