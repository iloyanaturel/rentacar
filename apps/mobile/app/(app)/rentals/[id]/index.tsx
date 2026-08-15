import { useState } from 'react';
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
import * as ImagePicker from 'expo-image-picker';
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
  useUploadRentalPhoto,
} from '@/features/rentals/hooks';
import { formatCurrency } from '@/utils/currency';
import { formatDate, formatTime } from '@/utils/date';
import { getErrorMessage } from '@/utils/errors';
import { maskPhone, rentalStatusLabel } from '@/utils/labels';
import type { RentalPhotoType } from '@rentaflow/shared';
import { colors, spacing, typography } from '@/theme';

export default function RentalDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const rentalQuery = useRental(id);
  const photosQuery = useRentalPhotos(id);
  const startMutation = useStartRental();
  const cancelMutation = useCancelRental();
  const notesMutation = useUpdateRentalNotes(id);
  const uploadPhoto = useUploadRentalPhoto(id);
  const [cancelNote, setCancelNote] = useState('');
  const [notesDraft, setNotesDraft] = useState<string | null>(null);

  if (rentalQuery.isLoading) {
    return (
      <ScrollView contentContainerStyle={styles.content}>
        <LoadingSkeleton height={160} />
        <LoadingSkeleton height={120} style={{ marginTop: 12 }} />
        <LoadingSkeleton height={180} style={{ marginTop: 12 }} />
      </ScrollView>
    );
  }

  if (rentalQuery.isError || !rentalQuery.data) {
    return (
      <ErrorState
        message="Kiralama bilgileri yüklenemedi."
        onRetry={() => void rentalQuery.refetch()}
      />
    );
  }

  const rental = rentalQuery.data;
  const busy = startMutation.isPending || cancelMutation.isPending;
  const notesValue = notesDraft ?? rental.notes ?? '';

  const onStart = () => {
    Alert.alert('Kiralamayı Başlat', 'Bu kiralama ACTIVE olarak başlatılsın mı?', [
      { text: 'Vazgeç', style: 'cancel' },
      {
        text: 'Başlat',
        onPress: () => {
          startMutation.mutate(rental.id, {
            onSuccess: () => Alert.alert('Başarılı', 'Kiralama başlatıldı.'),
            onError: (e) => Alert.alert('Hata', getErrorMessage(e)),
          });
        },
      },
    ]);
  };

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
                onSuccess: () => {
                  Alert.alert('İptal edildi', 'Kiralama iptal edildi.');
                  void rentalQuery.refetch();
                },
                onError: (e) => Alert.alert('Hata', getErrorMessage(e)),
              },
            );
          },
        },
      ],
    );
  };

  const pickPhoto = async (type: RentalPhotoType) => {
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
      await uploadPhoto.mutateAsync({ uri: result.assets[0].uri, type });
      Alert.alert('Başarılı', 'Fotoğraf yüklendi.');
    } catch (error) {
      Alert.alert('Hata', getErrorMessage(error, 'Fotoğraf yüklenemedi.'));
    }
  };

  const photos = photosQuery.data ?? [];
  const pickup = photos.filter((p) => p.type === 'PICKUP');
  const ret = photos.filter((p) => p.type === 'RETURN');
  const damage = photos.filter((p) => p.type === 'DAMAGE');

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Card style={styles.block}>
        <View style={styles.row}>
          <View style={styles.flex}>
            <Text style={styles.title}>
              {rental.vehicle_brand} {rental.vehicle_model}
            </Text>
            <Text style={styles.meta}>{rental.vehicle_plate}</Text>
          </View>
          <RentalStatusBadge status={rental.display_status} />
        </View>
        {rental.display_status === 'OVERDUE' ? (
          <Text style={styles.warn}>
            Teslim tarihi geçmiş — durum: {rentalStatusLabel('OVERDUE')}
          </Text>
        ) : null}
      </Card>

      <SectionHeader title="Müşteri" />
      <Card style={styles.block}>
        <Text style={styles.body}>{rental.customer_name}</Text>
        <Text style={styles.meta}>{maskPhone(rental.customer_phone)}</Text>
        <Pressable
          onPress={() => router.push(`/(app)/customers/${rental.customer_id}`)}
        >
          <Text style={styles.link}>Müşteri detayına git</Text>
        </Pressable>
      </Card>

      <SectionHeader title="Kiralama" />
      <Card style={styles.block}>
        <Row
          label="Başlangıç"
          value={`${formatDate(rental.start_date)} ${formatTime(rental.start_time)}`}
        />
        <Row
          label="Teslim"
          value={`${formatDate(rental.end_date)} ${formatTime(rental.end_time)}`}
        />
        <Row label="Gün" value={`${rental.total_days}`} />
      </Card>

      <SectionHeader title="Finans" />
      <Card style={styles.block}>
        <Row label="Günlük" value={formatCurrency(rental.daily_price)} />
        <Row label="Ara toplam" value={formatCurrency(rental.subtotal)} />
        <Row label="İndirim" value={formatCurrency(rental.discount_amount)} />
        <Row label="Ek ücret" value={formatCurrency(rental.extra_charge)} />
        <Row label="Toplam" value={formatCurrency(rental.total_amount)} emphasize />
        <Row label="Ödenen" value={formatCurrency(rental.paid_amount)} />
        <Row label="Kalan" value={formatCurrency(rental.remaining_amount)} />
        <Row label="Depozito" value={formatCurrency(rental.deposit_amount)} />
        <PaymentStatusBadge status={rental.payment_status} />
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
              onPress={() => {
                notesMutation.mutate(notesValue, {
                  onSuccess: () => {
                    Alert.alert('Kaydedildi', 'Not güncellendi.');
                    setNotesDraft(null);
                  },
                  onError: (e) => Alert.alert('Hata', getErrorMessage(e)),
                });
              }}
            />
          </>
        ) : (
          <Text style={styles.body}>{rental.notes || 'Not yok.'}</Text>
        )}
      </Card>

      <SectionHeader title="Fotoğraflar" />
      <Card style={styles.block}>
        <PhotoGroup title="Teslim" items={pickup} />
        <PhotoGroup title="İade" items={ret} />
        <PhotoGroup title="Hasar" items={damage} />
        {photos.length === 0 ? (
          <EmptyState
            title="Henüz fotoğraf yok"
            description="Teslim, iade veya hasar fotoğrafı ekleyebilirsiniz."
          />
        ) : null}
        <View style={styles.photoActions}>
          <Button
            title="Teslim fotoğrafı"
            variant="secondary"
            loading={uploadPhoto.isPending}
            onPress={() => void pickPhoto('PICKUP')}
          />
          <Button
            title="İade fotoğrafı"
            variant="secondary"
            loading={uploadPhoto.isPending}
            onPress={() => void pickPhoto('RETURN')}
          />
          <Button
            title="Hasar fotoğrafı"
            variant="secondary"
            loading={uploadPhoto.isPending}
            onPress={() => void pickPhoto('DAMAGE')}
          />
        </View>
      </Card>

      <SectionHeader title="İşlemler" />
      <View style={styles.actions}>
        {rental.status === 'RESERVED' ? (
          <>
            <Button
              title="Düzenle"
              variant="secondary"
              onPress={() => router.push(`/(app)/rentals/${id}/edit`)}
            />
            <Button title="Kiralamayı Başlat" onPress={onStart} disabled={busy} />
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

        {rental.status === 'ACTIVE' || rental.display_status === 'OVERDUE' ? (
          <>
            <Button
              title="Teslim Al"
              onPress={() =>
                Alert.alert(
                  'Yakında',
                  'Teslim alma ve kilometre akışı bir sonraki adımda tamamlanacak.',
                )
              }
            />
            <Button
              title="Ödeme Ekle"
              variant="secondary"
              onPress={() =>
                Alert.alert(
                  'Yakında',
                  'Ödeme kaydı bir sonraki adımda tamamlanacak.',
                )
              }
            />
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

        {(rental.status === 'COMPLETED' || rental.status === 'CANCELLED') && (
          <Text style={styles.meta}>Bu kiralama yalnızca görüntülenebilir.</Text>
        )}
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

function PhotoGroup({
  title,
  items,
}: {
  title: string;
  items: Array<{ id: string; public_url: string | null }>;
}) {
  if (items.length === 0) return null;
  return (
    <View style={styles.photoGroup}>
      <Text style={styles.meta}>{title}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        {items.map((p) =>
          p.public_url ? (
            <Image
              key={p.id}
              source={{ uri: p.public_url }}
              style={styles.thumb}
            />
          ) : null,
        )}
      </ScrollView>
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
  link: { ...typography.label, color: colors.primary },
  row: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
  rowLine: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  flex: { flex: 1 },
  actions: { gap: spacing.sm },
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
  photoActions: { gap: spacing.sm, marginTop: spacing.sm },
  photoGroup: { gap: spacing.xs, marginBottom: spacing.sm },
  thumb: {
    width: 88,
    height: 88,
    borderRadius: 10,
    marginRight: spacing.sm,
    backgroundColor: colors.surfaceMuted,
  },
});
