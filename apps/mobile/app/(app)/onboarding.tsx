import { useEffect, useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Button, ScreenHeader } from '@/components/ui';
import {
  useOnboardingStatus,
  usePermissions,
  useUpdateOrganizationSettings,
  useUpdateBusinessProfile,
} from '@/features/settings';
import { useAuth } from '@/features/auth';
import { Input } from '@/components/ui';
import { getErrorMessage } from '@/utils/errors';
import { colors, radius, spacing, typography } from '@/theme';

const STEPS = [
  { key: 'business', label: 'İşletme bilgileri' },
  { key: 'vehicle', label: 'İlk araç' },
  { key: 'user', label: 'İlk kullanıcı/çalışan' },
  { key: 'rental_settings', label: 'Varsayılan kiralama ayarları' },
] as const;

export default function OnboardingScreen() {
  const router = useRouter();
  const { organization } = useAuth();
  const { can } = usePermissions();
  const status = useOnboardingStatus();
  const updateBusiness = useUpdateBusinessProfile();
  const updateSettings = useUpdateOrganizationSettings();

  const [step, setStep] = useState(0);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');

  useEffect(() => {
    setName(organization?.name ?? '');
    setPhone(organization?.phone ?? '');
  }, [organization]);

  const data = status.data;
  const percent = data?.percent ?? 0;

  const markComplete = () => {
    void updateSettings
      .mutateAsync({ onboarding_completed: true })
      .then(() => {
        Alert.alert('Tamamlandı', 'Kurulum bitti. İyi çalışmalar!');
        router.replace('/(app)/dashboard');
      })
      .catch((e: unknown) =>
        Alert.alert('Hata', getErrorMessage(e, 'Kaydedilemedi.')),
      );
  };

  if (!can('settings.update')) {
    return (
      <View style={styles.screen}>
        <Text style={styles.body}>
          Kurulum yalnızca yönetici tarafından tamamlanabilir.
        </Text>
        <Button title="Ana sayfaya dön" onPress={() => router.replace('/(app)/dashboard')} />
      </View>
    );
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <ScreenHeader title="Kuruluma Hoş Geldiniz" subtitle={`%${percent} tamamlandı`} />

      <View style={styles.progress}>
        {STEPS.map((s) => {
          const done = Boolean(
            data?.[s.key as keyof typeof data],
          );
          return (
            <Text key={s.key} style={[styles.step, done && styles.stepDone]}>
              {done ? '✓ ' : '○ '}
              {s.label}
            </Text>
          );
        })}
      </View>

      {step === 0 ? (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>1. İşletme bilgileri</Text>
          <Input label="İşletme adı" value={name} onChangeText={setName} />
          <Input label="Telefon" value={phone} onChangeText={setPhone} />
          <Button
            title="Kaydet ve devam"
            loading={updateBusiness.isPending}
            onPress={() =>
              void updateBusiness
                .mutateAsync({ name, phone })
                .then(() => setStep(1))
                .catch((e: unknown) =>
                  Alert.alert('Hata', getErrorMessage(e, 'Kaydedilemedi.')),
                )
            }
          />
        </View>
      ) : null}

      {step === 1 ? (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>2. İlk araç</Text>
          <Text style={styles.body}>
            Filoya ilk aracınızı ekleyin. Plaka, marka ve günlük fiyat yeterlidir.
          </Text>
          <Button
            title="+ İlk Aracını Ekle"
            onPress={() => router.push('/(app)/vehicles/create')}
          />
          <Button title="Sonra / Devam" variant="ghost" onPress={() => setStep(2)} />
        </View>
      ) : null}

      {step === 2 ? (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>3. İlk kullanıcı</Text>
          <Text style={styles.body}>
            İsterseniz ekip üyesi davet edin. Tek başınıza kullanacaksanız atlayabilirsiniz.
          </Text>
          <Button
            title="Kullanıcı Davet Et"
            onPress={() => router.push('/(app)/more/settings/users')}
          />
          <Button title="Atla / Devam" variant="ghost" onPress={() => setStep(3)} />
        </View>
      ) : null}

      {step === 3 ? (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>4. Kiralama ayarları</Text>
          <Text style={styles.body}>
            Depozito, km limiti ve geç teslim varsayılanlarını ayarlayın.
          </Text>
          <Button
            title="Kiralama Ayarları"
            onPress={() => router.push('/(app)/more/settings/rental')}
          />
          <Button title="Devam" variant="ghost" onPress={() => setStep(4)} />
        </View>
      ) : null}

      {step === 4 ? (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>5. Tamamlandı</Text>
          <Text style={styles.body}>
            Artık müşteri ekleyip kiralama oluşturabilirsiniz.
          </Text>
          <Button title="Kurulumu Bitir" onPress={markComplete} />
        </View>
      ) : null}

      <Pressable onPress={() => router.replace('/(app)/dashboard')}>
        <Text style={styles.skip}>Şimdilik atla</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, gap: spacing.md },
  progress: { gap: 6 },
  step: { ...typography.body, color: colors.textMuted },
  stepDone: { color: colors.primary },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: spacing.md,
  },
  cardTitle: { ...typography.subtitle, color: colors.text },
  body: { ...typography.body, color: colors.textSecondary },
  skip: {
    ...typography.label,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: spacing.lg,
  },
});
