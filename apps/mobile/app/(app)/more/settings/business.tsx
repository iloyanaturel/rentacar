import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Image, ScrollView, StyleSheet, Text, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Button, Input } from '@/components/ui';
import { useAuth } from '@/features/auth';
import {
  useUpdateBusinessProfile,
  useUploadLogo,
} from '@/features/settings';
import { getErrorMessage } from '@/utils/errors';
import { colors, radius, spacing, typography } from '@/theme';

export default function BusinessSettingsScreen() {
  const { organization } = useAuth();
  const update = useUpdateBusinessProfile();
  const uploadLogo = useUploadLogo();

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [website, setWebsite] = useState('');
  const [address, setAddress] = useState('');
  const [taxOffice, setTaxOffice] = useState('');
  const [taxNumber, setTaxNumber] = useState('');

  useEffect(() => {
    if (!organization) return;
    setName(organization.name ?? '');
    setPhone(organization.phone ?? '');
    setEmail(organization.email ?? '');
    setWebsite((organization as { website?: string | null }).website ?? '');
    setAddress(organization.address ?? '');
    setTaxOffice((organization as { tax_office?: string | null }).tax_office ?? '');
    setTaxNumber((organization as { tax_number?: string | null }).tax_number ?? '');
  }, [organization]);

  if (!organization) {
    return (
      <View style={[styles.screen, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  const save = () => {
    void update
      .mutateAsync({
        name,
        phone,
        email,
        website,
        address,
        tax_office: taxOffice,
        tax_number: taxNumber,
      })
      .then(() => Alert.alert('Kaydedildi', 'İşletme bilgileri güncellendi.'))
      .catch((e: unknown) =>
        Alert.alert('Hata', getErrorMessage(e, 'Kaydedilemedi.')),
      );
  };

  const pickLogo = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.9,
    });
    if (result.canceled || !result.assets[0]?.uri) return;
    try {
      await uploadLogo.mutateAsync(result.assets[0].uri);
      Alert.alert('Kaydedildi', 'Logo yüklendi.');
    } catch (e) {
      Alert.alert('Hata', getErrorMessage(e, 'Logo yüklenemedi.'));
    }
  };

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.hint}>
        Logo PDF, sözleşme ve raporlarda kullanılabilir.
      </Text>

      <View style={styles.logoRow}>
        {organization.logo_url ? (
          <Image source={{ uri: organization.logo_url }} style={styles.logo} />
        ) : (
          <View style={[styles.logo, styles.logoPlaceholder]}>
            <Text style={styles.logoPlaceholderText}>Logo</Text>
          </View>
        )}
        <Button
          title="Logo Yükle"
          variant="secondary"
          onPress={() => void pickLogo()}
          loading={uploadLogo.isPending}
        />
      </View>

      <Input label="İşletme Adı" value={name} onChangeText={setName} />
      <Input label="Telefon" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
      <Input
        label="E-posta"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
      />
      <Input label="Web sitesi" value={website} onChangeText={setWebsite} autoCapitalize="none" />
      <Input label="Adres" value={address} onChangeText={setAddress} multiline />
      <Input label="Vergi Dairesi" value={taxOffice} onChangeText={setTaxOffice} />
      <Input label="Vergi Numarası" value={taxNumber} onChangeText={setTaxNumber} />

      <Button title="Kaydet" onPress={save} loading={update.isPending} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, gap: spacing.md },
  hint: { ...typography.caption, color: colors.textSecondary },
  logoRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  logo: {
    width: 72,
    height: 72,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
  },
  logoPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  logoPlaceholderText: { ...typography.caption, color: colors.textMuted },
});
