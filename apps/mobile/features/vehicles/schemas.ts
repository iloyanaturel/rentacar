import { z } from 'zod';
import type { FuelType, TransmissionType } from '@rentaflow/shared';

const currentYear = new Date().getFullYear();

export const vehicleFormSchema = z.object({
  brand: z.string().trim().min(1, 'Marka alanı zorunludur.'),
  model: z.string().trim().min(1, 'Model alanı zorunludur.'),
  model_year: z
    .string()
    .optional()
    .refine(
      (v) => !v || /^\d{4}$/.test(v),
      'Model yılı 4 haneli olmalıdır.',
    )
    .refine((v) => {
      if (!v) return true;
      const y = Number(v);
      return y >= 1980 && y <= currentYear + 1;
    }, `Model yılı 1980–${currentYear + 1} arasında olmalıdır.`),
  plate: z.string().trim().min(1, 'Plaka alanı zorunludur.'),
  color: z.string().optional(),
  fuel_type: z.string().optional(),
  transmission: z.string().optional(),
  current_km: z
    .string()
    .optional()
    .refine(
      (v) => !v || (!Number.isNaN(Number(v.replace(/\./g, ''))) && Number(v.replace(/\./g, '')) >= 0),
      'Kilometre negatif olamaz.',
    ),
  daily_price: z
    .string()
    .trim()
    .min(1, 'Günlük kiralama fiyatı zorunludur.')
    .refine((v) => {
      const n = Number(String(v).replace(/\./g, '').replace(',', '.'));
      return !Number.isNaN(n) && n >= 0;
    }, 'Günlük fiyat 0’dan küçük olamaz.'),
  deposit_amount: z
    .string()
    .optional()
    .refine((v) => {
      if (!v) return true;
      const n = Number(String(v).replace(/\./g, '').replace(',', '.'));
      return !Number.isNaN(n) && n >= 0;
    }, 'Depozito 0’dan küçük olamaz.'),
  insurance_expiry: z.string().optional(),
  casco_expiry: z.string().optional(),
  inspection_expiry: z.string().optional(),
  notes: z.string().optional(),
});

export type VehicleFormValues = z.infer<typeof vehicleFormSchema>;

export function parseMoneyInput(value?: string | null): number {
  if (!value) return 0;
  return Number(String(value).replace(/\./g, '').replace(',', '.')) || 0;
}

export function parseKmInput(value?: string | null): number {
  if (!value) return 0;
  return Number(String(value).replace(/\./g, '')) || 0;
}

export function toOptionalFuel(value?: string): FuelType | null {
  if (!value) return null;
  return value as FuelType;
}

export function toOptionalTransmission(
  value?: string,
): TransmissionType | null {
  if (!value) return null;
  return value as TransmissionType;
}

/** Convert DD.MM.YYYY → YYYY-MM-DD */
export function trDateToIso(value?: string): string | null {
  if (!value?.trim()) return null;
  const m = value.trim().match(/^(\d{2})\.(\d{2})\.(\d{4})$/);
  if (!m) return null;
  return `${m[3]}-${m[2]}-${m[1]}`;
}

/** Convert YYYY-MM-DD → DD.MM.YYYY */
export function isoToTrDate(value?: string | null): string {
  if (!value) return '';
  const m = value.slice(0, 10).match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return '';
  return `${m[3]}.${m[2]}.${m[1]}`;
}
