import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { Card, VehicleStatusBadge } from '@/components/ui';
import type { VehicleListItem } from '@/services/vehiclesService';
import { formatCurrency } from '@/utils/currency';
import { fuelLabel, transmissionLabel } from '@/utils/plate';
import { colors, spacing, typography } from '@/theme';

type Props = {
  vehicle: VehicleListItem;
  onPress: () => void;
};

export function VehicleCard({ vehicle, onPress }: Props) {
  const meta = [
    vehicle.model_year ? String(vehicle.model_year) : null,
    fuelLabel(vehicle.fuel_type),
    transmissionLabel(vehicle.transmission),
  ]
    .filter((v) => v && v !== '—')
    .join(' • ');

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${vehicle.brand} ${vehicle.model} ${vehicle.plate}`}
      style={({ pressed }) => pressed && styles.pressed}
    >
      <Card padded={false} style={styles.card}>
        {vehicle.primary_photo_url ? (
          <Image
            source={{ uri: vehicle.primary_photo_url }}
            style={styles.image}
            resizeMode="cover"
          />
        ) : (
          <View style={styles.placeholder}>
            <Text style={styles.placeholderText}>Fotoğraf yok</Text>
          </View>
        )}
        <View style={styles.body}>
          <View style={styles.topRow}>
            <View style={styles.flex}>
              <Text style={styles.title}>
                {vehicle.brand} {vehicle.model}
              </Text>
              <Text style={styles.plate}>{vehicle.plate}</Text>
            </View>
            <VehicleStatusBadge status={vehicle.status} />
          </View>
          {meta ? <Text style={styles.meta}>{meta}</Text> : null}
          <Text style={styles.km}>
            {vehicle.current_km.toLocaleString('tr-TR')} km
          </Text>
          <Text style={styles.price}>
            {formatCurrency(vehicle.daily_price)} / gün
          </Text>
        </View>
      </Card>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pressed: { opacity: 0.92 },
  card: { marginBottom: spacing.md, overflow: 'hidden' },
  image: { width: '100%', height: 160, backgroundColor: colors.surfaceMuted },
  placeholder: {
    height: 140,
    backgroundColor: colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderText: {
    ...typography.caption,
    color: colors.textMuted,
  },
  body: { padding: spacing.lg, gap: spacing.xs },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  flex: { flex: 1 },
  title: { ...typography.subtitle, color: colors.text },
  plate: { ...typography.label, color: colors.textSecondary, marginTop: 2 },
  meta: { ...typography.caption, color: colors.textMuted, marginTop: spacing.xs },
  km: { ...typography.body, color: colors.textSecondary },
  price: { ...typography.bodyMedium, color: colors.primary, marginTop: spacing.xs },
});
