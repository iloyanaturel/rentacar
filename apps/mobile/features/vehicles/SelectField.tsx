import { useState } from 'react';
import {
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Input } from '@/components/ui';
import { colors, spacing, typography } from '@/theme';

type Option = { value: string; label: string };

type Props = {
  label: string;
  value?: string;
  options: Option[];
  onChange: (value: string) => void;
  placeholder?: string;
  error?: string;
};

export function SelectField({
  label,
  value,
  options,
  onChange,
  placeholder = 'Seçin',
  error,
}: Props) {
  const [open, setOpen] = useState(false);
  const selected = options.find((o) => o.value === value);

  return (
    <View>
      <Pressable onPress={() => setOpen(true)} accessibilityRole="button">
        <View pointerEvents="none">
          <Input
            label={label}
            value={selected?.label ?? ''}
            placeholder={placeholder}
            editable={false}
            error={error}
          />
        </View>
      </Pressable>

      <Modal visible={open} transparent animationType="fade">
        <Pressable style={styles.overlay} onPress={() => setOpen(false)}>
          <View style={styles.sheet}>
            <Text style={styles.title}>{label}</Text>
            <FlatList
              data={options}
              keyExtractor={(item) => item.value}
              renderItem={({ item }) => (
                <Pressable
                  style={styles.option}
                  onPress={() => {
                    onChange(item.value);
                    setOpen(false);
                  }}
                >
                  <Text
                    style={[
                      styles.optionText,
                      item.value === value && styles.optionActive,
                    ]}
                  >
                    {item.label}
                  </Text>
                </Pressable>
              )}
            />
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: 'center',
    padding: spacing.xl,
  },
  sheet: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    maxHeight: '70%',
    padding: spacing.lg,
  },
  title: {
    ...typography.subtitle,
    color: colors.text,
    marginBottom: spacing.md,
  },
  option: {
    minHeight: 48,
    justifyContent: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  optionText: {
    ...typography.body,
    color: colors.text,
  },
  optionActive: {
    color: colors.primary,
    fontFamily: 'DMSans_600SemiBold',
  },
});
