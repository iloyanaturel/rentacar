import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Button } from '@/components/ui';
import {
  DOCUMENT_EXPIRY_FILTERS,
  VEHICLE_STATUS_FILTERS,
  type DocumentExpiryFilter,
} from './constants';
import type { VehicleStatus } from '@rentaflow/shared';
import { colors, spacing, typography } from '@/theme';

export type VehicleFilterState = {
  status: VehicleStatus | 'ALL';
  brand: string | 'ALL';
  documentExpiry: DocumentExpiryFilter;
};

type Props = {
  visible: boolean;
  value: VehicleFilterState;
  brands: string[];
  onChange: (next: VehicleFilterState) => void;
  onClose: () => void;
  onClear: () => void;
};

function Chip({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.chip, active && styles.chipActive]}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
    >
      <Text style={[styles.chipText, active && styles.chipTextActive]}>
        {label}
      </Text>
    </Pressable>
  );
}

export function VehicleFiltersModal({
  visible,
  value,
  brands,
  onChange,
  onClose,
  onClear,
}: Props) {
  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <Text style={styles.title}>Filtreler</Text>
          <ScrollView contentContainerStyle={styles.content}>
            <Text style={styles.section}>Durum</Text>
            <View style={styles.chips}>
              {VEHICLE_STATUS_FILTERS.map((item) => (
                <Chip
                  key={item.value}
                  label={item.label}
                  active={value.status === item.value}
                  onPress={() => onChange({ ...value, status: item.value })}
                />
              ))}
            </View>

            <Text style={styles.section}>Marka</Text>
            <View style={styles.chips}>
              <Chip
                label="Tümü"
                active={value.brand === 'ALL'}
                onPress={() => onChange({ ...value, brand: 'ALL' })}
              />
              {brands.map((brand) => (
                <Chip
                  key={brand}
                  label={brand}
                  active={value.brand === brand}
                  onPress={() => onChange({ ...value, brand })}
                />
              ))}
            </View>

            <Text style={styles.section}>Yaklaşan belge</Text>
            <View style={styles.chips}>
              {DOCUMENT_EXPIRY_FILTERS.map((item) => (
                <Chip
                  key={item.value}
                  label={item.label}
                  active={value.documentExpiry === item.value}
                  onPress={() =>
                    onChange({ ...value, documentExpiry: item.value })
                  }
                />
              ))}
            </View>
          </ScrollView>

          <View style={styles.actions}>
            <Button title="Filtreleri Temizle" variant="ghost" onPress={onClear} />
            <Button title="Uygula" onPress={onClose} />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '85%',
    paddingTop: spacing.xl,
  },
  title: {
    ...typography.title,
    color: colors.text,
    paddingHorizontal: spacing.xl,
    marginBottom: spacing.md,
  },
  content: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xl,
    gap: spacing.sm,
  },
  section: {
    ...typography.label,
    color: colors.textSecondary,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 999,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    minHeight: 40,
    justifyContent: 'center',
  },
  chipActive: {
    backgroundColor: colors.primarySoft,
    borderColor: colors.primary,
  },
  chipText: { ...typography.caption, color: colors.textSecondary },
  chipTextActive: { color: colors.primary, fontFamily: 'DMSans_600SemiBold' },
  actions: {
    padding: spacing.xl,
    gap: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
});
