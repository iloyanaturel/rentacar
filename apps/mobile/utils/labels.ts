import { computePaymentStatus } from '@rentaflow/shared';

export { computePaymentStatus };

export function paymentStatusLabel(
  status: 'PAID' | 'PARTIALLY_PAID' | 'UNPAID',
): string {
  switch (status) {
    case 'PAID':
      return 'Ödendi';
    case 'PARTIALLY_PAID':
      return 'Kısmi ödeme';
    case 'UNPAID':
      return 'Ödeme bekliyor';
  }
}

export function vehicleStatusLabel(
  status: 'AVAILABLE' | 'RENTED' | 'MAINTENANCE' | 'INACTIVE',
): string {
  switch (status) {
    case 'AVAILABLE':
      return 'Müsait';
    case 'RENTED':
      return 'Kirada';
    case 'MAINTENANCE':
      return 'Bakımda';
    case 'INACTIVE':
      return 'Pasif';
  }
}

export function rentalStatusLabel(
  status: 'RESERVED' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED' | 'OVERDUE',
): string {
  switch (status) {
    case 'RESERVED':
      return 'Rezervasyon';
    case 'ACTIVE':
      return 'Aktif';
    case 'COMPLETED':
      return 'Tamamlandı';
    case 'CANCELLED':
      return 'İptal';
    case 'OVERDUE':
      return 'Gecikmiş';
  }
}

export function maskPhone(phone?: string | null): string {
  if (!phone) return '—';
  const digits = phone.replace(/\D/g, '');
  if (digits.length < 7) return phone;
  return `${digits.slice(0, 4)} XXX XX ${digits.slice(-2)}`;
}

export function roleLabel(
  role: 'owner' | 'admin' | 'manager' | 'staff' | 'viewer' | string,
): string {
  switch (role) {
    case 'owner':
      return 'Sahip';
    case 'admin':
      return 'Yönetici';
    case 'manager':
      return 'Müdür';
    case 'staff':
      return 'Personel';
    case 'viewer':
      return 'İzleyici';
    default:
      return role;
  }
}

export function userStatusLabel(s: 'ACTIVE' | 'INVITED' | 'SUSPENDED' | string): string {
  switch (s) {
    case 'ACTIVE':
      return 'Aktif';
    case 'INVITED':
      return 'Davetli';
    case 'SUSPENDED':
      return 'Pasif';
    default:
      return s;
  }
}

export function maintenanceTypeLabel(
  t:
    | 'PERIODIC'
    | 'OIL_CHANGE'
    | 'TIRES'
    | 'BRAKES'
    | 'BATTERY'
    | 'INSPECTION'
    | 'OTHER'
    | string,
): string {
  switch (t) {
    case 'PERIODIC':
      return 'Periyodik bakım';
    case 'OIL_CHANGE':
      return 'Yağ değişimi';
    case 'TIRES':
      return 'Lastik';
    case 'BRAKES':
      return 'Fren';
    case 'BATTERY':
      return 'Akü';
    case 'INSPECTION':
      return 'Muayene';
    case 'OTHER':
      return 'Diğer';
    default:
      return t;
  }
}

export function maintenanceStatusLabel(
  s: 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED',
): string {
  switch (s) {
    case 'SCHEDULED':
      return 'Planlandı';
    case 'IN_PROGRESS':
      return 'Devam ediyor';
    case 'COMPLETED':
      return 'Tamamlandı';
    case 'CANCELLED':
      return 'İptal';
  }
}

export function expenseCategoryLabel(
  c:
    | 'MAINTENANCE'
    | 'FUEL'
    | 'INSURANCE'
    | 'CASCO'
    | 'TAX'
    | 'TIRES'
    | 'REPAIR'
    | 'CLEANING'
    | 'TOLL'
    | 'PARKING'
    | 'OTHER'
    | string,
): string {
  switch (c) {
    case 'MAINTENANCE':
      return 'Bakım';
    case 'FUEL':
      return 'Yakıt';
    case 'INSURANCE':
      return 'Sigorta';
    case 'CASCO':
      return 'Kasko';
    case 'TAX':
      return 'Vergi';
    case 'TIRES':
      return 'Lastik';
    case 'REPAIR':
      return 'Onarım';
    case 'CLEANING':
      return 'Temizlik';
    case 'TOLL':
      return 'HGS/OGS';
    case 'PARKING':
      return 'Otopark';
    case 'OTHER':
      return 'Diğer';
    default:
      return c;
  }
}
