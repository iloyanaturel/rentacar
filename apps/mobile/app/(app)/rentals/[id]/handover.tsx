import { useMemo, useState } from 'react';
import {
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { Button, Input } from '@/components/ui';
import { useRental, useUploadRentalPhoto } from '@/features/rentals/hooks';
import { useCompleteHandover } from '@/features/operations/hooks';
import type { DamageDraft } from '@/services/handoverService';
import {
  DAMAGE_LOCATIONS,
  FUEL_LEVELS,
  PHOTO_CATEGORIES,
  damageSeverityLabel,
  type FuelLevel,
} from '@/utils/operations';
import { getErrorMessage } from '@/utils/errors';
import { colors, spacing, typography } from '@/theme';

type Step = 1 | 2 | 3 | 4 | 5 | 6 | 7;

export default function HandoverWizardScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const rentalQuery = useRental(id);
  const complete = useCompleteHandover(id);
  const uploadPhoto = useUploadRentalPhoto(id);

  const [step, setStep] = useState<Step>(1);
  const [km, setKm] = useState('');
  const [fuel, setFuel] = useState<FuelLevel>('FULL');
  const [damages, setDamages] = useState<DamageDraft[]>([]);
  const [photoIds, setPhotoIds] = useState<string[]>([]);
  const [photoPreviews, setPhotoPreviews] = useState<string[]>([]);
  const [ackName, setAckName] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);

  // damage draft form
  const [sev, setSev] = useState<'MINOR' | 'MODERATE' | 'MAJOR'>('MINOR');
  const [loc, setLoc] = useState(DAMAGE_LOCATIONS[0].key);
  const [desc, setDesc] = useState('');
  const [est, setEst] = useState('0');

  const vehicleKm = useMemo(() => {
    // Prefer rental start_km if set else we'll validate server-side against vehicle
    return Number(rentalQuery.data?.start_km ?? 0);
  }, [rentalQuery.data]);

  const addDamage = () => {
    const location = DAMAGE_LOCATIONS.find((l) => l.key === loc);
    setDamages((prev) => [
      ...prev,
      {
        severity: sev,
        location_key: loc,
        location_label: location?.label,
        description: desc.trim() || undefined,
        estimated_amount: Number(est) || 0,
      },
    ]);
    setDesc('');
    setEst('0');
  };

  const pickPhoto = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('İzin gerekli', 'Fotoğraf seçmek için galeri izni verin.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 1,
    });
    if (result.canceled || !result.assets[0]?.uri) return;
    try {
      const photo = await uploadPhoto.mutateAsync({
        uri: result.assets[0].uri,
        type: 'PICKUP',
        category: 'OTHER',
      });
      setPhotoIds((p) => [...p, photo.id]);
      setPhotoPreviews((p) => [...p, result.assets[0].uri]);
    } catch (e) {
      Alert.alert('Hata', getErrorMessage(e, 'Fotoğraf yüklenemedi.'));
    }
  };

  const submit = async () => {
    setError(null);
    const odometer = Number(km);
    if (!(odometer >= 0)) {
      setError('Geçerli bir kilometre giriniz.');
      return;
    }
    if (!confirmed) {
      setError('Teslim tamamlanmadan önce kontrol onayı gereklidir.');
      return;
    }
    try {
      await complete.mutateAsync({
        rentalId: id,
        odometerKm: odometer,
        fuelLevel: fuel,
        checklistConfirmed: true,
        customerAckName: ackName.trim() || undefined,
        notes: notes.trim() || undefined,
        damages,
        photoIds,
      });
      Alert.alert('Başarılı', 'Araç teslim edildi.', [
        { text: 'Tamam', onPress: () => router.replace(`/(app)/rentals/${id}`) },
      ]);
    } catch (e) {
      setError(getErrorMessage(e, 'Teslim tamamlanamadı.'));
    }
  };

  return (
    <View style={styles.flex}>
      <View style={styles.progress}>
        {[1, 2, 3, 4, 5, 6, 7].map((n) => (
          <View key={n} style={[styles.dot, step >= n && styles.dotActive]} />
        ))}
      </View>
      <Text style={styles.stepTitle}>
        {step === 1 && '1. Araç kontrolü'}
        {step === 2 && '2. Kilometre'}
        {step === 3 && '3. Yakıt'}
        {step === 4 && '4. Hasar'}
        {step === 5 && '5. Fotoğraflar'}
        {step === 6 && '6. Onay'}
        {step === 7 && '7. Teslimi Tamamla'}
      </Text>

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {step === 1 ? (
          <Text style={styles.body}>
            Araç dış ve iç yüzeylerini kontrol edin. Mevcut hasarları sonraki
            adımlarda kaydedebilirsiniz. Plaka:{' '}
            {rentalQuery.data?.vehicle_plate ?? '—'}
          </Text>
        ) : null}

        {step === 2 ? (
          <View style={styles.gap}>
            <Text style={styles.meta}>
              Referans KM (kiralama): {vehicleKm || '—'}
            </Text>
            <Input
              label="Teslim kilometresi *"
              keyboardType="number-pad"
              value={km}
              onChangeText={setKm}
            />
            <Text style={styles.hint}>
              Mevcut araç kilometresinden küçük olamaz.
            </Text>
          </View>
        ) : null}

        {step === 3 ? (
          <View style={styles.chips}>
            {FUEL_LEVELS.map((f) => (
              <Pressable
                key={f.value}
                onPress={() => setFuel(f.value)}
                style={[styles.chip, fuel === f.value && styles.chipActive]}
              >
                <Text
                  style={[
                    styles.chipText,
                    fuel === f.value && styles.chipTextActive,
                  ]}
                >
                  {f.label}
                </Text>
              </Pressable>
            ))}
          </View>
        ) : null}

        {step === 4 ? (
          <View style={styles.gap}>
            {damages.map((d, i) => (
              <Text key={i} style={styles.meta}>
                {d.location_label} · {damageSeverityLabel(d.severity)} ·{' '}
                {d.description || '—'}
              </Text>
            ))}
            <Text style={styles.label}>Konum</Text>
            <View style={styles.chips}>
              {DAMAGE_LOCATIONS.map((l) => (
                <Pressable
                  key={l.key}
                  onPress={() => setLoc(l.key)}
                  style={[styles.chip, loc === l.key && styles.chipActive]}
                >
                  <Text
                    style={[
                      styles.chipText,
                      loc === l.key && styles.chipTextActive,
                    ]}
                  >
                    {l.label}
                  </Text>
                </Pressable>
              ))}
            </View>
            <Text style={styles.label}>Seviye</Text>
            <View style={styles.chips}>
              {(['MINOR', 'MODERATE', 'MAJOR'] as const).map((s) => (
                <Pressable
                  key={s}
                  onPress={() => setSev(s)}
                  style={[styles.chip, sev === s && styles.chipActive]}
                >
                  <Text
                    style={[
                      styles.chipText,
                      sev === s && styles.chipTextActive,
                    ]}
                  >
                    {damageSeverityLabel(s)}
                  </Text>
                </Pressable>
              ))}
            </View>
            <Input label="Açıklama" value={desc} onChangeText={setDesc} />
            <Input
              label="Tahmini tutar"
              keyboardType="decimal-pad"
              value={est}
              onChangeText={setEst}
            />
            <Button title="Hasar Ekle" variant="secondary" onPress={addDamage} />
          </View>
        ) : null}

        {step === 5 ? (
          <View style={styles.gap}>
            <Text style={styles.hint}>
              Ön / arka / yan / iç / gösterge fotoğrafları ekleyebilirsiniz.
              Zorunlu değildir.
            </Text>
            <View style={styles.chips}>
              {PHOTO_CATEGORIES.slice(0, 7).map((c) => (
                <Text key={c.value} style={styles.meta}>
                  {c.label}
                </Text>
              ))}
            </View>
            <Button
              title="Fotoğraf Ekle"
              variant="secondary"
              loading={uploadPhoto.isPending}
              onPress={() => void pickPhoto()}
            />
            <ScrollView horizontal>
              {photoPreviews.map((uri) => (
                <Image key={uri} source={{ uri }} style={styles.thumb} />
              ))}
            </ScrollView>
          </View>
        ) : null}

        {step === 6 ? (
          <View style={styles.gap}>
            <Pressable
              onPress={() => setConfirmed((v) => !v)}
              style={styles.checkRow}
            >
              <View style={[styles.box, confirmed && styles.boxOn]} />
              <Text style={styles.body}>
                Araç teslim koşullarını kontrol ettim.
              </Text>
            </Pressable>
            <Input
              label="Müşteri adı / onay (opsiyonel)"
              value={ackName}
              onChangeText={setAckName}
            />
            <Input
              label="Not"
              value={notes}
              onChangeText={setNotes}
              multiline
              style={{ minHeight: 72, textAlignVertical: 'top' }}
            />
          </View>
        ) : null}

        {step === 7 ? (
          <View style={styles.gap}>
            <Text style={styles.body}>KM: {km || '—'}</Text>
            <Text style={styles.body}>
              Yakıt: {FUEL_LEVELS.find((f) => f.value === fuel)?.label}
            </Text>
            <Text style={styles.body}>Hasar: {damages.length}</Text>
            <Text style={styles.body}>Fotoğraf: {photoIds.length}</Text>
            <Text style={styles.body}>
              Onay: {confirmed ? 'Evet' : 'Hayır'}
            </Text>
          </View>
        ) : null}

        {error ? <Text style={styles.error}>{error}</Text> : null}
      </ScrollView>

      <View style={styles.footer}>
        {step > 1 ? (
          <Button
            title="Geri"
            variant="ghost"
            onPress={() => setStep((s) => Math.max(1, s - 1) as Step)}
          />
        ) : null}
        {step < 7 ? (
          <Button
            title="Devam"
            onPress={() => setStep((s) => Math.min(7, s + 1) as Step)}
          />
        ) : (
          <Button
            title={
              complete.isPending ? 'Teslim tamamlanıyor...' : 'Teslimi Tamamla'
            }
            loading={complete.isPending}
            disabled={complete.isPending}
            onPress={() => void submit()}
          />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  progress: {
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
  dot: { flex: 1, height: 4, borderRadius: 2, backgroundColor: colors.border },
  dotActive: { backgroundColor: colors.primary },
  stepTitle: {
    ...typography.subtitle,
    color: colors.text,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  content: { paddingHorizontal: spacing.lg, paddingBottom: 24, gap: spacing.md },
  gap: { gap: spacing.md },
  body: { ...typography.body, color: colors.text },
  meta: { ...typography.caption, color: colors.textSecondary },
  hint: { ...typography.caption, color: colors.textMuted },
  label: { ...typography.label, color: colors.textSecondary },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 999,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.surface,
  },
  chipActive: { backgroundColor: colors.primarySoft, borderColor: colors.primary },
  chipText: { ...typography.caption, color: colors.textSecondary },
  chipTextActive: { color: colors.primary },
  thumb: {
    width: 72,
    height: 72,
    borderRadius: 8,
    marginRight: 8,
    backgroundColor: colors.surfaceMuted,
  },
  checkRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  box: {
    width: 22,
    height: 22,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: colors.borderStrong,
  },
  boxOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  error: { ...typography.caption, color: colors.danger },
  footer: {
    padding: spacing.lg,
    gap: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    backgroundColor: colors.surface,
  },
});
