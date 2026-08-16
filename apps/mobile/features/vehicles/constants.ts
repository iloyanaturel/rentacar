import type { FuelType, TransmissionType, VehicleStatus } from '@rentaflow/shared';

export const VEHICLE_PAGE_SIZE = 20;

export const FUEL_OPTIONS: { value: FuelType; label: string }[] = [
  { value: 'GASOLINE', label: 'Benzin' },
  { value: 'DIESEL', label: 'Dizel' },
  { value: 'HYBRID', label: 'Hibrit' },
  { value: 'ELECTRIC', label: 'Elektrik' },
  { value: 'LPG', label: 'LPG' },
  { value: 'OTHER', label: 'Diğer' },
];

export const TRANSMISSION_OPTIONS: { value: TransmissionType; label: string }[] =
  [
    { value: 'MANUAL', label: 'Manuel' },
    { value: 'AUTOMATIC', label: 'Otomatik' },
    { value: 'SEMI_AUTOMATIC', label: 'Yarı Otomatik' },
    { value: 'OTHER', label: 'Diğer' },
  ];

export const VEHICLE_STATUS_FILTERS: {
  value: VehicleStatus | 'ALL';
  label: string;
}[] = [
  { value: 'ALL', label: 'Tümü' },
  { value: 'AVAILABLE', label: 'Müsait' },
  { value: 'RENTED', label: 'Kirada' },
  { value: 'MAINTENANCE', label: 'Bakımda' },
  { value: 'INACTIVE', label: 'Pasif' },
];

export const MANUAL_STATUS_OPTIONS: { value: VehicleStatus; label: string }[] =
  [
    { value: 'AVAILABLE', label: 'Müsait' },
    { value: 'MAINTENANCE', label: 'Bakımda' },
    { value: 'INACTIVE', label: 'Pasif' },
  ];

export const DOCUMENT_EXPIRY_FILTERS = [
  { value: 'ALL' as const, label: 'Tümü' },
  { value: 'INSURANCE' as const, label: 'Sigorta yaklaşan' },
  { value: 'CASCO' as const, label: 'Kasko yaklaşan' },
  { value: 'INSPECTION' as const, label: 'Muayene yaklaşan' },
];

export type DocumentExpiryFilter = (typeof DOCUMENT_EXPIRY_FILTERS)[number]['value'];
