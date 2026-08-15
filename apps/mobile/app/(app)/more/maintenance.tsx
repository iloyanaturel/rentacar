import { useMemo, useState } from 'react';
import {
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Button,
  EmptyState,
  ErrorState,
  Input,
  ScreenHeader,
} from '@/components/ui';
import {
  useCompleteMaintenance,
  useCreateMaintenance,
  useMaintenances,
  useStartMaintenance,
} from '@/features/ops/hooks';
import { useVehicles } from '@/features/vehicles/hooks';
import { maintenanceService } from '@/services/maintenanceService';
import { formatCurrency } from '@/utils/currency';
import { formatDate, getTodayIsoInIstanbul } from '@/utils/date';
import { getErrorMessage } from '@/utils/errors';
import {
  maintenanceStatusLabel,
  maintenanceTypeLabel,
} from '@/utils/labels';
import type { MaintenanceType } from '@rentaflow/shared';
import { colors, radius, spacing, typography } from '@/theme';

const TYPES: MaintenanceType[] = [
  'PERIODIC',
  'OIL_CHANGE',
  'TIRES',
  'BRAKES',
  'BATTERY',
  'INSPECTION',
  'OTHER',
];

export default function MaintenanceScreen() {
  const insets = useSafeAreaInsets();
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [formOpen, setFormOpen] = useState(false);
  const query = useMaintenances(
    statusFilter === 'all'
      ? undefined
      : { status: statusFilter as 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED' },
  );
  const start = useStartMaintenance();
  const complete = useCompleteMaintenance();
  const create = useCreateMaintenance();

  const vehiclesQuery = useVehicles({ search: '', status: 'ALL', pageSize: 50 });
  const vehicles = useMemo(
    () => vehiclesQuery.data?.pages.flatMap((p) => p.items) ?? [],
    [vehiclesQuery.data],
  );

  const [vehicleId, setVehicleId] = useState('');
  const [type, setType] = useState<MaintenanceType>('PERIODIC');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(getTodayIsoInIstanbul());
  const [odometer, setOdometer] = useState('');
  const [serviceName, setServiceName] = useState('');
  const [cost, setCost] = useState('');
  const [notes, setNotes] = useState('');

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setDate(getTodayIsoInIstanbul());
    setOdometer('');
    setServiceName('');
    setCost('');
    setNotes('');
    setType('PERIODIC');
  };

  const submit = async () => {
    if (!vehicleId) {
      Alert.alert('Eksik', 'Araç seçiniz.');
      return;
    }
    try {
      await create.mutateAsync({
        vehicleId,
        maintenanceType: type,
        title: title || maintenanceTypeLabel(type),
        description: description || undefined,
        scheduledDate: date,
        odometer: odometer ? Number(odometer) : undefined,
        serviceName: serviceName || undefined,
        cost: cost ? Number(cost.replace(',', '.')) : 0,
        notes: notes || undefined,
        status: 'SCHEDULED',
      });
      setFormOpen(false);
      resetForm();
      Alert.alert('Başarılı', 'Bakım kaydı oluşturuldu.');
    } catch (error) {
      Alert.alert('Hata', getErrorMessage(error, 'Bakım kaydedilemedi.'));
    }
  };

  const onStart = async (id: string) => {
    try {
      await start.mutateAsync(id);
    } catch (error) {
      Alert.alert('Hata', getErrorMessage(error, 'Başlatılamadı.'));
    }
  };

  const onComplete = async (id: string) => {
    try {
      await complete.mutateAsync(id);
      Alert.alert('Tamamlandı', 'Bakım tamamlandı ve masrafa eklendi.');
    } catch (error) {
      Alert.alert('Hata', getErrorMessage(error, 'Tamamlanamadı.'));
    }
  };

  const onCancel = async (id: string) => {
    try {
      await maintenanceService.cancelMaintenance(id);
      void query.refetch();
    } catch (error) {
      Alert.alert('Hata', getErrorMessage(error, 'İptal edilemedi.'));
    }
  };

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <ScreenHeader
        title="Bakım"
        subtitle="Planlı ve tamamlanan bakımlar"
        right={
          <Button title="+ Yeni" onPress={() => setFormOpen(true)} />
        }
      />

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filters}
      >
        {[
          { key: 'all', label: 'Tümü' },
          { key: 'SCHEDULED', label: 'Planlandı' },
          { key: 'IN_PROGRESS', label: 'Devam' },
          { key: 'COMPLETED', label: 'Tamamlandı' },
        ].map((f) => (
          <Pressable
            key={f.key}
            onPress={() => setStatusFilter(f.key)}
            style={[styles.chip, statusFilter === f.key && styles.chipActive]}
          >
            <Text
              style={[
                styles.chipText,
                statusFilter === f.key && styles.chipTextActive,
              ]}
            >
              {f.label}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      <ScrollView contentContainerStyle={styles.list}>
        {query.isError ? (
          <ErrorState
            message="Bakım kayıtları yüklenemedi."
            onRetry={() => void query.refetch()}
          />
        ) : null}
        {!query.isError && (query.data ?? []).length === 0 ? (
          <EmptyState title="Bakım kaydı yok." />
        ) : null}
        {(query.data ?? []).map((item) => (
          <View key={item.id} style={styles.card}>
            <Text style={styles.cardTitle}>
              {item.vehicle_brand} {item.vehicle_model} · {item.vehicle_plate}
            </Text>
            <Text style={styles.cardMeta}>
              {maintenanceTypeLabel(item.maintenance_type)} ·{' '}
              {maintenanceStatusLabel(item.status)}
            </Text>
            <Text style={styles.cardMeta}>
              {formatDate(item.scheduled_date ?? item.maintenance_date)}
              {item.current_km != null
                ? ` · ${item.current_km.toLocaleString('tr-TR')} km`
                : ''}
              {` · ${formatCurrency(item.amount)}`}
            </Text>
            {item.service_name ? (
              <Text style={styles.cardMeta}>{item.service_name}</Text>
            ) : null}
            <View style={styles.actions}>
              {item.status === 'SCHEDULED' ? (
                <Button title="Başlat" variant="secondary" onPress={() => void onStart(item.id)} />
              ) : null}
              {item.status === 'IN_PROGRESS' || item.status === 'SCHEDULED' ? (
                <Button title="Tamamla" onPress={() => void onComplete(item.id)} />
              ) : null}
              {item.status === 'SCHEDULED' || item.status === 'IN_PROGRESS' ? (
                <Button
                  title="İptal"
                  variant="ghost"
                  onPress={() => void onCancel(item.id)}
                />
              ) : null}
            </View>
          </View>
        ))}
      </ScrollView>

      <Modal visible={formOpen} animationType="slide">
        <ScrollView
          contentContainerStyle={[
            styles.form,
            { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 24 },
          ]}
        >
          <Text style={styles.formTitle}>Yeni Bakım</Text>
          <Text style={styles.label}>Araç *</Text>
          <ScrollView horizontal contentContainerStyle={styles.filters}>
            {vehicles.map((v) => (
              <Pressable
                key={v.id}
                onPress={() => setVehicleId(v.id)}
                style={[styles.chip, vehicleId === v.id && styles.chipActive]}
              >
                <Text
                  style={[
                    styles.chipText,
                    vehicleId === v.id && styles.chipTextActive,
                  ]}
                >
                  {v.plate}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
          <Text style={styles.label}>Bakım türü</Text>
          <ScrollView horizontal contentContainerStyle={styles.filters}>
            {TYPES.map((t) => (
              <Pressable
                key={t}
                onPress={() => setType(t)}
                style={[styles.chip, type === t && styles.chipActive]}
              >
                <Text
                  style={[styles.chipText, type === t && styles.chipTextActive]}
                >
                  {maintenanceTypeLabel(t)}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
          <Input label="Başlık" value={title} onChangeText={setTitle} />
          <Input
            label="Açıklama"
            value={description}
            onChangeText={setDescription}
          />
          <Input label="Tarih (YYYY-MM-DD)" value={date} onChangeText={setDate} />
          <Input
            label="Kilometre"
            value={odometer}
            onChangeText={setOdometer}
            keyboardType="number-pad"
          />
          <Input
            label="Servis"
            value={serviceName}
            onChangeText={setServiceName}
          />
          <Input
            label="Maliyet"
            value={cost}
            onChangeText={setCost}
            keyboardType="decimal-pad"
          />
          <Input label="Not" value={notes} onChangeText={setNotes} />
          <Button
            title={create.isPending ? 'Kaydediliyor…' : 'Kaydet'}
            loading={create.isPending}
            onPress={() => void submit()}
          />
          <Button
            title="Kapat"
            variant="ghost"
            onPress={() => setFormOpen(false)}
          />
        </ScrollView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  filters: { paddingHorizontal: spacing.lg, gap: 8, paddingBottom: 8 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    marginRight: 8,
  },
  chipActive: { backgroundColor: colors.primarySoft, borderColor: colors.primary },
  chipText: { ...typography.caption, color: colors.textSecondary },
  chipTextActive: { color: colors.primary, fontFamily: 'DMSans_700Bold' },
  list: { padding: spacing.lg, gap: spacing.sm, paddingBottom: 40 },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: 4,
  },
  cardTitle: { ...typography.bodyMedium, color: colors.text },
  cardMeta: { ...typography.caption, color: colors.textSecondary },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },
  form: { padding: spacing.lg, gap: spacing.md, backgroundColor: colors.background },
  formTitle: { ...typography.title, color: colors.text },
  label: { ...typography.label, color: colors.textSecondary },
});
