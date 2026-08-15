import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
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
  StatCard,
} from '@/components/ui';
import {
  useArchiveCustomer,
  useCustomer,
  useCustomerRentals,
  useCustomerStats,
} from '@/features/customers/hooks';
import { formatCurrency } from '@/utils/currency';
import { APP_TIMEZONE, formatDate } from '@/utils/date';
import { getErrorMessage } from '@/utils/errors';
import { DocumentExpiryRow } from '@/features/vehicles/DocumentExpiryRow';
import { formatInTimeZone } from 'date-fns-tz';
import { colors, spacing, typography } from '@/theme';

function displayRentalStatus(
  status: string,
  endDate: string,
): 'RESERVED' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED' | 'OVERDUE' {
  if (status !== 'ACTIVE') {
    return status as 'RESERVED' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED' | 'OVERDUE';
  }
  const today = formatInTimeZone(new Date(), APP_TIMEZONE, 'yyyy-MM-dd');
  return endDate < today ? 'OVERDUE' : 'ACTIVE';
}

export default function CustomerDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const customerQuery = useCustomer(id);
  const statsQuery = useCustomerStats(id);
  const rentalsQuery = useCustomerRentals(id);
  const archiveMutation = useArchiveCustomer();

  if (customerQuery.isLoading) {
    return (
      <ScrollView contentContainerStyle={styles.content}>
        <LoadingSkeleton height={120} />
        <LoadingSkeleton height={180} style={{ marginTop: 12 }} />
      </ScrollView>
    );
  }

  if (customerQuery.isError || !customerQuery.data) {
    return (
      <ErrorState
        message="Müşteri bilgileri yüklenemedi."
        onRetry={() => void customerQuery.refetch()}
      />
    );
  }

  const customer = customerQuery.data;
  const stats = statsQuery.data;

  const archive = () => {
    const hadHistory = (rentalsQuery.data?.length ?? 0) > 0;
    Alert.alert(
      'Müşteriyi Pasife Al',
      hadHistory
        ? 'Bu müşterinin geçmiş kiralama kayıtları bulunduğu için silinmesi önerilmez. Pasife almak ister misiniz?'
        : 'Müşteri listeden kaldırılacak. Devam edilsin mi?',
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'Pasife Al',
          style: 'destructive',
          onPress: () => {
            void (async () => {
              try {
                await archiveMutation.mutateAsync(id);
                Alert.alert('Tamam', 'Müşteri pasife alındı.', [
                  {
                    text: 'Tamam',
                    onPress: () => router.replace('/(app)/customers'),
                  },
                ]);
              } catch (error) {
                Alert.alert(
                  'Hata',
                  getErrorMessage(error, 'Müşteri pasife alınamadı.'),
                );
              }
            })();
          },
        },
      ],
    );
  };

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Card style={styles.block}>
        <Text style={styles.name}>
          {customer.first_name} {customer.last_name}
        </Text>
        <Text style={styles.meta}>{customer.phone || '—'}</Text>
        <Text style={styles.meta}>{customer.email || '—'}</Text>
      </Card>

      <SectionHeader title="Ehliyet" />
      <Card style={styles.block}>
        <Text style={styles.meta}>No: {customer.license_number || '—'}</Text>
        <DocumentExpiryRow label="Geçerlilik" date={customer.license_expiry} />
      </Card>

      <SectionHeader title="Finansal Özet" />
      <View style={styles.kpi}>
        <StatCard label="Toplam kiralama" value={stats?.rental_count ?? 0} />
        <StatCard
          label="Toplam harcama"
          value={formatCurrency(stats?.total_spend ?? 0)}
        />
        <StatCard
          label="Toplam ödenen"
          value={formatCurrency(stats?.total_paid ?? 0)}
        />
        <StatCard
          label="Açık bakiye"
          value={formatCurrency(stats?.open_balance ?? 0)}
        />
      </View>

      <SectionHeader title="Kiralama Geçmişi" />
      {(rentalsQuery.data ?? []).length === 0 ? (
        <EmptyState title="Henüz kiralama yok." />
      ) : (
        (rentalsQuery.data ?? []).map((rental) => (
          <Pressable
            key={rental.id}
            onPress={() => router.push(`/(app)/rentals/${rental.id}`)}
          >
            <Card style={styles.history}>
              <View style={styles.row}>
                <View style={styles.flex}>
                  <Text style={styles.historyTitle}>
                    {rental.vehicle_brand} {rental.vehicle_model}
                  </Text>
                  <Text style={styles.meta}>{rental.vehicle_plate}</Text>
                </View>
                <RentalStatusBadge
                  status={displayRentalStatus(rental.status, rental.end_date)}
                />
              </View>
              <Text style={styles.meta}>
                {formatDate(rental.start_date)} → {formatDate(rental.end_date)} ·{' '}
                {rental.total_days} gün
              </Text>
              <Text style={styles.meta}>
                Toplam {formatCurrency(rental.total_amount)} · Ödenen{' '}
                {formatCurrency(rental.paid_amount)} · Kalan{' '}
                {formatCurrency(rental.remaining_amount)}
              </Text>
              <PaymentStatusBadge status={rental.payment_status} />
            </Card>
          </Pressable>
        ))
      )}

      <View style={styles.actions}>
        <Button
          title="Düzenle"
          variant="secondary"
          onPress={() => router.push(`/(app)/customers/${id}/edit`)}
        />
        <Button title="Pasife Al" variant="danger" onPress={archive} />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, gap: spacing.md, paddingBottom: 40 },
  block: { gap: 4 },
  name: { ...typography.title, color: colors.text },
  meta: { ...typography.caption, color: colors.textSecondary },
  kpi: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  history: { marginBottom: spacing.sm, gap: 4 },
  historyTitle: { ...typography.bodyMedium, color: colors.text },
  row: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
  flex: { flex: 1 },
  actions: { gap: spacing.sm, marginTop: spacing.md },
});
