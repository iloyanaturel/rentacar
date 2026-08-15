import { useMemo, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { EmptyState, ErrorState, ScreenHeader } from '@/components/ui';
import {
  findVehicleOverlaps,
  getRangeForView,
  type CalendarEvent,
  type CalendarViewMode,
} from '@/utils/calendar';
import { formatDate, formatTime } from '@/utils/date';
import { rentalStatusLabel } from '@/utils/labels';
import { colors, radius, spacing, typography } from '@/theme';
import { useCalendarRentals } from '@/features/ops/hooks';

const MODES: { key: CalendarViewMode; label: string }[] = [
  { key: 'day', label: 'Gün' },
  { key: 'week', label: 'Hafta' },
  { key: 'month', label: 'Ay' },
];

const STATUS_FILTERS = [
  { key: 'all', label: 'Tümü' },
  { key: 'RESERVED', label: 'Rezervasyon' },
  { key: 'ACTIVE', label: 'Aktif' },
  { key: 'OVERDUE', label: 'Gecikmiş' },
  { key: 'COMPLETED', label: 'Tamamlandı' },
] as const;

function statusColor(status: string) {
  if (status === 'OVERDUE') return colors.danger;
  if (status === 'ACTIVE') return colors.success;
  if (status === 'RESERVED') return colors.info;
  if (status === 'COMPLETED') return colors.textMuted;
  return colors.primary;
}

function EventCard({
  item,
  onPress,
  conflict,
}: {
  item: CalendarEvent;
  onPress: () => void;
  conflict?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.eventCard,
        { borderLeftColor: statusColor(item.status) },
        conflict ? styles.eventConflict : null,
      ]}
    >
      {conflict ? <Text style={styles.conflictBadge}>Çakışma</Text> : null}
      <Text style={styles.eventTitle}>
        {item.brand} {item.model}
      </Text>
      <Text style={styles.eventPlate}>{item.plate}</Text>
      <Text style={styles.eventCustomer}>{item.customer_name}</Text>
      <Text style={styles.eventMeta}>
        {formatDate(item.start_date)} {formatTime(item.start_time)}
        {' → '}
        {formatDate(item.end_date)} {formatTime(item.end_time)}
      </Text>
      <Text style={styles.eventStatus}>{rentalStatusLabel(item.status)}</Text>
    </Pressable>
  );
}

