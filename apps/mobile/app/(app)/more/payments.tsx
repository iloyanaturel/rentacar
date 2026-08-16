import { StyleSheet, View } from 'react-native';
import { EmptyState } from '@/components/ui';
import { colors, spacing } from '@/theme';

type Props = {
  title: string;
  description: string;
};

function PlaceholderModule({ title, description }: Props) {
  return (
    <View style={styles.screen}>
      <EmptyState title={title} description={description} />
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

export default function PaymentsPlaceholder() {
  return (
    <PlaceholderModule
      title="Ödemeler yakında"
      description="Ödeme kayıtları ve tahsilat takibi burada görünecek."
    />
  );
}
