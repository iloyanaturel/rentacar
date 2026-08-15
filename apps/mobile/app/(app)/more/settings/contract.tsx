import { useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text } from 'react-native';
import { Button, ErrorState, Input, LoadingSkeleton } from '@/components/ui';
import {
  useOrganizationSettings,
  usePermissions,
  useUpdateOrganizationSettings,
} from '@/features/settings';
import { getErrorMessage } from '@/utils/errors';
import { colors, spacing, typography } from '@/theme';

export default function ContractSettingsScreen() {
  const { can } = usePermissions();
  const settings = useOrganizationSettings();
  const update = useUpdateOrganizationSettings();
  const [title, setTitle] = useState('');
  const [footer, setFooter] = useState('');
  const [body, setBody] = useState('');

  useEffect(() => {
    const s = settings.data;
    if (!s) return;
    setTitle(s.contract_title ?? '');
    setFooter(s.contract_footer ?? '');
    setBody(s.contract_body ?? '');
  }, [settings.data]);

  if (!can('settings.update')) {
    return <ErrorState message="Bu işlem için yetkiniz bulunmuyor." />;
  }
  if (settings.isLoading) return <LoadingSkeleton />;

  const save = () => {
    void update
      .mutateAsync({
        contract_title: title,
        contract_footer: footer,
        contract_body: body,
      })
      .then(() =>
        Alert.alert(
          'Kaydedildi',
          'Yeni kiralamalar sözleşme metnini snapshot olarak saklar.',
        ),
      )
      .catch((e: unknown) =>
        Alert.alert('Hata', getErrorMessage(e, 'Kaydedilemedi.')),
      );
  };

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.hint}>
        İmza alanları PDF şablonunda gösterilir. Geçmiş kiralama PDF’leri oluşturma
        anındaki metni korur.
      </Text>
      <Input label="Sözleşme başlığı" value={title} onChangeText={setTitle} />
      <Input
        label="Sözleşme metni"
        value={body}
        onChangeText={setBody}
        multiline
      />
      <Input label="Footer" value={footer} onChangeText={setFooter} multiline />
      <Button title="Kaydet" onPress={save} loading={update.isPending} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, gap: spacing.md },
  hint: { ...typography.caption, color: colors.textSecondary },
});
