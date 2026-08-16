import { useEffect, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button, ErrorState, Input, LoadingSkeleton } from '@/components/ui';
import { DateField } from '@/features/vehicles/DateField';
import { useCustomer, useUpdateCustomer } from '@/features/customers/hooks';
import {
  customerFormSchema,
  normalizePhone,
  type CustomerFormValues,
} from '@/features/customers/schemas';
import { isoToTrDate, trDateToIso } from '@/features/vehicles/schemas';
import { getErrorMessage } from '@/utils/errors';
import { colors, spacing, typography } from '@/theme';

export default function EditCustomerScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const customerQuery = useCustomer(id);
  const updateMutation = useUpdateCustomer(id);
  const [formError, setFormError] = useState<string | null>(null);

  const { control, handleSubmit, reset, formState: { errors, isSubmitting } } =
    useForm<CustomerFormValues>({
      resolver: zodResolver(customerFormSchema),
      defaultValues: {
        first_name: '',
        last_name: '',
        phone: '',
      },
    });

  useEffect(() => {
    if (!customerQuery.data) return;
    const c = customerQuery.data;
    reset({
      first_name: c.first_name,
      last_name: c.last_name,
      phone: c.phone ?? '',
      email: c.email ?? '',
      birth_date: isoToTrDate(c.birth_date),
      national_id: c.national_id ?? '',
      license_number: c.license_number ?? '',
      license_expiry: isoToTrDate(c.license_expiry),
      address: c.address ?? '',
      notes: c.notes ?? '',
    });
  }, [customerQuery.data, reset]);

  if (customerQuery.isLoading) {
    return (
      <ScrollView contentContainerStyle={styles.content}>
        <LoadingSkeleton height={240} />
      </ScrollView>
    );
  }

  if (customerQuery.isError || !customerQuery.data) {
    return (
      <ErrorState
        message="Müşteri bilgileri yüklenemedi."
        onRetry={() => void customerQuery.refetch()}
      />
    );
  }

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    try {
      await updateMutation.mutateAsync({
        first_name: values.first_name.trim(),
        last_name: values.last_name.trim(),
        phone: normalizePhone(values.phone),
        email: values.email?.trim() || null,
        birth_date: trDateToIso(values.birth_date),
        national_id: values.national_id?.trim() || null,
        license_number: values.license_number?.trim() || null,
        license_expiry: trDateToIso(values.license_expiry),
        address: values.address?.trim() || null,
        notes: values.notes?.trim() || null,
      });
      Alert.alert('Başarılı', 'Müşteri güncellendi.', [
        { text: 'Tamam', onPress: () => router.back() },
      ]);
    } catch (error) {
      setFormError(getErrorMessage(error, 'Müşteri güncellenemedi.'));
    }
  });

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Controller
          control={control}
          name="first_name"
          render={({ field: { onChange, onBlur, value } }) => (
            <Input label="Ad *" value={value} onBlur={onBlur} onChangeText={onChange} error={errors.first_name?.message} />
          )}
        />
        <Controller
          control={control}
          name="last_name"
          render={({ field: { onChange, onBlur, value } }) => (
            <Input label="Soyad *" value={value} onBlur={onBlur} onChangeText={onChange} error={errors.last_name?.message} />
          )}
        />
        <Controller
          control={control}
          name="phone"
          render={({ field: { onChange, onBlur, value } }) => (
            <Input label="Telefon *" keyboardType="phone-pad" value={value} onBlur={onBlur} onChangeText={onChange} error={errors.phone?.message} />
          )}
        />
        <Controller
          control={control}
          name="email"
          render={({ field: { onChange, onBlur, value } }) => (
            <Input label="E-posta" autoCapitalize="none" value={value ?? ''} onBlur={onBlur} onChangeText={onChange} error={errors.email?.message} />
          )}
        />
        <Controller
          control={control}
          name="birth_date"
          render={({ field: { onChange, value } }) => (
            <DateField label="Doğum tarihi" value={value} onChange={onChange} />
          )}
        />
        <Controller
          control={control}
          name="national_id"
          render={({ field: { onChange, onBlur, value } }) => (
            <Input label="TC Kimlik No" keyboardType="number-pad" value={value ?? ''} onBlur={onBlur} onChangeText={onChange} error={errors.national_id?.message} />
          )}
        />
        <Controller
          control={control}
          name="license_number"
          render={({ field: { onChange, onBlur, value } }) => (
            <Input label="Ehliyet No" value={value ?? ''} onBlur={onBlur} onChangeText={onChange} />
          )}
        />
        <Controller
          control={control}
          name="license_expiry"
          render={({ field: { onChange, value } }) => (
            <DateField label="Ehliyet geçerlilik" value={value} onChange={onChange} />
          )}
        />
        <Controller
          control={control}
          name="address"
          render={({ field: { onChange, onBlur, value } }) => (
            <Input label="Adres" value={value ?? ''} onBlur={onBlur} onChangeText={onChange} multiline style={{ minHeight: 80, textAlignVertical: 'top' }} />
          )}
        />
        <Controller
          control={control}
          name="notes"
          render={({ field: { onChange, onBlur, value } }) => (
            <Input label="Not" value={value ?? ''} onBlur={onBlur} onChangeText={onChange} multiline style={{ minHeight: 80, textAlignVertical: 'top' }} />
          )}
        />
        {formError ? <Text style={styles.error}>{formError}</Text> : null}
        <Button
          title={isSubmitting || updateMutation.isPending ? 'Kaydediliyor...' : 'Kaydet'}
          loading={isSubmitting || updateMutation.isPending}
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
