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

export function roleLabel(role: 'admin' | 'staff' | 'viewer'): string {
  switch (role) {
    case 'admin':
      return 'Yönetici';
    case 'staff':
      return 'Personel';
    case 'viewer':
      return 'İzleyici';
  }
}
