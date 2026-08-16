import { Controller, useFormContext } from 'react-hook-form';
import { StyleSheet, Text, View } from 'react-native';
import { Input } from '@/components/ui';
import { DateField } from './DateField';
import { SelectField } from './SelectField';
import { FUEL_OPTIONS, TRANSMISSION_OPTIONS } from './constants';
import type { VehicleFormValues } from './schemas';
import { colors, spacing, typography } from '@/theme';

export function VehicleFormFields() {
  const {
    control,
    formState: { errors },
  } = useFormContext<VehicleFormValues>();

  return (
    <View style={styles.wrap}>
      <Text style={styles.section}>Temel Bilgiler</Text>
      <Controller
        control={control}
        name="brand"
        render={({ field: { onChange, onBlur, value } }) => (
          <Input
            label="Marka *"
            value={value}
            onBlur={onBlur}
            onChangeText={onChange}
            error={errors.brand?.message}
          />
        )}
      />
      <Controller
        control={control}
        name="model"
        render={({ field: { onChange, onBlur, value } }) => (
          <Input
            label="Model *"
            value={value}
            onBlur={onBlur}
            onChangeText={onChange}
            error={errors.model?.message}
          />
        )}
      />
      <Controller
        control={control}
        name="model_year"
        render={({ field: { onChange, onBlur, value } }) => (
          <Input
            label="Model Yılı"
            keyboardType="number-pad"
            value={value ?? ''}
            onBlur={onBlur}
            onChangeText={onChange}
            error={errors.model_year?.message}
            placeholder="2024"
          />
        )}
      />
      <Controller
        control={control}
        name="plate"
        render={({ field: { onChange, onBlur, value } }) => (
          <Input
            label="Plaka *"
            autoCapitalize="characters"
            value={value}
            onBlur={onBlur}
            onChangeText={onChange}
            error={errors.plate?.message}
            placeholder="34 ABC 123"
          />
        )}
      />
      <Controller
        control={control}
        name="color"
        render={({ field: { onChange, onBlur, value } }) => (
          <Input
            label="Renk"
            value={value ?? ''}
            onBlur={onBlur}
            onChangeText={onChange}
          />
        )}
      />
      <Controller
        control={control}
        name="fuel_type"
        render={({ field: { onChange, value } }) => (
          <SelectField
            label="Yakıt"
            value={value}
            options={FUEL_OPTIONS}
            onChange={onChange}
          />
        )}
      />
      <Controller
        control={control}
        name="transmission"
        render={({ field: { onChange, value } }) => (
          <SelectField
            label="Vites"
            value={value}
            options={TRANSMISSION_OPTIONS}
            onChange={onChange}
          />
        )}
      />

      <Text style={styles.section}>Teknik</Text>
      <Controller
        control={control}
        name="current_km"
        render={({ field: { onChange, onBlur, value } }) => (
          <Input
            label="Kilometre"
            keyboardType="number-pad"
            value={value ?? ''}
            onBlur={onBlur}
            onChangeText={onChange}
            error={errors.current_km?.message}
          />
        )}
      />
      <Controller
        control={control}
        name="daily_price"
        render={({ field: { onChange, onBlur, value } }) => (
          <Input
            label="Günlük Kiralama Fiyatı *"
            keyboardType="decimal-pad"
            value={value}
            onBlur={onBlur}
            onChangeText={onChange}
            error={errors.daily_price?.message}
            placeholder="1500"
          />
        )}
      />
      <Controller
        control={control}
        name="deposit_amount"
        render={({ field: { onChange, onBlur, value } }) => (
          <Input
            label="Depozito"
            keyboardType="decimal-pad"
            value={value ?? ''}
            onBlur={onBlur}
            onChangeText={onChange}
            error={errors.deposit_amount?.message}
          />
        )}
      />

      <Text style={styles.section}>Belgeler</Text>
      <Controller
        control={control}
        name="insurance_expiry"
        render={({ field: { onChange, value } }) => (
          <DateField
            label="Sigorta Bitiş"
            value={value}
            onChange={onChange}
          />
        )}
      />
      <Controller
        control={control}
        name="casco_expiry"
        render={({ field: { onChange, value } }) => (
          <DateField label="Kasko Bitiş" value={value} onChange={onChange} />
        )}
      />
      <Controller
        control={control}
        name="inspection_expiry"
        render={({ field: { onChange, value } }) => (
          <DateField
            label="Muayene Bitiş"
            value={value}
            onChange={onChange}
          />
        )}
      />

      <Text style={styles.section}>Diğer</Text>
      <Controller
        control={control}
        name="notes"
        render={({ field: { onChange, onBlur, value } }) => (
          <Input
            label="Not"
            value={value ?? ''}
            onBlur={onBlur}
            onChangeText={onChange}
            multiline
            style={{ minHeight: 96, textAlignVertical: 'top' }}
          />
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.lg },
  section: {
    ...typography.subtitle,
    color: colors.text,
    marginTop: spacing.sm,
  },
});
