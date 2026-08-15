export type FuelLevel = 'EMPTY' | 'QUARTER' | 'HALF' | 'THREE_QUARTERS' | 'FULL';

export const FUEL_LEVELS: { value: FuelLevel; label: string; percent: number }[] = [
  { value: 'EMPTY', label: 'Boş', percent: 0 },
  { value: 'QUARTER', label: '1/4', percent: 25 },
  { value: 'HALF', label: '1/2', percent: 50 },
  { value: 'THREE_QUARTERS', label: '3/4', percent: 75 },
  { value: 'FULL', label: 'Dolu', percent: 100 },
];

export function fuelLevelLabel(level?: string | null): string {
  const found = FUEL_LEVELS.find((f) => f.value === level);
  return found?.label ?? level ?? '—';
}

export function fuelLevelPercent(level: FuelLevel): number {
  return FUEL_LEVELS.find((f) => f.value === level)?.percent ?? 0;
}

export function calculateFuelDifference(
  start?: string | null,
  end?: string | null,
): { dropped: boolean; startLabel: string; endLabel: string; deltaPercent: number } {
  const startPct = fuelLevelPercent((start as FuelLevel) || 'FULL');
  const endPct = fuelLevelPercent((end as FuelLevel) || 'FULL');
  return {
    dropped: endPct < startPct,
    startLabel: fuelLevelLabel(start),
    endLabel: fuelLevelLabel(end),
    deltaPercent: startPct - endPct,
  };
}

export function calculateLateDuration(
  plannedEnd: Date,
  actualEnd: Date,
): { lateMinutes: number; lateHours: number; isLate: boolean; label: string } {
  const ms = actualEnd.getTime() - plannedEnd.getTime();
  if (ms <= 0) {
    return { lateMinutes: 0, lateHours: 0, isLate: false, label: 'Gecikme yok' };
  }
  const lateMinutes = Math.ceil(ms / 60000);
  const lateHours = Math.round((lateMinutes / 60) * 10) / 10;
  const hours = Math.floor(lateMinutes / 60);
  const mins = lateMinutes % 60;
  const label =
    hours > 0 ? `${hours} saat ${mins} dk gecikme` : `${mins} dk gecikme`;
  return { lateMinutes, lateHours, isLate: true, label };
}

export const DAMAGE_LOCATIONS: { key: string; label: string }[] = [
  { key: 'FRONT_BUMPER', label: 'Ön tampon' },
  { key: 'REAR_BUMPER', label: 'Arka tampon' },
  { key: 'RIGHT_FRONT_DOOR', label: 'Sağ ön kapı' },
  { key: 'LEFT_FRONT_DOOR', label: 'Sol ön kapı' },
  { key: 'HOOD', label: 'Kaput' },
  { key: 'TRUNK', label: 'Bagaj' },
  { key: 'RIGHT_FENDER', label: 'Sağ çamurluk' },
  { key: 'LEFT_FENDER', label: 'Sol çamurluk' },
  { key: 'INTERIOR', label: 'İç mekan' },
  { key: 'OTHER', label: 'Diğer' },
];

export function damageSeverityLabel(v: 'MINOR' | 'MODERATE' | 'MAJOR'): string {
  switch (v) {
    case 'MINOR':
      return 'Hafif';
    case 'MODERATE':
      return 'Orta';
    case 'MAJOR':
      return 'Ciddi';
  }
}

export function depositStatusLabel(
  v: 'PENDING' | 'HELD' | 'PARTIALLY_REFUNDED' | 'REFUNDED' | 'FORFEITED',
): string {
  switch (v) {
    case 'PENDING':
      return 'Bekliyor';
    case 'HELD':
      return 'Alındı';
    case 'PARTIALLY_REFUNDED':
      return 'Kısmi İade';
    case 'REFUNDED':
      return 'İade Edildi';
    case 'FORFEITED':
      return 'Mahsup Edildi';
  }
}

export function paymentMethodLabel(
  v: 'CASH' | 'CREDIT_CARD' | 'BANK_TRANSFER' | 'OTHER',
): string {
  switch (v) {
    case 'CASH':
      return 'Nakit';
    case 'CREDIT_CARD':
      return 'Kart';
    case 'BANK_TRANSFER':
      return 'Havale/EFT';
    case 'OTHER':
      return 'Diğer';
  }
}

export const EXTRA_CHARGE_TYPES: {
  value: 'FUEL_DIFF' | 'LATE_RETURN' | 'DAMAGE' | 'CLEANING' | 'EXTRA_USAGE' | 'OTHER';
  label: string;
}[] = [
  { value: 'FUEL_DIFF', label: 'Yakıt farkı' },
  { value: 'LATE_RETURN', label: 'Geç teslim' },
  { value: 'DAMAGE', label: 'Hasar' },
  { value: 'CLEANING', label: 'Temizlik' },
  { value: 'EXTRA_USAGE', label: 'Ekstra kullanım' },
  { value: 'OTHER', label: 'Diğer' },
];

export const PHOTO_CATEGORIES: {
  value:
    | 'FRONT'
    | 'BACK'
    | 'LEFT'
    | 'RIGHT'
    | 'INTERIOR'
    | 'ODOMETER'
    | 'FUEL'
    | 'DAMAGE'
    | 'OTHER';
  label: string;
}[] = [
  { value: 'FRONT', label: 'Ön' },
  { value: 'BACK', label: 'Arka' },
  { value: 'LEFT', label: 'Sol' },
  { value: 'RIGHT', label: 'Sağ' },
  { value: 'INTERIOR', label: 'İç' },
  { value: 'ODOMETER', label: 'Kilometre' },
  { value: 'FUEL', label: 'Yakıt' },
  { value: 'DAMAGE', label: 'Hasar' },
  { value: 'OTHER', label: 'Diğer' },
];
