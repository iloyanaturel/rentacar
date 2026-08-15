import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import { Link } from 'expo-router';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Button, Input } from '@/components/ui';
import { useAuth } from '@/features/auth';
import {
  loginSchema,
  type LoginFormValues,
} from '@/features/auth/schemas';
import { getErrorMessage } from '@/utils/errors';
import { colors, spacing, typography } from '@/theme';

const REMEMBER_KEY = 'rentaflow.remember_session';

export default function LoginScreen() {
  const { signIn, isConfigured } = useAuth();
  const [formError, setFormError] = useState<string | null>(null);
  const [remember, setRemember] = useState(true);

  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    try {
      await AsyncStorage.setItem(REMEMBER_KEY, remember ? '1' : '0');
      await signIn(values.email, values.password);
    } catch (error) {
      setFormError(
        getErrorMessage(error, 'Girdiğiniz e-posta veya şifre hatalı.'),
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
          <Text style={styles.logo}>RentaFlow</Text>
          <Text style={styles.title}>Hoş Geldiniz</Text>
          <Text style={styles.subtitle}>
            Rent a car işletmenizi kolayca yönetin.
          </Text>
        </View>

        {!isConfigured ? (
          <View style={styles.warnBox}>
            <Text style={styles.warnText}>
              Supabase bağlantısı yapılandırılmamış. `.env` içine
              EXPO_PUBLIC_SUPABASE_URL ve EXPO_PUBLIC_SUPABASE_ANON_KEY ekleyin.
            </Text>
          </View>
        ) : null}

        <View style={styles.form}>
          <Controller
            control={control}
            name="email"
            render={({ field: { onChange, onBlur, value } }) => (
              <Input
                label="E-posta"
                autoCapitalize="none"
                autoComplete="email"
                keyboardType="email-address"
                textContentType="emailAddress"
                value={value}
                onBlur={onBlur}
                onChangeText={onChange}
                error={errors.email?.message}
                placeholder="ornek@firma.com"
              />
            )}
          />
          <Controller
            control={control}
            name="password"
            render={({ field: { onChange, onBlur, value } }) => (
              <Input
                label="Şifre"
                secureTextEntry
                autoComplete="password"
                textContentType="password"
                value={value}
                onBlur={onBlur}
                onChangeText={onChange}
                error={errors.password?.message}
                placeholder="••••••••"
              />
            )}
          />

          <View style={styles.rememberRow}>
            <Text style={styles.rememberLabel}>Oturumu hatırla</Text>
            <Switch
              value={remember}
              onValueChange={setRemember}
              trackColor={{ true: colors.primary, false: colors.border }}
            />
          </View>

          {formError ? <Text style={styles.error}>{formError}</Text> : null}

          <Button
            title={isSubmitting ? 'Giriş Yapılıyor...' : 'Giriş Yap'}
            loading={isSubmitting}
            onPress={onSubmit}
          />

          <Link href="/(auth)/forgot-password" asChild>
            <Button title="Şifremi Unuttum" variant="ghost" />
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
  logo: {
    ...typography.hero,
    color: colors.primary,
  },
  title: {
    ...typography.title,
    color: colors.text,
  },
  subtitle: {
    ...typography.body,
    color: colors.textSecondary,
  },
  form: { gap: spacing.lg },
  rememberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  rememberLabel: { ...typography.body, color: colors.text },
  error: {
    ...typography.caption,
    color: colors.danger,
  },
  warnBox: {
    backgroundColor: colors.warningSoft,
    padding: spacing.lg,
    borderRadius: 12,
  },
  warnText: {
    ...typography.caption,
    color: colors.warning,
  },
});
