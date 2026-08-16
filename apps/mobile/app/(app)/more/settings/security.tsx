import { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Button, Input } from '@/components/ui';
import { useAuth } from '@/features/auth';
import { useChangePassword } from '@/features/settings';
import { supabase } from '@/lib/supabase';
import { getErrorMessage } from '@/utils/errors';
import { colors, spacing, typography } from '@/theme';

export default function SecuritySettingsScreen() {
  const { user, signOut, session } = useAuth();
  const changePassword = useChangePassword();
  const [currentPassword, setCurrent] = useState('');
  const [newPassword, setNew] = useState('');
  const [confirm, setConfirm] = useState('');

  const onChangePassword = () => {
    if (newPassword.length < 8) {
      Alert.alert('Hata', 'Yeni şifre en az 8 karakter olmalı.');
      return;
    }
    if (newPassword !== confirm) {
      Alert.alert('Hata', 'Yeni şifreler eşleşmiyor.');
      return;
    }
    void changePassword
      .mutateAsync({ currentPassword, newPassword })
      .then(() => {
        setCurrent('');
        setNew('');
        setConfirm('');
        Alert.alert('Başarılı', 'Şifreniz güncellendi.');
      })
      .catch((e: unknown) =>
        Alert.alert('Hata', getErrorMessage(e, 'Şifre güncellenemedi.')),
      );
  };

  const signOutAll = () => {
    Alert.alert(
      'Tüm oturumları kapat',
      'Bu cihazda ve diğer oturumlarda çıkış yapılır (global scope).',
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'Çıkış Yap',
          style: 'destructive',
          onPress: () => {
            void (async () => {
              try {
                await supabase.auth.signOut({ scope: 'global' });
                await signOut();
              } catch (e) {
                Alert.alert('Hata', getErrorMessage(e, 'Çıkış yapılamadı.'));
              }
            })();
          },
        },
      ],
    );
  };

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.section}>Bu cihaz</Text>
      <View style={styles.card}>
        <Text style={styles.meta}>Oturum: {user?.email ?? '—'}</Text>
        <Text style={styles.meta}>
          Access token: {session?.access_token ? 'aktif' : 'yok'}
        </Text>
        <Button title="Bu oturumdan çıkış yap" variant="secondary" onPress={() => void signOut()} />
        <Button
          title="Tüm oturumlardan çıkış yap"
          variant="secondary"
          onPress={signOutAll}
        />
      </View>

      <Text style={styles.section}>Şifre Değiştir</Text>
      <Input
        label="Mevcut Şifre"
        secureTextEntry
        value={currentPassword}
        onChangeText={setCurrent}
      />
      <Input
        label="Yeni Şifre"
        secureTextEntry
        value={newPassword}
        onChangeText={setNew}
      />
      <Input
        label="Yeni Şifre Tekrar"
        secureTextEntry
        value={confirm}
        onChangeText={setConfirm}
      />
      <Button
        title="Şifreyi Güncelle"
        onPress={onChangePassword}
        loading={changePassword.isPending}
      />

      <Text style={styles.hint}>
        E-posta değişikliği Supabase Auth doğrulama akışı ile yapılır (Profil
        ekranı).
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, gap: spacing.md },
  section: { ...typography.label, color: colors.textMuted, marginTop: spacing.sm },
  card: {
    gap: spacing.sm,
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  meta: { ...typography.caption, color: colors.textSecondary },
  hint: { ...typography.caption, color: colors.textMuted },
});
