import { StyleSheet, Text, View } from 'react-native';
import { colors, radius, typography } from '@/theme';

type Props = {
  name?: string | null;
  size?: number;
};

export function Avatar({ name, size = 44 }: Props) {
  const initials =
    name
      ?.split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join('') || '?';

  return (
    <View
      style={[
        styles.avatar,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
        },
      ]}
      accessibilityLabel={name ?? 'Kullanıcı'}
    >
      <Text style={[styles.text, { fontSize: size * 0.36 }]}>{initials}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  avatar: {
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    ...typography.bodyMedium,
    color: colors.primary,
    fontFamily: 'Outfit_600SemiBold',
  },
});
