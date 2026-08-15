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
import {
  useCompleteReturn,
  useRentalHandover,
  useRentalPaymentSummary,
} from '@/features/operations/hooks';
import type { DamageDraft } from '@/services/handoverService';
import type { ExtraChargeDraft } from '@/services/returnService';
import {
  calculateFuelDifference,
  calculateLateDuration,
  DAMAGE_LOCATIONS,
  EXTRA_CHARGE_TYPES,
  FUEL_LEVELS,
  damageSeverityLabel,
  paymentMethodLabel,
  type FuelLevel,
} from '@/utils/operations';
import { formatCurrency } from '@/utils/currency';
import { getErrorMessage } from '@/utils/errors';
import { APP_TIMEZONE } from '@/utils/date';
import { toZonedTime } from 'date-fns-tz';
import type { PaymentMethod } from '@rentaflow/shared';
import { colors, spacing, typography } from '@/theme';

type Step = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;

export default function ReturnWizardScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const rentalQuery = useRental(id);
  const handoverQuery = useRentalHandover(id);
  const paymentSummary = useRentalPaymentSummary(id);
  const complete = useCompleteReturn(id);
  const uploadPhoto = useUploadRentalPhoto(id);

  const [step, setStep] = useState<Step>(1);
  const [km, setKm] = useState('');
  const [fuel, setFuel] = useState<FuelLevel>('FULL');
  const [damages, setDamages] = useState<DamageDraft[]>([]);
  const [extras, setExtras] = useState<ExtraChargeDraft[]>([]);
  const [photoIds, setPhotoIds] = useState<string[]>([]);
  const [photoPreviews, setPhotoPreviews] = useState<string[]>([]);
  const [depositAction, setDepositAction] = useState<
    'FULL_REFUND' | 'PARTIAL_REFUND' | 'FORFEIT'
  >('FULL_REFUND');
  const [depositDeduction, setDepositDeduction] = useState('0');
  const [payAmount, setPayAmount] = useState('');
  const [payMethod, setPayMethod] = useState<PaymentMethod>('CASH');
  const [maintenance, setMaintenance] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);

  const [sev, setSev] = useState<'MINOR' | 'MODERATE' | 'MAJOR'>('MINOR');
  const [loc, setLoc] = useState(DAMAGE_LOCATIONS[0].key);
  const [desc, setDesc] = useState('');
  const [est, setEst] = useState('0');
  const [extraType, setExtraType] =
    useState<ExtraChargeDraft['charge_type']>('OTHER');
  const [extraDesc, setExtraDesc] = useState('');
  const [extraAmt, setExtraAmt] = useState('');

  const rental = rentalQuery.data;
  const startKm = handoverQuery.data?.odometer_km ?? rental?.start_km ?? 0;
  const startFuel = handoverQuery.data?.fuel_level ?? rental?.fuel_start;

  const late = useMemo(() => {
    if (!rental) return null;
    const planned = toZonedTime(
      new Date(`${rental.end_date}T${String(rental.end_time).slice(0, 8)}`),
      APP_TIMEZONE,
    );
    return calculateLateDuration(planned, new Date());
  }, [rental]);

  const fuelDiff = useMemo(
    () => calculateFuelDifference(startFuel, fuel),
    [startFuel, fuel],
  );

  const extrasTotal = extras.reduce((s, e) => s + e.amount, 0);
  const remaining = paymentSummary.data?.remaining_amount ?? 0;
  const deposit = Number(rental?.deposit_amount ?? 0);
  const grandRemaining = remaining + extrasTotal;

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
  };

  const addExtra = () => {
    const amount = Number(extraAmt);
    if (!(amount > 0)) {
      Alert.alert('Hata', 'Ek ücret tutarı sıfırdan büyük olmalıdır.');
      return;
    }
    setExtras((prev) => [
      ...prev,
      {
        charge_type: extraType,
        description: extraDesc.trim() || undefined,
        amount,
      },
    ]);
    setExtraAmt('');
    setExtraDesc('');
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
        type: 'RETURN',
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
    if (odometer < Number(startKm || 0)) {
      setError('İade kilometresi teslim kilometresinden küçük olamaz.');
      return;
    }
    if (!confirmed) {
      setError('İade tamamlanmadan önce kontrol onayı gereklidir.');
      return;
    }
    const deduction =
      depositAction === 'PARTIAL_REFUND' || depositAction === 'FORFEIT'
        ? depositAction === 'FORFEIT'
          ? deposit
          : Number(depositDeduction) || 0
        : 0;

    try {
      await complete.mutateAsync({
        rentalId: id,
        odometerKm: odometer,
        fuelLevel: fuel,
        sendToMaintenance: maintenance,
        depositAction,
        depositDeduction: deduction,
        checklistConfirmed: true,
        notes: notes.trim() || undefined,
        extraCharges: extras,
        damages,
        photoIds,
        paymentAmount: Number(payAmount) > 0 ? Number(payAmount) : undefined,
        paymentMethod: payMethod,
      });
      Alert.alert('Başarılı', 'Araç iade alındı. Kiralama tamamlandı.', [
        { text: 'Tamam', onPress: () => router.replace(`/(app)/rentals/${id}`) },
      ]);
    } catch (e) {
      setError(getErrorMessage(e, 'İade tamamlanamadı.'));
    }
  };

  return (
    <View style={styles.flex}>
      <View style={styles.progress}>
        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
          <View key={n} style={[styles.dot, step >= n && styles.dotActive]} />
        ))}
      </View>
      <Text style={styles.stepTitle}>
        {step === 1 && '1. Araç kontrolü'}
        {step === 2 && '2. Kilometre'}
        {step === 3 && '3. Yakıt'}
        {step === 4 && '4. Hasar'}
        {step === 5 && '5. Ek ücret'}
        {step === 6 && '6. Fotoğraflar'}
        {step === 7 && '7. Depozito'}
        {step === 8 && '8. Ödeme'}
        {step === 9 && '9. İade tamamla'}
      </Text>

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {step === 1 ? (
          <View style={styles.gap}>
            <Text style={styles.body}>
              Araç iade kontrolüne başlayın. Plaka:{' '}
              {rental?.vehicle_plate ?? '—'}
            </Text>
            {late?.isLate ? (
              <Text style={styles.warn}>{late.label}</Text>
            ) : (
              <Text style={styles.meta}>Gecikme yok</Text>
            )}
          </View>
        ) : null}

        {step === 2 ? (
          <View style={styles.gap}>
            <Text style={styles.meta}>Teslim KM: {startKm || '—'}</Text>
            <Input
              label="İade kilometresi *"
              keyboardType="number-pad"
              value={km}
              onChangeText={setKm}
            />
            {km && startKm ? (
              <Text style={styles.body}>
                Fark: {Math.max(Number(km) - Number(startKm), 0)} km
              </Text>
            ) : null}
          </View>
        ) : null}

        {step === 3 ? (
          <View style={styles.gap}>
            <Text style={styles.meta}>
              Teslim yakıtı: {fuelDiff.startLabel}
            </Text>
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
            {fuelDiff.dropped ? (
              <Text style={styles.warn}>
                Yakıt farkı: %{fuelDiff.deltaPercent} düşüş
              </Text>
            ) : null}
          </View>
        ) : null}

        {step === 4 ? (
          <View style={styles.gap}>
            <Text style={styles.hint}>Yeni hasarlar NEW olarak kaydedilir.</Text>
            {damages.map((d, i) => (
              <Text key={i} style={styles.meta}>
                {d.location_label} · {damageSeverityLabel(d.severity)}
              </Text>
            ))}
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
            {extras.map((e, i) => (
              <Text key={i} style={styles.meta}>
                {e.charge_type}: {formatCurrency(e.amount)}
              </Text>
            ))}
            <View style={styles.chips}>
              {EXTRA_CHARGE_TYPES.map((t) => (
                <Pressable
                  key={t.value}
                  onPress={() => setExtraType(t.value)}
                  style={[
                    styles.chip,
                    extraType === t.value && styles.chipActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.chipText,
                      extraType === t.value && styles.chipTextActive,
                    ]}
                  >
                    {t.label}
                  </Text>
                </Pressable>
              ))}
            </View>
            <Input label="Açıklama" value={extraDesc} onChangeText={setExtraDesc} />
            <Input
              label="Tutar"
              keyboardType="decimal-pad"
              value={extraAmt}
              onChangeText={setExtraAmt}
            />
            <Button title="Ek Ücret Ekle" variant="secondary" onPress={addExtra} />
          </View>
        ) : null}

        {step === 6 ? (
          <View style={styles.gap}>
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

        {step === 7 ? (
          <View style={styles.gap}>
            <Text style={styles.body}>Depozito: {formatCurrency(deposit)}</Text>
            {(
              [
                ['FULL_REFUND', 'Tam iade'],
                ['PARTIAL_REFUND', 'Kısmi iade'],
                ['FORFEIT', 'Mahsup'],
              ] as const
            ).map(([value, label]) => (
              <Pressable
                key={value}
                onPress={() => setDepositAction(value)}
                style={[
                  styles.chip,
                  depositAction === value && styles.chipActive,
                ]}
              >
                <Text
                  style={[
                    styles.chipText,
                    depositAction === value && styles.chipTextActive,
                  ]}
                >
                  {label}
                </Text>
              </Pressable>
            ))}
            {depositAction === 'PARTIAL_REFUND' ? (
              <Input
                label="Kesinti tutarı"
                keyboardType="decimal-pad"
                value={depositDeduction}
                onChangeText={setDepositDeduction}
              />
            ) : null}
          </View>
        ) : null}

        {step === 8 ? (
          <View style={styles.gap}>
            <Text style={styles.body}>
              Kiralama {formatCurrency(rental?.total_amount ?? 0)}
            </Text>
            <Text style={styles.meta}>
              Ödenen {formatCurrency(paymentSummary.data?.paid_amount ?? 0)}
            </Text>
            <Text style={styles.meta}>Kalan {formatCurrency(remaining)}</Text>
            <Text style={styles.meta}>
              Yeni ek ücret {formatCurrency(extrasTotal)}
            </Text>
            <Text style={styles.body}>
              Toplam kalan {formatCurrency(grandRemaining)}
            </Text>
            <Text style={styles.meta}>
              Depozito {formatCurrency(deposit)}
            </Text>
            <Input
              label="Ödeme Al (opsiyonel)"
              keyboardType="decimal-pad"
              value={payAmount}
              onChangeText={setPayAmount}
            />
            <View style={styles.chips}>
              {(['CASH', 'CREDIT_CARD', 'BANK_TRANSFER', 'OTHER'] as const).map(
                (m) => (
                  <Pressable
                    key={m}
                    onPress={() => setPayMethod(m)}
                    style={[styles.chip, payMethod === m && styles.chipActive]}
                  >
                    <Text
                      style={[
                        styles.chipText,
                        payMethod === m && styles.chipTextActive,
                      ]}
                    >
                      {paymentMethodLabel(m)}
                    </Text>
                  </Pressable>
                ),
              )}
            </View>
            <Text style={styles.hint}>
              Ödeme tamamlanmasa da araç iade edilebilir.
            </Text>
          </View>
        ) : null}

        {step === 9 ? (
          <View style={styles.gap}>
            <Pressable
              onPress={() => setConfirmed((v) => !v)}
              style={styles.checkRow}
            >
              <View style={[styles.box, confirmed && styles.boxOn]} />
              <Text style={styles.body}>İade kontrolünü tamamladım.</Text>
            </Pressable>
            <Pressable
              onPress={() => setMaintenance((v) => !v)}
              style={styles.checkRow}
            >
              <View style={[styles.box, maintenance && styles.boxOn]} />
              <Text style={styles.body}>Aracı bakıma gönder</Text>
            </Pressable>
            <Input
              label="Not"
              value={notes}
              onChangeText={setNotes}
              multiline
              style={{ minHeight: 72, textAlignVertical: 'top' }}
            />
            <Text style={styles.meta}>
              KM {km} · Yakıt {FUEL_LEVELS.find((f) => f.value === fuel)?.label} ·
              Ek ücret {formatCurrency(extrasTotal)}
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
        {step < 9 ? (
          <Button
            title="Devam"
            onPress={() => setStep((s) => Math.min(9, s + 1) as Step)}
          />
        ) : (
          <Button
            title={
              complete.isPending ? 'İade tamamlanıyor...' : 'İadeyi Tamamla'
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
    gap: 4,
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
  warn: { ...typography.caption, color: colors.warning },
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
