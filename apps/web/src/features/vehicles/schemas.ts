import { z } from 'zod';

const currentYear = new Date().getFullYear();

function moneyString(message = 'Bu değer 0’dan küçük olamaz.') {
  return z
    .string()
    .trim()
    .optional()
    .refine((v) => {
      if (!v) return true;
      const n = Number(v.replace(/\./g, '').replace(',', '.'));
      return !Number.isNaN(n) && n >= 0;
    }, message);
}

export const vehicleFormSchema = z.object({
  brand: z.string().trim().min(1, 'Marka alanı zorunludur.'),
  model: z.string().trim().min(1, 'Model alanı zorunludur.'),
  plate: z.string().trim().min(1, 'Plaka alanı zorunludur.'),
  model_year: z
    .string()
    .trim()
    .optional()
    .refine((v) => !v || /^\d{4}$/.test(v), 'Model yılı 4 haneli olmalıdır.')
    .refine((v) => {
      if (!v) return true;
      const y = Number(v);
      return y >= 1980 && y <= currentYear + 1;
    }, `Model yılı 1980–${currentYear + 1} arasında olmalıdır.`),
  color: z.string().trim().optional(),
  fuel_type: z.string().trim().optional(),
  transmission: z.string().trim().optional(),
  current_km: moneyString('Kilometre negatif olamaz.'),
  daily_price: z
    .string()
    .trim()
    .min(1, 'Günlük fiyat zorunludur.')
    .refine((v) => {
      const n = Number(v.replace(/\./g, '').replace(',', '.'));
      return !Number.isNaN(n) && n >= 0;
    }, 'Günlük fiyat 0’dan küçük olamaz.'),
  deposit_amount: moneyString('Depozito 0’dan küçük olamaz.'),
  insurance_expiry: z.string().trim().optional(),
  casco_expiry: z.string().trim().optional(),
  inspection_expiry: z.string().trim().optional(),
  notes: z.string().trim().optional(),
});

export type VehicleFormValues = z.infer<typeof vehicleFormSchema>;

export const vehicleEditSchema = vehicleFormSchema.extend({
  status: z.enum(['AVAILABLE', 'MAINTENANCE', 'INACTIVE']).optional(),
});

export type VehicleEditFormValues = z.infer<typeof vehicleEditSchema>;

/** Parses a Turkish-formatted numeric string ("1.234,50") into a number. */
export function parseNumber(value?: string | null): number {
  if (!value) return 0;
  return Number(String(value).replace(/\./g, '').replace(',', '.')) || 0;
}
