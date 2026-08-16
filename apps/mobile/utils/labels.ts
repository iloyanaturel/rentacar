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
