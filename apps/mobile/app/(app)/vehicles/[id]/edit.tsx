import { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { FormProvider, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button, ErrorState, LoadingSkeleton } from '@/components/ui';
import { VehicleFormFields } from '@/features/vehicles/VehicleFormFields';
import { useUpdateVehicle, useVehicle } from '@/features/vehicles/hooks';
import {
  isoToTrDate,
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
import { useEffect } from 'react';

export default function EditVehicleScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const vehicleQuery = useVehicle(id);
  const updateMutation = useUpdateVehicle(id);
  const [formError, setFormError] = useState<string | null>(null);

  const methods = useForm<VehicleFormValues>({
    resolver: zodResolver(vehicleFormSchema),
    defaultValues: {
      brand: '',
      model: '',
      plate: '',
      daily_price: '',
    },
  });

  useEffect(() => {
    if (!vehicleQuery.data) return;
    const v = vehicleQuery.data;
    methods.reset({
      brand: v.brand,
      model: v.model,
      model_year: v.model_year ? String(v.model_year) : '',
      plate: v.plate,
      color: v.color ?? '',
      fuel_type: v.fuel_type ?? '',
      transmission: v.transmission ?? '',
      current_km: String(v.current_km ?? 0),
      daily_price: String(v.daily_price ?? ''),
      deposit_amount: String(v.deposit_amount ?? ''),
      insurance_expiry: isoToTrDate(v.insurance_expiry),
      casco_expiry: isoToTrDate(v.casco_expiry),
      inspection_expiry: isoToTrDate(v.inspection_expiry),
      notes: v.notes ?? '',
    });
  }, [vehicleQuery.data, methods]);

  if (vehicleQuery.isLoading) {
    return (
      <ScrollView contentContainerStyle={styles.content}>
        <LoadingSkeleton height={40} />
        <LoadingSkeleton height={240} style={{ marginTop: 12 }} />
      </ScrollView>
    );
  }

  if (vehicleQuery.isError || !vehicleQuery.data) {
    return (
      <ErrorState
        message="Aracın bilgileri yüklenemedi."
        onRetry={() => void vehicleQuery.refetch()}
      />
    );
  }

  const onSubmit = methods.handleSubmit(async (values) => {
    setFormError(null);
    try {
      const vehicle = await updateMutation.mutateAsync({
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
      });

      Alert.alert('Başarılı', `${vehicle.brand} ${vehicle.model} güncellendi.`, [
        { text: 'Tamam', onPress: () => router.back() },
      ]);
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
          title={updateMutation.isPending ? 'Kaydediliyor...' : 'Kaydet'}
          loading={updateMutation.isPending}
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
