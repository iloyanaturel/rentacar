import { useState } from 'react';
import {
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { parseISO, isValid, format } from 'date-fns';
import { Input } from '@/components/ui';
import { colors, spacing, typography } from '@/theme';
import { isoToTrDate, trDateToIso } from './schemas';

type Props = {
  label: string;
  value?: string;
  onChange: (trDate: string) => void;
  error?: string;
};

export function DateField({ label, value, onChange, error }: Props) {
  const [open, setOpen] = useState(false);
  const iso = trDateToIso(value) ?? new Date().toISOString().slice(0, 10);
  const dateValue = (() => {
    const d = parseISO(`${iso}T12:00:00`);
    return isValid(d) ? d : new Date();
  })();

  return (
    <View>
      <Pressable onPress={() => setOpen(true)} accessibilityRole="button">
        <View pointerEvents="none">
          <Input
            label={label}
            value={value || ''}
            placeholder="GG.AA.YYYY"
            editable={false}
            error={error}
          />
        </View>
      </Pressable>

      {open && Platform.OS === 'android' ? (
        <DateTimePicker
          value={dateValue}
          mode="date"
          display="default"
          onChange={(_e, selected) => {
            setOpen(false);
            if (selected) {
              onChange(format(selected, 'dd.MM.yyyy'));
            }
          }}
        />
      ) : null}

      {Platform.OS === 'ios' ? (
        <Modal visible={open} transparent animationType="slide">
          <View style={styles.overlay}>
            <View style={styles.sheet}>
              <View style={styles.sheetHeader}>
                <Pressable onPress={() => setOpen(false)}>
                  <Text style={styles.action}>Kapat</Text>
                </Pressable>
                <Pressable
                  onPress={() => {
                    onChange(isoToTrDate(iso) || format(dateValue, 'dd.MM.yyyy'));
                    setOpen(false);
                  }}
                >
                  <Text style={[styles.action, styles.primary]}>Tamam</Text>
                </Pressable>
              </View>
              <DateTimePicker
                value={dateValue}
                mode="date"
                display="spinner"
                onChange={(_e, selected) => {
                  if (selected) {
                    onChange(format(selected, 'dd.MM.yyyy'));
                  }
                }}
              />
            </View>
          </View>
        </Modal>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: colors.overlay,
  },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingBottom: spacing.xxl,
  },
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: spacing.lg,
  },
  action: { ...typography.bodyMedium, color: colors.textSecondary },
  primary: { color: colors.primary },
});
