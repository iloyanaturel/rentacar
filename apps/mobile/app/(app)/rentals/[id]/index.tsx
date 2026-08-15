import { useMemo, useState } from 'react';
import {
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  Button,
  Card,
  EmptyState,
  ErrorState,
  LoadingSkeleton,
  PaymentStatusBadge,
  RentalStatusBadge,
  SectionHeader,
} from '@/components/ui';
import {
  useCancelRental,
  useRental,
  useRentalPhotos,
  useStartRental,
  useUpdateRentalNotes,
} from '@/features/rentals/hooks';
import {
  useRentalDamages,
  useRentalDeposit,
  useRentalExtraCharges,
  useRentalHandover,
  useRentalPaymentSummary,
  useRentalPayments,
  useRentalReturn,
  useRentalTimeline,
} from '@/features/operations/hooks';
import { formatCurrency } from '@/utils/currency';
import { formatDate, formatFriendlyDate, formatTime } from '@/utils/date';
import { getErrorMessage } from '@/utils/errors';
import {
  depositStatusLabel,
  fuelLevelLabel,
  paymentMethodLabel,
  damageSeverityLabel,
} from '@/utils/operations';
import { maskPhone, rentalStatusLabel } from '@/utils/labels';
import { colors, spacing, typography } from '@/theme';

const TIMELINE_LABELS: Record<string, string> = {
  CREATE_RENTAL: 'Kiralama oluşturuldu',
  PAYMENT_CREATED: 'Ödeme alındı',
  CREATE_PAYMENT: 'Ödeme alındı',
  PAYMENT_REVERSED: 'Ödeme iptal edildi',
  HANDOVER_CREATED: 'Araç teslim edildi',
  RETURN_CREATED: 'Araç iade edildi',
  DAMAGE_CREATED: 'Hasar kaydı oluşturuldu',
  EXTRA_CHARGE_CREATED: 'Ek ücret eklendi',
  DEPOSIT_HELD: 'Depozito alındı',
  DEPOSIT_REFUNDED: 'Depozito iade edildi',
  DEPOSIT_FORFEITED: 'Depozito mahsup edildi',
  RENTAL_COMPLETED: 'Kiralama tamamlandı',
  VEHICLE_RETURNED: 'Araç iade edildi',
  START_RENTAL: 'Kiralama başlatıldı',
  CANCEL_RENTAL: 'Kiralama iptal edildi',
  UPDATE_RENTAL: 'Kiralama güncellendi',
};