export default function CalendarScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [mode, setMode] = useState<CalendarViewMode>('week');
  const [anchor, setAnchor] = useState(() => new Date());
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [customerQuery, setCustomerQuery] = useState('');
  const [vehicleView, setVehicleView] = useState(false);
  const [selectedVehicleId, setSelectedVehicleId] = useState<string | null>(null);

  const range = useMemo(() => getRangeForView(anchor, mode), [mode, anchor]);

  const query = useCalendarRentals({
    from: range.from,
    to: range.to,
    vehicleId: selectedVehicleId ?? undefined,
    status: statusFilter === 'all' ? undefined : statusFilter,
    customerQ: customerQuery.trim() || undefined,
  });

  const events = query.data ?? [];

  const conflicts = useMemo(() => findVehicleOverlaps(events), [events]);

  const byVehicle = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    for (const e of events) {
      const list = map.get(e.vehicle_id) ?? [];
      list.push(e);
      map.set(e.vehicle_id, list);
    }
    return [...map.entries()].map(([vehicleId, list]) => ({
      vehicleId,
      label: `${list[0]?.brand ?? ''} ${list[0]?.model ?? ''} · ${list[0]?.plate ?? ''}`,
      events: list,
    }));
  }, [events]);

  const daysInRange = useMemo(() => {
    const days: string[] = [];
    const cur = new Date(`${range.from}T12:00:00`);
    const end = new Date(`${range.to}T12:00:00`);
    while (cur <= end) {
      days.push(cur.toISOString().slice(0, 10));
      cur.setDate(cur.getDate() + 1);
    }
    return days;
  }, [range]);

  const shift = (dir: -1 | 1) => {
    const next = new Date(anchor);
    if (mode === 'day') next.setDate(next.getDate() + dir);
    else if (mode === 'week') next.setDate(next.getDate() + dir * 7);
    else next.setMonth(next.getMonth() + dir);
    setAnchor(next);
  };

  const goToday = () => setAnchor(new Date());

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <ScreenHeader
        title="Takvim"
        subtitle={`${formatDate(range.from)} – ${formatDate(range.to)}`}
      />

      <View style={styles.toolbar}>
        <View style={styles.modeRow}>
          {MODES.map((m) => (
            <Pressable
              key={m.key}
              onPress={() => setMode(m.key)}
              style={[styles.modeChip, mode === m.key && styles.modeChipActive]}
            >
              <Text
                style={[styles.modeText, mode === m.key && styles.modeTextActive]}
              >
                {m.label}
              </Text>
            </Pressable>
          ))}
        </View>
        <View style={styles.navRow}>
          <Pressable onPress={() => shift(-1)} style={styles.navBtn}>
            <Text style={styles.navBtnText}>‹</Text>
          </Pressable>
          <Pressable onPress={goToday} style={styles.todayBtn}>
            <Text style={styles.todayText}>Bugün</Text>
          </Pressable>
          <Pressable onPress={() => shift(1)} style={styles.navBtn}>
            <Text style={styles.navBtnText}>›</Text>
          </Pressable>
        </View>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterRow}
      >
        {STATUS_FILTERS.map((f) => (
          <Pressable
            key={f.key}
            onPress={() => setStatusFilter(f.key)}
            style={[
              styles.filterChip,
              statusFilter === f.key && styles.filterChipActive,
            ]}
          >
            <Text
              style={[
                styles.filterText,
                statusFilter === f.key && styles.filterTextActive,
              ]}
            >
              {f.label}
            </Text>
          </Pressable>
        ))}
        <Pressable
          onPress={() => setVehicleView((v) => !v)}
          style={[styles.filterChip, vehicleView && styles.filterChipActive]}
        >
          <Text
            style={[styles.filterText, vehicleView && styles.filterTextActive]}
          >
            Araca Göre
          </Text>
        </Pressable>
        {selectedVehicleId ? (
          <Pressable
            onPress={() => setSelectedVehicleId(null)}
            style={styles.filterChip}
          >
            <Text style={styles.filterText}>Araç filtresini kaldır</Text>
          </Pressable>
        ) : null}
      </ScrollView>

      <TextInput
        value={customerQuery}
        onChangeText={setCustomerQuery}
        placeholder="Müşteri ara…"
        placeholderTextColor={colors.textMuted}
        style={styles.search}
      />

      {query.isError ? (
        <ErrorState
          message={query.error instanceof Error ? query.error.message : 'Hata'}
          onRetry={() => void query.refetch()}
        />
      ) : null}

      {!query.isError && events.length === 0 && !query.isLoading ? (
        <EmptyState
          title="Kayıt yok"
          description="Bu tarih aralığında kiralama bulunamadı."
        />
      ) : null}

      {vehicleView ? (
        <ScrollView horizontal contentContainerStyle={styles.ganttWrap}>
          <View>
            <View style={styles.ganttHeader}>
              <View style={styles.ganttLabelCol}>
                <Text style={styles.ganttHeadText}>Araç</Text>
              </View>
              {daysInRange.map((d) => (
                <View key={d} style={styles.ganttDay}>
                  <Text style={styles.ganttHeadText}>{d.slice(8)}</Text>
                </View>
              ))}
            </View>
            {byVehicle.map((row) => (
              <View key={row.vehicleId} style={styles.ganttRow}>
                <Pressable
                  style={styles.ganttLabelCol}
                  onPress={() =>
                    setSelectedVehicleId((cur) =>
                      cur === row.vehicleId ? null : row.vehicleId,
                    )
                  }
                >
                  <Text style={styles.ganttLabel} numberOfLines={2}>
                    {row.label}
                  </Text>
                </Pressable>
                <View style={styles.ganttTrack}>
                  {daysInRange.map((d) => {
                    const hit = row.events.some(
                      (e) => e.start_date <= d && e.end_date >= d,
                    );
                    const conflict = row.events.some((e) =>
                      conflicts.has(e.rental_id),
                    );
                    return (
                      <View
                        key={d}
                        style={[
                          styles.ganttCell,
                          hit ? styles.ganttFilled : null,
                          hit && conflict ? styles.ganttConflict : null,
                        ]}
                      />
                    );
                  })}
                </View>
              </View>
            ))}
          </View>
        </ScrollView>
      ) : (
        <ScrollView contentContainerStyle={styles.list}>
          {events.map((item) => (
            <EventCard
              key={item.rental_id}
              item={item}
              conflict={conflicts.has(item.rental_id)}
              onPress={() => router.push(`/(app)/rentals/${item.rental_id}`)}
            />
          ))}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  toolbar: { paddingHorizontal: spacing.lg, gap: spacing.sm },
  modeRow: { flexDirection: 'row', gap: 8 },
  modeChip: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  modeChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  modeText: {
    ...typography.caption,
    color: colors.textSecondary,
    fontFamily: 'DMSans_700Bold',
  },
  modeTextActive: { color: '#fff' },
  navRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  navBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  navBtnText: { fontSize: 22, color: colors.text },
  todayBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: radius.full,
    backgroundColor: colors.primarySoft,
  },
  todayText: {
    ...typography.caption,
    color: colors.primary,
    fontFamily: 'DMSans_700Bold',
  },
  filterRow: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radius.full,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    marginRight: 8,
  },
  filterChipActive: {
    backgroundColor: colors.primarySoft,
    borderColor: colors.primary,
  },
  filterText: { ...typography.caption, color: colors.textSecondary },
  filterTextActive: { color: colors.primary, fontFamily: 'DMSans_700Bold' },
  search: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: colors.surface,
    color: colors.text,
    fontFamily: 'DMSans_400Regular',
  },
  list: { padding: spacing.lg, gap: spacing.sm, paddingBottom: 40 },
  eventCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    borderLeftWidth: 4,
    padding: spacing.md,
    gap: 4,
  },
  eventConflict: { borderColor: colors.danger, backgroundColor: '#FEF2F2' },
  conflictBadge: {
    ...typography.caption,
    color: colors.danger,
    fontFamily: 'DMSans_700Bold',
  },
  eventTitle: {
    ...typography.body,
    fontFamily: 'DMSans_700Bold',
    color: colors.text,
  },
  eventPlate: {
    ...typography.caption,
    color: colors.primary,
    fontFamily: 'DMSans_700Bold',
  },
  eventCustomer: { ...typography.body, color: colors.textSecondary },
  eventMeta: { ...typography.caption, color: colors.textMuted },
  eventStatus: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 4,
  },
  ganttWrap: { padding: spacing.lg, paddingBottom: 40 },
  ganttHeader: { flexDirection: 'row', marginBottom: 8 },
  ganttRow: { flexDirection: 'row', marginBottom: 6, alignItems: 'center' },
  ganttLabelCol: { width: 120, paddingRight: 8 },
  ganttLabel: {
    ...typography.caption,
    color: colors.text,
    fontFamily: 'DMSans_500Medium',
  },
  ganttHeadText: {
    ...typography.caption,
    color: colors.textMuted,
    textAlign: 'center',
  },
  ganttDay: { width: 36 },
  ganttTrack: { flexDirection: 'row' },
  ganttCell: {
    width: 36,
    height: 28,
    borderRadius: 4,
    backgroundColor: colors.surfaceMuted,
    marginRight: 2,
  },
  ganttFilled: { backgroundColor: colors.primary },
  ganttConflict: { backgroundColor: colors.danger },
});
