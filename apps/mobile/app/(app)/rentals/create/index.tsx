import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import {
  Button,
  Card,
  EmptyState,
  Input,
  VehicleStatusBadge,
} from '@/components/ui';
import { DateField } from '@/features/vehicles/DateField';
import { CustomerForm } from '@/features/customers/CustomerForm';
import { useCreateRental, useRentalAvailability } from '@/features/rentals/hooks';
import { customersService } from '@/services/customersService';
import { calcRentalPricing } from '@/utils/rentalPricing';
import { rentalsService, type VehiclePickerItem } from '@/services/rentalsService';
import { trDateToIso } from '@/features/vehicles/schemas';
import { formatCurrency } from '@/utils/currency';
import { getErrorMessage } from '@/utils/errors';
import { vehicleStatusLabel } from '@/utils/labels';
import type { Customer } from '@rentaflow/shared';
import { colors, spacing, typography } from '@/theme';

type Step = 1 | 2 | 3 | 4 | 5;

function toIsoDate(tr?: string) {
  return trDateToIso(tr) ?? '';
}

export default function CreateRentalWizardScreen() {
  const router = useRouter();
  const createMutation = useCreateRental();

  const [step, setStep] = useState<Step>(1);
  const [vehicle, setVehicle] = useState<VehiclePickerItem | null>(null);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [customerModal, setCustomerModal] = useState(false);
  const [newCustomerOpen, setNewCustomerOpen] = useState(false);

  const [startDate, setStartDate] = useState('');
  const [startTime, setStartTime] = useState('10:00');
  const [endDate, setEndDate] = useState('');
  const [endTime, setEndTime] = useState('10:00');

  const [dailyPrice, setDailyPrice] = useState('');
  const [discount, setDiscount] = useState('0');
  const [extra, setExtra] = useState('0');
  const [deposit, setDeposit] = useState('0');
  const [notes, setNotes] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  const vehiclesQuery = useQuery({
    queryKey: ['rental-picker-vehicles'],
    queryFn: () => rentalsService.getAvailableVehiclesForPicker(),
  });

  const customersQuery = useQuery({
    queryKey: ['rental-picker-customers'],
    queryFn: () =>
      customersService.getCustomers({ filter: 'ACTIVE', pageSize: 100 }),
  });

  useEffect(() => {
    if (!vehicle) return;
    setDailyPrice(String(vehicle.daily_price ?? ''));
    setDeposit(String(vehicle.deposit_amount ?? 0));
  }, [vehicle]);

  const startIso = toIsoDate(startDate);
  const endIso = toIsoDate(endDate);

  const availability = useRentalAvailability(
    {
      vehicleId: vehicle?.id,
      startDate: startIso,
      startTime,
      endDate: endIso,
      endTime,
    },
    step >= 3 && Boolean(vehicle && startIso && endIso),
  );

  const pricing = useMemo(() => {
    if (!startIso || !endIso || !dailyPrice) return null;
    try {
      return calcRentalPricing({
        dailyPrice: Number(dailyPrice) || 0,
        startDate: startIso,
        startTime,
        endDate: endIso,
        endTime,
        discount: Number(discount) || 0,
        extra: Number(extra) || 0,
        deposit: Number(deposit) || 0,
      });
    } catch (error) {
      return { error: getErrorMessage(error) } as const;
    }
  }, [startIso, endIso, startTime, endTime, dailyPrice, discount, extra, deposit]);

  const canNext = () => {
    if (step === 1) return Boolean(vehicle && vehicle.status === 'AVAILABLE');
    if (step === 2) return Boolean(customer);
    if (step === 3) {
      if (!startIso || !endIso) return false;
      if (`${endIso}T${endTime}` < `${startIso}T${startTime}`) return false;
      return availability.data !== false;
    }
    if (step === 4) {
      return Boolean(pricing && !('error' in pricing));
    }
    return true;
  };

  const goNext = () => {
    setFormError(null);
    if (step === 3) {
      if (`${endIso}T${endTime}` < `${startIso}T${startTime}`) {
        setFormError('Teslim tarihi başlangıç tarihinden önce olamaz.');
        return;
      }
      if (availability.data === false) {
        setFormError('Bu araç seçilen tarihlerde müsait değil.');
        return;
      }
    }
    if (step === 4 && pricing && 'error' in pricing) {
      setFormError(pricing.error);
      return;
    }
    setStep((s) => Math.min(5, s + 1) as Step);
  };

  const submit = async () => {
    if (!vehicle || !customer || !pricing || 'error' in pricing) return;
    setFormError(null);
    try {
      const rental = await createMutation.mutateAsync({
        vehicle_id: vehicle.id,
        customer_id: customer.id,
        start_date: startIso,
        start_time: startTime,
        end_date: endIso,
        end_time: endTime,
        daily_price: Number(dailyPrice) || 0,
        discount_amount: Number(discount) || 0,
        extra_charge: Number(extra) || 0,
        deposit_amount: Number(deposit) || 0,
        notes: notes.trim() || null,
      });
      Alert.alert('Başarılı', 'Kiralama başarıyla oluşturuldu.', [
        {
          text: 'Tamam',
          onPress: () => router.replace(`/(app)/rentals/${rental.id}`),
        },
      ]);
    } catch (error) {
      setFormError(getErrorMessage(error, 'Bu kiralama oluşturulamadı.'));
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.progress}>
        {[1, 2, 3, 4, 5].map((n) => (
          <View
            key={n}
            style={[styles.dot, step >= n && styles.dotActive]}
          />
        ))}
      </View>
      <Text style={styles.stepTitle}>
        {step === 1 && '1. Araç seç'}
        {step === 2 && '2. Müşteri seç'}
        {step === 3 && '3. Tarih ve saat'}
        {step === 4 && '4. Fiyat'}
        {step === 5 && '5. Özet'}
      </Text>

      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        {step === 1 ? (
          <View style={styles.gap}>
            {(vehiclesQuery.data ?? []).map((item) => {
              const selectable = item.status === 'AVAILABLE';
              return (
                <Pressable
                  key={item.id}
                  disabled={!selectable}
                  onPress={() => setVehicle(item)}
                  style={[
                    styles.pickCard,
                    vehicle?.id === item.id && styles.pickActive,
                    !selectable && styles.pickDisabled,
                  ]}
                >
                  <View style={styles.row}>
                    {item.photo_url ? (
                      <Image
                        source={{ uri: item.photo_url }}
                        style={styles.thumb}
                      />
                    ) : (
                      <View style={[styles.thumb, styles.thumbEmpty]}>
                        <Text style={styles.meta}>Araç</Text>
                      </View>
                    )}
                    <View style={styles.grow}>
                      <Text style={styles.pickTitle}>
                        {item.brand} {item.model}
                      </Text>
                      <Text style={styles.meta}>{item.plate}</Text>
                      <Text style={styles.meta}>
                        {formatCurrency(item.daily_price)} / gün
                      </Text>
                    </View>
                    <VehicleStatusBadge status={item.status} />
                  </View>
                  {!selectable ? (
                    <Text style={styles.warn}>
                      {vehicleStatusLabel(item.status)} — seçilemez
                    </Text>
                  ) : null}
                </Pressable>
              );
            })}
          </View>
        ) : null}

        {step === 2 ? (
          <View style={styles.gap}>
            {customer ? (
              <Card>
                <Text style={styles.pickTitle}>
                  {customer.first_name} {customer.last_name}
                </Text>
                <Text style={styles.meta}>{customer.phone}</Text>
              </Card>
            ) : (
              <EmptyState title="Müşteri seçilmedi." />
            )}
            <Button
              title="Müşteri Seç"
              variant="secondary"
              onPress={() => setCustomerModal(true)}
            />
            <Button
              title="Yeni Müşteri"
              onPress={() => setNewCustomerOpen(true)}
            />
          </View>
        ) : null}

        {step === 3 ? (
          <View style={styles.gap}>
            <DateField label="Başlangıç tarihi" value={startDate} onChange={setStartDate} />
            <Input
              label="Başlangıç saati"
              value={startTime}
              onChangeText={setStartTime}
              placeholder="14:00"
            />
            <DateField label="Teslim tarihi" value={endDate} onChange={setEndDate} />
            <Input
              label="Teslim saati"
              value={endTime}
              onChangeText={setEndTime}
              placeholder="14:00"
            />
            {availability.isFetching ? (
              <Text style={styles.meta}>Müsaitlik kontrol ediliyor...</Text>
            ) : null}
            {availability.data === false ? (
              <Text style={styles.error}>
                Bu araç seçilen tarihlerde müsait değil.
              </Text>
            ) : null}
            {availability.data === true ? (
              <Text style={styles.ok}>Araç seçilen tarihlerde müsait.</Text>
            ) : null}
          </View>
        ) : null}

        {step === 4 ? (
          <View style={styles.gap}>
            <Input
              label="Günlük fiyat"
              keyboardType="decimal-pad"
              value={dailyPrice}
              onChangeText={setDailyPrice}
            />
            <Input
              label="İndirim"
              keyboardType="decimal-pad"
              value={discount}
              onChangeText={setDiscount}
            />
            <Input
              label="Ek ücret"
              keyboardType="decimal-pad"
              value={extra}
              onChangeText={setExtra}
            />
            <Input
              label="Ek ücret açıklaması / Not"
              value={notes}
              onChangeText={setNotes}
            />
            <Input
              label="Depozito"
              keyboardType="decimal-pad"
              value={deposit}
              onChangeText={setDeposit}
            />
            {pricing && !('error' in pricing) ? (
              <Card style={styles.gap}>
                <Text style={styles.meta}>{pricing.days} gün</Text>
                <Text style={styles.meta}>
                  Ara toplam: {formatCurrency(pricing.subtotal)}
                </Text>
                <Text style={styles.meta}>
                  İndirim: -{formatCurrency(pricing.discount)}
                </Text>
                <Text style={styles.meta}>
                  Ek ücret: {formatCurrency(pricing.extra)}
                </Text>
                <Text style={styles.pickTitle}>
                  Toplam: {formatCurrency(pricing.total)}
                </Text>
                <Text style={styles.meta}>
                  Depozito: {formatCurrency(pricing.deposit)}
                </Text>
              </Card>
            ) : null}
            {pricing && 'error' in pricing ? (
              <Text style={styles.error}>{pricing.error}</Text>
            ) : null}
          </View>
        ) : null}

        {step === 5 && vehicle && customer && pricing && !('error' in pricing) ? (
          <Card style={styles.gap}>
            <Text style={styles.section}>KİRALAMA ÖZETİ</Text>
            <Text style={styles.pickTitle}>
              {vehicle.brand} {vehicle.model}
            </Text>
            <Text style={styles.meta}>{vehicle.plate}</Text>
            <Text style={styles.pickTitle}>
              {customer.first_name} {customer.last_name}
            </Text>
            <Text style={styles.meta}>
              {startDate} {startTime}
            </Text>
            <Text style={styles.meta}>↓</Text>
            <Text style={styles.meta}>
              {endDate} {endTime}
            </Text>
            <Text style={styles.meta}>
              {pricing.days} Gün · {formatCurrency(Number(dailyPrice) || 0)} / Gün
            </Text>
            <Text style={styles.meta}>
              Ara toplam {formatCurrency(pricing.subtotal)}
            </Text>
            <Text style={styles.meta}>
              İndirim -{formatCurrency(pricing.discount)}
            </Text>
            <Text style={styles.meta}>
              Ek ücret {formatCurrency(pricing.extra)}
            </Text>
            <Text style={styles.pickTitle}>
              TOPLAM {formatCurrency(pricing.total)}
            </Text>
            <Text style={styles.meta}>
              Depozito {formatCurrency(pricing.deposit)}
            </Text>
            <Text style={styles.pickTitle}>
              Ödenecek toplam {formatCurrency(pricing.payable)}
            </Text>
          </Card>
        ) : null}

        {formError ? <Text style={styles.error}>{formError}</Text> : null}
      </ScrollView>

      <View style={styles.footer}>
        {step > 1 ? (
          <Button
            title="Geri"
            variant="ghost"
            onPress={() => setStep((s) => Math.max(1, s - 1) as Step)}
          />
        ) : null}
        {step < 5 ? (
          <Button title="Devam" onPress={goNext} disabled={!canNext()} />
        ) : (
          <Button
            title={
              createMutation.isPending
                ? 'Kiralamayı Oluşturuyor...'
                : 'Kiralamayı Oluştur'
            }
            loading={createMutation.isPending}
            disabled={createMutation.isPending}
            onPress={() => void submit()}
          />
        )}
      </View>

      <Modal visible={customerModal} animationType="slide">
        <View style={styles.modal}>
          <Text style={styles.section}>Müşteri Seç</Text>
          <FlatList
            data={customersQuery.data?.items ?? []}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <Pressable
                style={styles.pickCard}
                onPress={() => {
                  setCustomer(item);
                  setCustomerModal(false);
                }}
              >
                <Text style={styles.pickTitle}>
                  {item.first_name} {item.last_name}
                </Text>
                <Text style={styles.meta}>{item.phone}</Text>
              </Pressable>
            )}
          />
          <Button title="Kapat" variant="ghost" onPress={() => setCustomerModal(false)} />
        </View>
      </Modal>

      <Modal visible={newCustomerOpen} animationType="slide">
        <View style={styles.modal}>
          <CustomerForm
            onCreated={(customerId) => {
              void customersService.getCustomer(customerId).then((c) => {
                setCustomer(c);
                setNewCustomerOpen(false);
                void customersQuery.refetch();
              });
            }}
          />
          <Button
            title="Vazgeç"
            variant="ghost"
            onPress={() => setNewCustomerOpen(false)}
          />
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  progress: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
  dot: {
    flex: 1,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
  },
  dotActive: { backgroundColor: colors.primary },
  stepTitle: {
    ...typography.subtitle,
    color: colors.text,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  content: { paddingHorizontal: spacing.lg, paddingBottom: 24, gap: spacing.md },
  gap: { gap: spacing.md },
  pickCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    padding: spacing.lg,
    marginBottom: spacing.sm,
  },
  pickActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft,
  },
  pickDisabled: { opacity: 0.55 },
  pickTitle: { ...typography.bodyMedium, color: colors.text },
  meta: { ...typography.caption, color: colors.textSecondary },
  thumb: {
    width: 64,
    height: 64,
    borderRadius: 10,
    backgroundColor: colors.surfaceMuted,
    marginRight: spacing.sm,
  },
  thumbEmpty: { alignItems: 'center', justifyContent: 'center' },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
    alignItems: 'center',
  },
  grow: { flex: 1 },
  warn: { ...typography.caption, color: colors.warning, marginTop: 6 },
  error: { ...typography.caption, color: colors.danger },
  ok: { ...typography.caption, color: colors.success },
  section: { ...typography.subtitle, color: colors.text },
  footer: {
    padding: spacing.lg,
    gap: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    backgroundColor: colors.surface,
  },
  modal: { flex: 1, padding: spacing.lg, backgroundColor: colors.background },
});
