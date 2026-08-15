import { useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Button, Card, Input } from '@/components/ui';
import { useAuth } from '@/features/auth';
import { useUpdateProfile } from '@/features/settings';
import { settingsService } from '@/services/settingsService';
import { roleLabel } from '@/utils/labels';
import { getErrorMessage } from '@/utils/errors';
import { colors, spacing, typography } from '@/theme';

export default function ProfileScreen() {
  const { profile, organization, user, role, refreshProfile } = useAuth();
  const updateProfile = useUpdateProfile();

  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [emailChange, setEmailChange] = useState('');

  useEffect(() => {
    setFullName(profile?.full_name ?? '');
    setPhone(profile?.phone ?? '');
  }, [profile]);

  const save = () => {
    const parts = fullName.trim();
    void updateProfile
      .mutateAsync({ full_name: parts, phone: phone || null })
      .then(() => Alert.alert('Kaydedildi', 'Profil güncellendi.'))
      .catch((e: unknown) =>
        Alert.alert('Hata', getErrorMessage(e, 'Profil güncellenemedi.')),
      );
  };

  const changeEmail = () => {
    if (!emailChange.trim()) return;
    Alert.alert(
      'E-posta değiştir',
      'Doğrulama e-postası gönderilecek. Mevcut e-posta doğrulanana kadar hesap etkilenmeyebilir.',
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'Devam',
          onPress: () =>
            void settingsService
              .requestEmailChange(emailChange)
              .then(() => {
                setEmailChange('');
                Alert.alert(
                  'Doğrulama gönderildi',
                  'Yeni e-posta adresinizi doğrulayın.',
                );
                void refreshProfile();
              })
              .catch((e: unknown) =>
                Alert.alert('Hata', getErrorMessage(e, 'E-posta değiştirilemedi.')),
              ),
        },
      ],
    );
  };

  const emailVerified = Boolean(user?.email_confirmed_at);

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      {!emailVerified ? (
        <View style={styles.warn}>
          <Text style={styles.warnText}>
            E-posta adresiniz henüz doğrulanmamış. Lütfen gelen kutunuzu kontrol
            edin.
          </Text>
        </View>
      ) : null}

      <Card style={styles.card}>
        <Input label="Ad Soyad" value={fullName} onChangeText={setFullName} />
        <Input
          label="Telefon"
          value={phone}
          onChangeText={setPhone}
          keyboardType="phone-pad"
        />
        <Text style={styles.label}>E-posta (okuma)</Text>
        <Text style={styles.value}>{user?.email ?? '—'}</Text>
        <Text style={styles.label}>Rol</Text>
        <Text style={styles.value}>{role ? roleLabel(role) : '—'}</Text>
        <Text style={styles.label}>Firma</Text>
        <Text style={styles.value}>{organization?.name ?? '—'}</Text>
        <Button
          title="Profili Kaydet"
          onPress={save}
          loading={updateProfile.isPending}
        />
      </Card>

      <Card style={styles.card}>
        <Text style={styles.section}>E-posta değiştir</Text>
        <Text style={styles.hint}>
          Güvenli Auth e-posta değişikliği kullanılır; şifre veritabanında
          saklanmaz.
        </Text>
        <Input
          label="Yeni e-posta"
          value={emailChange}
          onChangeText={setEmailChange}
          autoCapitalize="none"
          keyboardType="email-address"
        />
        <Button title="Doğrulama Gönder" variant="secondary" onPress={changeEmail} />
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, gap: spacing.lg },
  card: { gap: spacing.md },
  label: { ...typography.caption, color: colors.textMuted },
  value: { ...typography.bodyMedium, color: colors.text },
  section: { ...typography.subtitle, color: colors.text },
  hint: { ...typography.caption, color: colors.textSecondary },
  warn: {
    backgroundColor: colors.warningSoft,
    padding: spacing.md,
    borderRadius: 12,
  },
  warnText: { ...typography.caption, color: colors.warning },
});
