import { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { FormProvider, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui';
import { VehicleFormFields } from '@/features/vehicles/VehicleFormFields';
import { useCreateVehicle } from '@/features/vehicles/hooks';
import {
  parseKmInput,
  parseMoneyInput,
  toOptionalFuel,
  toOptionalTransmission,
  trDateToIso,
  vehicleFormSchema,
  type VehicleFormValues,
} from '@/features/vehicles/schemas';
import { getErrorMessage } from '@/utils/errors';
import { colors, spacing, typography } from '@/theme';

export default function CreateVehicleScreen() {
  const router = useRouter();
  const createMutation = useCreateVehicle();
  const [formError, setFormError] = useState<string | null>(null);

  const methods = useForm<VehicleFormValues>({
    resolver: zodResolver(vehicleFormSchema),
    defaultValues: {
      brand: '',
      model: '',
      model_year: '',
      plate: '',
      color: '',
      fuel_type: '',
      transmission: '',
      current_km: '0',
      daily_price: '',
      deposit_amount: '',
      insurance_expiry: '',
      casco_expiry: '',
      inspection_expiry: '',
      notes: '',
    },
  });

  const onSubmit = methods.handleSubmit(async (values) => {
    setFormError(null);
    try {
      const vehicle = await createMutation.mutateAsync({
        brand: values.brand.trim(),
        model: values.model.trim(),
        model_year: values.model_year ? Number(values.model_year) : null,
        plate: values.plate.trim(),
        color: values.color?.trim() || null,
        fuel_type: toOptionalFuel(values.fuel_type),
        transmission: toOptionalTransmission(values.transmission),
        current_km: parseKmInput(values.current_km),
        daily_price: parseMoneyInput(values.daily_price),
        deposit_amount: parseMoneyInput(values.deposit_amount),
        insurance_expiry: trDateToIso(values.insurance_expiry),
        casco_expiry: trDateToIso(values.casco_expiry),
        inspection_expiry: trDateToIso(values.inspection_expiry),
        notes: values.notes?.trim() || null,
        status: 'AVAILABLE',
      });

      Alert.alert(
        'Başarılı',
        `${vehicle.brand} ${vehicle.model} başarıyla eklendi.`,
        [
          {
            text: 'Tamam',
            onPress: () => router.replace(`/(app)/vehicles/${vehicle.id}`),
          },
        ],
      );
    } catch (error) {
      setFormError(getErrorMessage(error, 'Bilgiler kaydedilemedi.'));
    }
  });

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <FormProvider {...methods}>
          <VehicleFormFields />
        </FormProvider>
        {formError ? <Text style={styles.error}>{formError}</Text> : null}
        <Button
          title={createMutation.isPending ? 'Kaydediliyor...' : 'Araç Ekle'}
          loading={createMutation.isPending}
          onPress={onSubmit}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, gap: spacing.lg, paddingBottom: 40 },
  error: { ...typography.caption, color: colors.danger },
});
