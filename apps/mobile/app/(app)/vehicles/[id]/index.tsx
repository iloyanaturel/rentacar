import { useState } from 'react';
import {
  Alert,
  Modal,
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
  SectionHeader,
  StatCard,
  VehicleStatusBadge,
} from '@/components/ui';
import { DocumentExpiryRow } from '@/features/vehicles/DocumentExpiryRow';
import { VehiclePhotoGallery } from '@/features/vehicles/VehiclePhotoGallery';
import { MANUAL_STATUS_OPTIONS } from '@/features/vehicles/constants';
import {
  useArchiveVehicle,
  useDeleteVehiclePhoto,
  useSetPrimaryPhoto,
  useUpdateMileage,
  useUpdateVehicleStatus,
  useUploadVehiclePhoto,
  useVehicle,
  useVehicleExpenses,
  useVehicleMaintenance,
  useVehiclePhotos,
  useVehicleRentals,
  useVehicleStats,
} from '@/features/vehicles/hooks';
import { formatCurrency } from '@/utils/currency';
import { formatDate } from '@/utils/date';
import { getErrorMessage } from '@/utils/errors';
import { vehicleStatusLabel } from '@/utils/labels';
import { fuelLabel, transmissionLabel } from '@/utils/plate';
import type { VehicleStatus } from '@rentaflow/shared';
import { colors, spacing, typography } from '@/theme';

type TabKey = 'general' | 'rentals' | 'maintenance' | 'expenses' | 'documents';

const TABS: { key: TabKey; label: string }[] = [
  { key: 'general', label: 'Genel' },
  { key: 'rentals', label: 'Kiralamalar' },
  { key: 'maintenance', label: 'Bakım' },
  { key: 'expenses', label: 'Masraflar' },
  { key: 'documents', label: 'Belgeler' },
];