export default function RentalDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const rentalQuery = useRental(id);
  const photosQuery = useRentalPhotos(id);
  const paymentsQuery = useRentalPayments(id);
  const paymentSummary = useRentalPaymentSummary(id);
  const handoverQuery = useRentalHandover(id);
  const returnQuery = useRentalReturn(id);
  const damagesQuery = useRentalDamages(id);
  const depositQuery = useRentalDeposit(id);
  const extrasQuery = useRentalExtraCharges(id);
  const timelineQuery = useRentalTimeline(id);
  const startMutation = useStartRental();
  const cancelMutation = useCancelRental();
  const notesMutation = useUpdateRentalNotes(id);
  const [cancelNote, setCancelNote] = useState('');
  const [notesDraft, setNotesDraft] = useState<string | null>(null);

  const rental = rentalQuery.data;
  const kmDelta = useMemo(() => {
    if (!rental) return null;
    const start = handoverQuery.data?.odometer_km ?? rental.start_km;
    const end = returnQuery.data?.odometer_km ?? rental.end_km;
    if (start == null || end == null) return null;
    return end - start;
  }, [handoverQuery.data, returnQuery.data, rental]);

  if (rentalQuery.isLoading) {
    return (
      <ScrollView contentContainerStyle={styles.content}>
        <LoadingSkeleton height={160} />
        <LoadingSkeleton height={120} style={{ marginTop: 12 }} />
      </ScrollView>
    );
  }

  if (rentalQuery.isError || !rental) {
    return (
      <ErrorState
        message="Kiralama bilgileri yüklenemedi."
        onRetry={() => void rentalQuery.refetch()}
      />
    );
  }

  const busy = startMutation.isPending || cancelMutation.isPending;
  const notesValue = notesDraft ?? rental.notes ?? '';
  const hasHandover = Boolean(handoverQuery.data);
  const hasReturn = Boolean(returnQuery.data);
  const finance = paymentSummary.data;

  const onCancel = () => {
    Alert.alert(
      'Kiralama İptali',
      'Bu kiralamayı iptal etmek istediğinize emin misiniz?',
      [
        { text: 'Vazgeç', style: 'cancel' },
        {
          text: 'İptal Et',
          style: 'destructive',
          onPress: () => {
            cancelMutation.mutate(
              { id: rental.id, reason: cancelNote.trim() || undefined },
              {
                onSuccess: () => Alert.alert('İptal edildi', 'Kiralama iptal edildi.'),
                onError: (e) => Alert.alert('Hata', getErrorMessage(e)),
              },
            );
          },
        },
      ],
    );
  };

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Card style={styles.block}>
        <View style={styles.row}>
          <View style={styles.grow}>
            <Text style={styles.title}>
              {rental.vehicle_brand} {rental.vehicle_model}
            </Text>
            <Text style={styles.meta}>{rental.vehicle_plate}</Text>
            <Text style={styles.body}>{rental.customer_name}</Text>
            <Text style={styles.meta}>{maskPhone(rental.customer_phone)}</Text>
          </View>
          <RentalStatusBadge status={rental.display_status} />
        </View>
        {rental.display_status === 'OVERDUE' ? (
          <Text style={styles.warn}>
            Teslim tarihi geçmiş — {rentalStatusLabel('OVERDUE')}
          </Text>
        ) : null}
      </Card>

      <SectionHeader title="Tarihler" />
      <Card style={styles.block}>
        <Row
          label="Başlangıç"
          value={`${formatDate(rental.start_date)} ${formatTime(rental.start_time)}`}
        />
        <Row
          label="Planlanan teslim"
          value={`${formatDate(rental.end_date)} ${formatTime(rental.end_time)}`}
        />
        <Row label="Gün" value={`${rental.total_days}`} />
      </Card>

      <SectionHeader title="Finans" />
      <Card style={styles.block}>
        <Row
          label="Toplam Tutar"
          value={formatCurrency(finance?.total_amount ?? rental.total_amount)}
          emphasize
        />
        <Row
          label="Ödenen"
          value={formatCurrency(finance?.paid_amount ?? rental.paid_amount)}
        />
        <Row
          label="Kalan"
          value={formatCurrency(
            finance?.remaining_amount ?? rental.remaining_amount,
          )}
        />
        <Row label="Depozito" value={formatCurrency(rental.deposit_amount)} />
        {depositQuery.data ? (
          <Text style={styles.meta}>
            Depozito durumu: {depositStatusLabel(depositQuery.data.status)}
          </Text>
        ) : null}
        <PaymentStatusBadge
          status={finance?.payment_status ?? rental.payment_status}
        />
        <Button
          title="PDF Sözleşme"
          variant="secondary"
          onPress={() => {
            void (async () => {
              try {
                const { exportRentalContractPdf } = await import(
                  '@/features/reports/export'
                );
                const number = await exportRentalContractPdf(rental.id);
                Alert.alert(
                  'Sözleşme hazır',
                  number ? `Sözleşme no: ${number}` : 'PDF oluşturuldu.',
                );
              } catch (e) {
                Alert.alert('Hata', getErrorMessage(e, 'PDF oluşturulamadı.'));
              }
            })();
          }}
          style={{ marginTop: 8 }}
        />
      </Card>

      <SectionHeader title="Teslim" />
      <Card style={styles.block}>
        {hasHandover && handoverQuery.data ? (
          <>
            <Row
              label="KM"
              value={`${handoverQuery.data.odometer_km.toLocaleString('tr-TR')} km`}
            />
            <Row
              label="Yakıt"
              value={fuelLevelLabel(handoverQuery.data.fuel_level)}
            />
            <Row
              label="Tarih"
              value={formatFriendlyDate(handoverQuery.data.completed_at)}
            />
          </>
        ) : (
          <EmptyState title="Henüz teslim kaydı yok." />
        )}
      </Card>

      <SectionHeader title="İade" />
      <Card style={styles.block}>
        {hasReturn && returnQuery.data ? (
          <>
            <Row
              label="KM"
              value={`${returnQuery.data.odometer_km.toLocaleString('tr-TR')} km`}
            />
            <Row
              label="Yakıt"
              value={fuelLevelLabel(returnQuery.data.fuel_level)}
            />
            {kmDelta != null ? (
              <Row label="KM farkı" value={`${kmDelta} km`} />
            ) : null}
            {returnQuery.data.late_minutes > 0 ? (
              <Row
                label="Gecikme"
                value={`${returnQuery.data.late_minutes} dk`}
              />
            ) : null}
          </>
        ) : (
          <EmptyState title="Henüz iade kaydı yok." />
        )}
      </Card>

      <SectionHeader title="Hasarlar" />
      <Card style={styles.block}>
        {(damagesQuery.data ?? []).length === 0 ? (
          <EmptyState title="Hasar kaydı yok." />
        ) : (
          (damagesQuery.data ?? []).map((d) => (
            <View key={d.id} style={styles.item}>
              <Text style={styles.body}>
                {d.location_label || d.location_key} ·{' '}
                {damageSeverityLabel(d.severity)} · {d.timing}
              </Text>
              <Text style={styles.meta}>
                {d.description || '—'} · {formatCurrency(d.estimated_amount)}
              </Text>
            </View>
          ))
        )}
      </Card>

      {(extrasQuery.data ?? []).length > 0 ? (
        <>
          <SectionHeader title="Ek Ücretler" />
          <Card style={styles.block}>
            {(extrasQuery.data ?? []).map((e) => (
              <Row
                key={e.id}
                label={e.description || e.charge_type}
                value={formatCurrency(e.amount)}
              />
            ))}
          </Card>
        </>
      ) : null}

      <SectionHeader title="Ödeme Geçmişi" />
      <Card style={styles.block}>
        {(paymentsQuery.data ?? []).filter((p) => !p.voided_at).length === 0 ? (
          <EmptyState title="Henüz ödeme yok." />
        ) : (
          (paymentsQuery.data ?? [])
            .filter((p) => !p.voided_at)
            .map((p) => (
              <View key={p.id} style={styles.item}>
                <Text style={styles.body}>
                  {formatDate(p.payment_date)} · {formatCurrency(p.amount)}
                </Text>
                <Text style={styles.meta}>
                  {paymentMethodLabel(p.payment_method)}
                  {p.creator_name ? ` · ${p.creator_name}` : ''}
                </Text>
              </View>
            ))
        )}
      </Card>

      <SectionHeader title="Fotoğraflar" />
      <Card style={styles.block}>
        {(photosQuery.data ?? []).length === 0 ? (
          <EmptyState title="Fotoğraf yok." />
        ) : (
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {(photosQuery.data ?? []).map((p) =>
              p.public_url ? (
                <Image key={p.id} source={{ uri: p.public_url }} style={styles.thumb} />
              ) : null,
            )}
          </ScrollView>
        )}
      </Card>

      <SectionHeader title="Zaman Çizelgesi" />
      <Card style={styles.block}>
        {(timelineQuery.data ?? []).length === 0 ? (
          <Text style={styles.meta}>Henüz olay yok.</Text>
        ) : (
          (timelineQuery.data ?? []).map((ev) => (
            <View key={ev.id} style={styles.item}>
              <Text style={styles.meta}>
                {formatFriendlyDate(ev.created_at)}{' '}
                {formatTime(ev.created_at)}
              </Text>
              <Text style={styles.body}>
                {TIMELINE_LABELS[ev.action] ?? ev.action}
                {ev.action.includes('PAYMENT') &&
                ev.metadata &&
                typeof ev.metadata.amount === 'number'
                  ? ` · ${formatCurrency(ev.metadata.amount)}`
                  : ''}
                {ev.metadata && typeof ev.metadata.odometer_km === 'number'
                  ? ` · ${ev.metadata.odometer_km} km`
                  : ''}
              </Text>
            </View>
          ))
        )}
      </Card>

      <SectionHeader title="Notlar" />
      <Card style={styles.block}>
        {rental.status === 'RESERVED' ? (
          <>
            <TextInput
              style={styles.notesInput}
              value={notesValue}
              onChangeText={setNotesDraft}
              placeholder="Kiralama notu"
              placeholderTextColor={colors.textMuted}
              multiline
            />
            <Button
              title="Notu Kaydet"
              variant="secondary"
              loading={notesMutation.isPending}
              onPress={() =>
                notesMutation.mutate(notesValue, {
                  onSuccess: () => {
                    Alert.alert('Kaydedildi', 'Not güncellendi.');
                    setNotesDraft(null);
                  },
                  onError: (e) => Alert.alert('Hata', getErrorMessage(e)),
                })
              }
            />
          </>
        ) : (
          <Text style={styles.body}>{rental.notes || 'Not yok.'}</Text>
        )}
      </Card>

      <SectionHeader title="İşlemler" />
      <View style={styles.actions}>
        {rental.status === 'RESERVED' && !hasHandover ? (
          <>
            <Button
              title="Aracı Teslim Et"
              onPress={() => router.push(`/(app)/rentals/${id}/handover`)}
            />
            <Button
              title="Ödeme Ekle"
              variant="secondary"
              onPress={() => router.push(`/(app)/rentals/${id}/payment`)}
            />
            <Button
              title="Düzenle"
              variant="secondary"
              onPress={() => router.push(`/(app)/rentals/${id}/edit`)}
            />
            <Button
              title="Kiralamayı Başlat"
              variant="ghost"
              onPress={() =>
                startMutation.mutate(rental.id, {
                  onSuccess: () => Alert.alert('Başarılı', 'Kiralama başlatıldı.'),
                  onError: (e) => Alert.alert('Hata', getErrorMessage(e)),
                })
              }
              disabled={busy}
            />
          </>
        ) : null}

        {(rental.status === 'ACTIVE' || rental.display_status === 'OVERDUE') &&
        !hasReturn ? (
          <>
            {!hasHandover ? (
              <Button
                title="Aracı Teslim Et"
                onPress={() => router.push(`/(app)/rentals/${id}/handover`)}
              />
            ) : null}
            <Button
              title="Aracı Teslim Al"
              onPress={() => router.push(`/(app)/rentals/${id}/return`)}
            />
            <Button
              title="Ödeme Ekle"
              variant="secondary"
              onPress={() => router.push(`/(app)/rentals/${id}/payment`)}
            />
          </>
        ) : null}

        {rental.status === 'COMPLETED' &&
        (finance?.remaining_amount ?? 0) > 0 ? (
          <Button
            title="Ödeme Ekle"
            onPress={() => router.push(`/(app)/rentals/${id}/payment`)}
          />
        ) : null}

        {(rental.status === 'RESERVED' ||
          rental.status === 'ACTIVE' ||
          rental.display_status === 'OVERDUE') &&
        !hasReturn ? (
          <>
            <TextInput
              style={styles.notesInput}
              value={cancelNote}
              onChangeText={setCancelNote}
              placeholder="İptal nedeni (opsiyonel)"
              placeholderTextColor={colors.textMuted}
              editable={!busy}
            />
            <Button
              title="İptal Et"
              variant="danger"
              onPress={onCancel}
              disabled={busy}
            />
          </>
        ) : null}
      </View>
    </ScrollView>
  );
}

function Row({
  label,
  value,
  emphasize,
}: {
  label: string;
  value: string;
  emphasize?: boolean;
}) {
  return (
    <View style={styles.rowLine}>
      <Text style={styles.meta}>{label}</Text>
      <Text style={[styles.body, emphasize && styles.emph]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, gap: spacing.md, paddingBottom: 40 },
  block: { gap: spacing.sm },
  title: { ...typography.subtitle, color: colors.text },
  body: { ...typography.bodyMedium, color: colors.text },
  meta: { ...typography.caption, color: colors.textSecondary },
  emph: { color: colors.primary, fontFamily: 'Outfit_600SemiBold' },
  warn: { ...typography.caption, color: colors.danger },
  row: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
  rowLine: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  grow: { flex: 1 },
  actions: { gap: spacing.sm },
  item: { gap: 2, marginBottom: spacing.sm },
  notesInput: {
    minHeight: 72,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: spacing.md,
    ...typography.body,
    color: colors.text,
    backgroundColor: colors.surface,
    textAlignVertical: 'top',
  },
  thumb: {
    width: 88,
    height: 88,
    borderRadius: 10,
    marginRight: spacing.sm,
    backgroundColor: colors.surfaceMuted,
  },
});
