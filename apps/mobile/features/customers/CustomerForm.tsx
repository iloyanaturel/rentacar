import { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button, Input } from '@/components/ui';
import { DateField } from '@/features/vehicles/DateField';
import { useCreateCustomer } from '@/features/customers/hooks';
import {
  customerFormSchema,
  normalizePhone,
  type CustomerFormValues,
} from '@/features/customers/schemas';
import { trDateToIso } from '@/features/vehicles/schemas';
import { getErrorMessage } from '@/utils/errors';
import { getExpiryStatus } from '@/utils/expiry';
import { colors, spacing, typography } from '@/theme';

type Props = {
  onCreated?: (customerId: string) => void;
};

export function CustomerForm({ onCreated }: Props) {
  const router = useRouter();
  const createMutation = useCreateCustomer();
  const [formError, setFormError] = useState<string | null>(null);
  const [licenseWarning, setLicenseWarning] = useState<string | null>(null);

  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<CustomerFormValues>({
    resolver: zodResolver(customerFormSchema),
    defaultValues: {
      first_name: '',
      last_name: '',
      phone: '',
      email: '',
      birth_date: '',
      national_id: '',
      license_number: '',
      license_expiry: '',
      address: '',
      notes: '',
    },
  });

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    const expiryIso = trDateToIso(values.license_expiry);
    if (expiryIso) {
      const status = getExpiryStatus(expiryIso);
      setLicenseWarning(
        status.level === 'expired'
          ? 'Ehliyet geçerlilik tarihi geçmiş görünüyor.'
          : null,
      );
    }

    try {
      const customer = await createMutation.mutateAsync({
        first_name: values.first_name.trim(),
        last_name: values.last_name.trim(),
        phone: normalizePhone(values.phone),
        email: values.email?.trim() || null,
        birth_date: trDateToIso(values.birth_date),
        national_id: values.national_id?.trim() || null,
        license_number: values.license_number?.trim() || null,
        license_expiry: expiryIso,
        address: values.address?.trim() || null,
        notes: values.notes?.trim() || null,
        is_active: true,
      });

      if (onCreated) {
        onCreated(customer.id);
        return;
      }

      Alert.alert(
        'Başarılı',
        `${customer.first_name} ${customer.last_name} eklendi.`,
        [
          {
            text: 'Tamam',
            onPress: () => router.replace(`/(app)/customers/${customer.id}`),
          },
        ],
      );
    } catch (error) {
      setFormError(getErrorMessage(error, 'Bu müşteri kaydedilemedi.'));
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
        <Text style={styles.section}>Kişisel Bilgiler</Text>
        <Controller
          control={control}
          name="first_name"
          render={({ field: { onChange, onBlur, value } }) => (
            <Input
              label="Ad *"
              value={value}
              onBlur={onBlur}
              onChangeText={onChange}
              error={errors.first_name?.message}
            />
          )}
        />
        <Controller
          control={control}
          name="last_name"
          render={({ field: { onChange, onBlur, value } }) => (
            <Input
              label="Soyad *"
              value={value}
              onBlur={onBlur}
              onChangeText={onChange}
              error={errors.last_name?.message}
            />
          )}
        />
        <Controller
          control={control}
          name="phone"
          render={({ field: { onChange, onBlur, value } }) => (
            <Input
              label="Telefon *"
              keyboardType="phone-pad"
              value={value}
              onBlur={onBlur}
              onChangeText={onChange}
              error={errors.phone?.message}
              placeholder="05xxxxxxxxx"
            />
          )}
        />
        <Controller
          control={control}
          name="email"
          render={({ field: { onChange, onBlur, value } }) => (
            <Input
              label="E-posta"
              keyboardType="email-address"
              autoCapitalize="none"
              value={value ?? ''}
              onBlur={onBlur}
              onChangeText={onChange}
              error={errors.email?.message}
            />
          )}
        />
        <Controller
          control={control}
          name="birth_date"
          render={({ field: { onChange, value } }) => (
            <DateField label="Doğum tarihi" value={value} onChange={onChange} />
          )}
        />

        <Text style={styles.section}>Kimlik / Ehliyet</Text>
        <Controller
          control={control}
          name="national_id"
          render={({ field: { onChange, onBlur, value } }) => (
            <Input
              label="TC Kimlik No"
              keyboardType="number-pad"
              value={value ?? ''}
              onBlur={onBlur}
              onChangeText={onChange}
              error={errors.national_id?.message}
            />
          )}
        />
        <Controller
          control={control}
          name="license_number"
          render={({ field: { onChange, onBlur, value } }) => (
            <Input
              label="Ehliyet No"
              value={value ?? ''}
              onBlur={onBlur}
              onChangeText={onChange}
            />
          )}
        />
        <Controller
          control={control}
          name="license_expiry"
          render={({ field: { onChange, value } }) => (
            <DateField
              label="Ehliyet geçerlilik tarihi"
              value={value}
              onChange={onChange}
            />
          )}
        />
        {licenseWarning ? <Text style={styles.warn}>{licenseWarning}</Text> : null}

        <Text style={styles.section}>Adres</Text>
        <Controller
          control={control}
          name="address"
          render={({ field: { onChange, onBlur, value } }) => (
            <Input
              label="Adres"
              value={value ?? ''}
              onBlur={onBlur}
              onChangeText={onChange}
              multiline
              style={{ minHeight: 80, textAlignVertical: 'top' }}
            />
          )}
        />

        <Text style={styles.section}>Not</Text>
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
              style={{ minHeight: 80, textAlignVertical: 'top' }}
            />
          )}
        />

        {formError ? <Text style={styles.error}>{formError}</Text> : null}
        <Button
          title={
            isSubmitting || createMutation.isPending
              ? 'Kaydediliyor...'
              : 'Müşteri Kaydet'
          }
          loading={isSubmitting || createMutation.isPending}
          onPress={onSubmit}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, gap: spacing.lg, paddingBottom: 40 },
  section: {
    ...typography.subtitle,
    color: colors.text,
    marginTop: spacing.sm,
  },
  error: { ...typography.caption, color: colors.danger },
  warn: { ...typography.caption, color: colors.warning },
});