export default function VehicleDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [tab, setTab] = useState<TabKey>('general');
  const [statusOpen, setStatusOpen] = useState(false);
  const [mileageOpen, setMileageOpen] = useState(false);
  const [mileageInput, setMileageInput] = useState('');

  const vehicleQuery = useVehicle(id);
  const photosQuery = useVehiclePhotos(id);
  const statsQuery = useVehicleStats(id);
  const rentalsQuery = useVehicleRentals(id);
  const maintenanceQuery = useVehicleMaintenance(id);
  const expensesQuery = useVehicleExpenses(id);

  const uploadPhoto = useUploadVehiclePhoto(id);
  const deletePhoto = useDeleteVehiclePhoto(id);
  const setPrimary = useSetPrimaryPhoto(id);
  const updateStatus = useUpdateVehicleStatus(id);
  const updateMileage = useUpdateMileage(id);
  const archiveVehicle = useArchiveVehicle();

  if (vehicleQuery.isLoading) {
    return (
      <ScrollView contentContainerStyle={styles.content}>
        <LoadingSkeleton height={180} />
        <LoadingSkeleton height={80} style={{ marginTop: 12 }} />
        <LoadingSkeleton height={200} style={{ marginTop: 12 }} />
      </ScrollView>
    );
  }

  if (vehicleQuery.isError || !vehicleQuery.data) {
    return (
      <ErrorState
        message="Aracın bilgileri yüklenemedi."
        onRetry={() => void vehicleQuery.refetch()}
      />
    );
  }

  const vehicle = vehicleQuery.data;

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
      await uploadPhoto.mutateAsync(result.assets[0].uri);
      Alert.alert('Başarılı', 'Fotoğraf yüklendi.');
    } catch (error) {
      Alert.alert('Hata', getErrorMessage(error, 'Fotoğraf yüklenemedi.'));
    }
  };

  const changeStatus = async (status: VehicleStatus) => {
    setStatusOpen(false);
    try {
      await updateStatus.mutateAsync(status);
      Alert.alert('Başarılı', `Durum: ${vehicleStatusLabel(status)}`);
    } catch (error) {
      Alert.alert('Hata', getErrorMessage(error, 'Durum güncellenemedi.'));
    }
  };

  const submitMileage = async () => {
    const km = Number(mileageInput.replace(/\./g, ''));
    if (Number.isNaN(km)) {
      Alert.alert('Hata', 'Geçerli bir kilometre giriniz.');
      return;
    }
    try {
      await updateMileage.mutateAsync({ kilometers: km });
      setMileageOpen(false);
      Alert.alert('Başarılı', 'Kilometre güncellendi.');
    } catch (error) {
      Alert.alert('Hata', getErrorMessage(error, 'Kilometre güncellenemedi.'));
    }
  };

  const confirmArchive = () => {
    Alert.alert(
      'Aracı Sil',
      'Araç listeden kaldırılacak (pasife alınacak). Devam edilsin mi?',
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'Sil',
          style: 'destructive',
          onPress: () => {
            void (async () => {
              try {
                await archiveVehicle.mutateAsync(id);
                Alert.alert('Tamam', 'Araç silindi.', [
                  { text: 'Tamam', onPress: () => router.replace('/(app)/vehicles') },
                ]);
              } catch (error) {
                Alert.alert('Hata', getErrorMessage(error, 'Araç silinemedi.'));
              }
            })();
          },
        },
      ],
    );
  };

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <VehiclePhotoGallery
        photos={photosQuery.data ?? []}
        uploading={uploadPhoto.isPending}
        onAdd={() => void pickPhoto()}
        onDelete={(photo) => {
          void deletePhoto.mutateAsync(photo).catch((error) => {
            Alert.alert('Hata', getErrorMessage(error, 'Fotoğraf silinemedi.'));
          });
        }}
        onSetPrimary={(photoId) => {
          void setPrimary.mutateAsync(photoId).catch((error) => {
            Alert.alert(
              'Hata',
              getErrorMessage(error, 'Ana fotoğraf güncellenemedi.'),
            );
          });
        }}
      />

      <View style={styles.titleRow}>
        <View style={styles.flex}>
          <Text style={styles.title}>
            {vehicle.brand} {vehicle.model}
          </Text>
          <Text style={styles.plate}>{vehicle.plate}</Text>
        </View>
        <VehicleStatusBadge status={vehicle.status} />
      </View>

      <View style={styles.actions}>
        <Button
          title="Düzenle"
          variant="secondary"
          onPress={() => router.push(`/(app)/vehicles/${id}/edit`)}
        />
        <Button title="Durumu Değiştir" onPress={() => setStatusOpen(true)} />
        <Button
          title="Kilometre Güncelle"
          variant="secondary"
          onPress={() => {
            setMileageInput(String(vehicle.current_km));
            setMileageOpen(true);
          }}
        />
        <Button
          title="Kiralama Oluştur"
          variant="ghost"
          onPress={() => {
            // TODO(STEP 5): navigate to rental create with vehicleId
            Alert.alert(
              'Yakında',
              'Kiralama oluşturma bir sonraki adımda eklenecek.',
            );
          }}
        />
        <Button title="Aracı Sil" variant="danger" onPress={confirmArchive} />
      </View>

      {statsQuery.data ? (
        <>
          <SectionHeader title="Finansal Özet" />
          <View style={styles.kpiGrid}>
            <StatCard label="Toplam Kiralama" value={statsQuery.data.rental_count} />
            <StatCard
              label="Kiralama Günü"
              value={statsQuery.data.rental_days}
            />
            <StatCard
              label="Toplam Gelir"
              value={formatCurrency(statsQuery.data.total_rental_amount)}
            />
            <StatCard
              label="Toplam Masraf"
              value={formatCurrency(statsQuery.data.total_expense_amount)}
            />
            <StatCard
              label="Net"
              value={formatCurrency(statsQuery.data.gross_contribution)}
            />
            <StatCard
              label="Bu Ay Doluluk"
              value={`%${statsQuery.data.month_utilization_rate ?? 0}`}
            />
          </View>
        </>
      ) : null}

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.tabs}
      >
        {TABS.map((item) => (
          <Pressable
            key={item.key}
            onPress={() => setTab(item.key)}
            style={[styles.tab, tab === item.key && styles.tabActive]}
          >
            <Text
              style={[styles.tabText, tab === item.key && styles.tabTextActive]}
            >
              {item.label}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      {tab === 'general' ? (
        <Card style={styles.block}>
          <InfoRow label="Marka" value={vehicle.brand} />
          <InfoRow label="Model" value={vehicle.model} />
          <InfoRow
            label="Yıl"
            value={vehicle.model_year ? String(vehicle.model_year) : '—'}
          />
          <InfoRow label="Renk" value={vehicle.color ?? '—'} />
          <InfoRow label="Yakıt" value={fuelLabel(vehicle.fuel_type)} />
          <InfoRow
            label="Vites"
            value={transmissionLabel(vehicle.transmission)}
          />
          <InfoRow
            label="Kilometre"
            value={`${vehicle.current_km.toLocaleString('tr-TR')} km`}
          />
          <InfoRow
            label="Günlük fiyat"
            value={formatCurrency(vehicle.daily_price)}
          />
          <InfoRow
            label="Depozito"
            value={formatCurrency(vehicle.deposit_amount)}
          />
          {vehicle.notes ? <InfoRow label="Not" value={vehicle.notes} /> : null}
        </Card>
      ) : null}

      {tab === 'documents' ? (
        <Card style={styles.block}>
          <DocumentExpiryRow label="Sigorta" date={vehicle.insurance_expiry} />
          <DocumentExpiryRow label="Kasko" date={vehicle.casco_expiry} />
          <DocumentExpiryRow label="Muayene" date={vehicle.inspection_expiry} />
        </Card>
      ) : null}

      {tab === 'rentals' ? (
        <View style={styles.block}>
          {(rentalsQuery.data ?? []).length === 0 ? (
            <EmptyState
              title="Henüz kiralama yok."
              description="Bu araca ait kiralama geçmişi burada listelenir."
            />
          ) : (
            (rentalsQuery.data ?? []).map((rental) => (
              <Card key={rental.id} style={styles.historyCard}>
                <Text style={styles.historyTitle}>{rental.customer_name}</Text>
                <Text style={styles.historyMeta}>
                  {formatDate(rental.start_date)} → {formatDate(rental.end_date)}
                </Text>
                <Text style={styles.historyMeta}>
                  {formatCurrency(rental.total_amount)} · {rental.status}
                </Text>
              </Card>
            ))
          )}
        </View>
      ) : null}

      {tab === 'maintenance' ? (
        <View style={styles.block}>
          {(maintenanceQuery.data ?? []).length === 0 ? (
            <EmptyState title="Bakım kaydı yok." />
          ) : (
            (maintenanceQuery.data ?? []).map((item) => (
              <Card key={item.id} style={styles.historyCard}>
                <Text style={styles.historyTitle}>{item.maintenance_type}</Text>
                <Text style={styles.historyMeta}>
                  {formatDate(item.maintenance_date)} ·{' '}
                  {formatCurrency(item.amount)}
                </Text>
                {item.description ? (
                  <Text style={styles.historyMeta}>{item.description}</Text>
                ) : null}
              </Card>
            ))
          )}
        </View>
      ) : null}

      {tab === 'expenses' ? (
        <View style={styles.block}>
          {(expensesQuery.data ?? []).length === 0 ? (
            <EmptyState title="Masraf kaydı yok." />
          ) : (
            (expensesQuery.data ?? []).map((item) => (
              <Card key={item.id} style={styles.historyCard}>
                <Text style={styles.historyTitle}>{item.category}</Text>
                <Text style={styles.historyMeta}>
                  {formatDate(item.expense_date)} · {formatCurrency(item.amount)}
                </Text>
                {item.description ? (
                  <Text style={styles.historyMeta}>{item.description}</Text>
                ) : null}
              </Card>
            ))
          )}
        </View>
      ) : null}

      <Modal visible={statusOpen} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Durumu Değiştir</Text>
            {vehicle.status === 'RENTED' ? (
              <Text style={styles.modalHint}>
                Bu araç aktif bir kiralamada olduğu için durumu değiştirilemez.
              </Text>
            ) : (
              MANUAL_STATUS_OPTIONS.map((option) => (
                <Button
                  key={option.value}
                  title={option.label}
                  variant="secondary"
                  onPress={() => void changeStatus(option.value)}
                  style={{ marginBottom: 8 }}
                />
              ))
            )}
            <Button title="Kapat" variant="ghost" onPress={() => setStatusOpen(false)} />
          </View>
        </View>
      </Modal>

      <Modal visible={mileageOpen} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Kilometre Güncelle</Text>
            <Text style={styles.modalHint}>
              Mevcut: {vehicle.current_km.toLocaleString('tr-TR')} km
            </Text>
            <TextInput
              value={mileageInput}
              onChangeText={setMileageInput}
              keyboardType="number-pad"
              style={styles.mileageInput}
              placeholder="Yeni kilometre"
              placeholderTextColor={colors.textMuted}
            />
            <Button
              title={updateMileage.isPending ? 'Kaydediliyor...' : 'Kaydet'}
              loading={updateMileage.isPending}
              onPress={() => void submitMileage()}
            />
            <Button title="İptal" variant="ghost" onPress={() => setMileageOpen(false)} />
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, paddingBottom: 40, gap: spacing.md },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.md,
    alignItems: 'flex-start',
  },
  flex: { flex: 1 },
  title: { ...typography.title, color: colors.text },
  plate: { ...typography.label, color: colors.textSecondary, marginTop: 4 },
  actions: { gap: spacing.sm },
  kpiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  tabs: { gap: spacing.sm, paddingVertical: spacing.sm },
  tab: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    minHeight: 40,
    justifyContent: 'center',
  },
  tabActive: {
    backgroundColor: colors.primarySoft,
    borderColor: colors.primary,
  },
  tabText: { ...typography.caption, color: colors.textSecondary },
  tabTextActive: { color: colors.primary, fontFamily: 'DMSans_600SemiBold' },
  block: { gap: spacing.xs },
  infoRow: {
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  infoLabel: { ...typography.caption, color: colors.textMuted },
  infoValue: { ...typography.bodyMedium, color: colors.text, marginTop: 2 },
  historyCard: { marginBottom: spacing.sm },
  historyTitle: { ...typography.bodyMedium, color: colors.text },
  historyMeta: { ...typography.caption, color: colors.textSecondary, marginTop: 2 },
  modalOverlay: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: 'center',
    padding: spacing.xl,
  },
  modalCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: spacing.xl,
    gap: spacing.sm,
  },
  modalTitle: { ...typography.subtitle, color: colors.text },
  modalHint: { ...typography.body, color: colors.textSecondary },
  mileageInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    minHeight: 52,
    paddingHorizontal: spacing.lg,
    ...typography.body,
    color: colors.text,
    marginVertical: spacing.sm,
  },
});
