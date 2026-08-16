/**
 * Normalize plate for uniqueness checks / storage consistency.
 * Keeps readable spacing for TR plates when possible.
 */
export function normalizePlateKey(plate: string): string {
  return plate.replace(/\s+/g, '').toUpperCase();
}

export function formatPlateDisplay(plate: string): string {
  const key = normalizePlateKey(plate);
  // Common TR pattern: 2 digits + letters + digits → "34 ABC 123"
  const match = key.match(/^(\d{2})([A-Z]{1,3})(\d{2,5})$/);
  if (match) {
    return `${match[1]} ${match[2]} ${match[3]}`;
  }
  return plate.trim().toUpperCase();
}

export function fuelLabel(value?: string | null): string {
  switch (value) {
    case 'GASOLINE':
      return 'Benzin';
    case 'DIESEL':
      return 'Dizel';
    case 'HYBRID':
      return 'Hibrit';
    case 'ELECTRIC':
      return 'Elektrik';
    case 'LPG':
      return 'LPG';
    default:
      return value ? 'Diğer' : '—';
  }
}

export function transmissionLabel(value?: string | null): string {
  switch (value) {
    case 'MANUAL':
      return 'Manuel';
    case 'AUTOMATIC':
      return 'Otomatik';
    case 'SEMI_AUTOMATIC':
      return 'Yarı Otomatik';
    default:
      return value ? 'Diğer' : '—';
  }
}
