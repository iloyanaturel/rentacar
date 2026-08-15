import { useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Button } from '@/components/ui';
import { APP_NAME, APP_VERSION } from '@/config/app';
import { setLocale, useI18n, type Locale } from '@/i18n';
import { colors, spacing, typography } from '@/theme';

const THEME_KEY = 'rentaflow.theme';

export default function AppSettingsScreen() {
  const { locale, t } = useI18n();
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  useEffect(() => {
    void AsyncStorage.getItem(THEME_KEY).then((v) => {
      if (v === 'dark' || v === 'light') setTheme(v);
    });
  }, []);

  const saveTheme = (next: 'light' | 'dark') => {
    setTheme(next);
    void AsyncStorage.setItem(THEME_KEY, next);
    Alert.alert(
      'Tema',
      next === 'dark'
        ? 'Karanlık tema tercihi kaydedildi. Tam dark UI sonraki sürümde genişletilecek.'
        : 'Açık tema tercihi kaydedildi.',
    );
  };

  const changeLocale = (next: Locale) => {
    setLocale(next);
    Alert.alert('Dil', next === 'tr' ? 'Türkçe seçildi.' : 'English selected.');
  };

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.brand}>{APP_NAME}</Text>
      <Text style={styles.version}>Version {APP_VERSION}</Text>

      <Text style={styles.section}>{t('settings.app')} — Dil</Text>
      <View style={styles.row}>
        <Button
          title="Türkçe"
          variant={locale === 'tr' ? 'primary' : 'secondary'}
          onPress={() => changeLocale('tr')}
        />
        <Button
          title="English"
          variant={locale === 'en' ? 'primary' : 'secondary'}
          onPress={() => changeLocale('en')}
        />
      </View>

      <Text style={styles.section}>Tema</Text>
      <View style={styles.row}>
        <Button
          title="Açık"
          variant={theme === 'light' ? 'primary' : 'secondary'}
          onPress={() => saveTheme('light')}
        />
        <Button
          title="Koyu"
          variant={theme === 'dark' ? 'primary' : 'secondary'}
          onPress={() => saveTheme('dark')}
        />
      </View>

      <Text style={styles.hint}>
        Para birimi işletme finans ayarlarından yönetilir. Bildirimler ayrı
        menüdedir.
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, gap: spacing.md },
  brand: { ...typography.hero, color: colors.primary },
  version: { ...typography.body, color: colors.textSecondary },
  section: { ...typography.label, color: colors.textMuted, marginTop: spacing.sm },
  row: { flexDirection: 'row', gap: spacing.sm },
  hint: { ...typography.caption, color: colors.textMuted },
});
