import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Link } from 'expo-router';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button, Input } from '@/components/ui';
import { useAuth } from '@/features/auth';
import {
  forgotPasswordSchema,
  type ForgotPasswordFormValues,
} from '@/features/auth/schemas';
import { getErrorMessage } from '@/utils/errors';
import { colors, spacing, typography } from '@/theme';

export default function ForgotPasswordScreen() {
  const { resetPassword } = useAuth();
  const [success, setSuccess] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ForgotPasswordFormValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: '' },
  });

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    setSuccess(false);
    try {
      await resetPassword(values.email);
      setSuccess(true);
    } catch (error) {
      setFormError(
        getErrorMessage(error, 'Şifre sıfırlama isteği gönderilemedi.'),
      );
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
        <View style={styles.brand}>
          <Text style={styles.title}>Şifremi Unuttum</Text>
          <Text style={styles.subtitle}>
            E-posta adresinize şifre sıfırlama bağlantısı göndereceğiz.
          </Text>
        </View>

        <View style={styles.form}>
          <Controller
            control={control}
            name="email"
            render={({ field: { onChange, onBlur, value } }) => (
              <Input
                label="E-posta"
                autoCapitalize="none"
                keyboardType="email-address"
                autoComplete="email"
                value={value}
                onBlur={onBlur}
                onChangeText={onChange}
                error={errors.email?.message}
                placeholder="ornek@firma.com"
              />
            )}
          />

          {formError ? <Text style={styles.error}>{formError}</Text> : null}
          {success ? (
            <Text style={styles.success}>
              Şifre sıfırlama bağlantısı e-posta adresinize gönderildi.
            </Text>
          ) : null}

          <Button
            title={isSubmitting ? 'Gönderiliyor...' : 'Bağlantı Gönder'}
            loading={isSubmitting}
            onPress={onSubmit}
          />

          <Link href="/(auth)/login" asChild>
            <Button title="Giriş ekranına dön" variant="ghost" />
          </Link>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  content: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: spacing.xxl,
    gap: spacing.xxl,
  },
  brand: { gap: spacing.sm },
  title: {
    ...typography.title,
    color: colors.text,
  },
  subtitle: {
    ...typography.body,
    color: colors.textSecondary,
  },
  form: { gap: spacing.lg },
  error: {
    ...typography.caption,
    color: colors.danger,
  },
  success: {
    ...typography.body,
    color: colors.success,
  },
});
