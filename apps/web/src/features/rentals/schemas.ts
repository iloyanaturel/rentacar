import { z } from 'zod';

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

export const rentalFormSchema = z.object({
  vehicle_id: z.string().trim().min(1, 'Araç seçimi zorunludur.'),
  customer_id: z.string().trim().min(1, 'Müşteri seçimi zorunludur.'),
  start_date: z.string().trim().min(1, 'Başlangıç tarihi zorunludur.'),
  start_time: z.string().trim().min(1, 'Başlangıç saati zorunludur.'),
  end_date: z.string().trim().min(1, 'Teslim tarihi zorunludur.'),
  end_time: z.string().trim().min(1, 'Teslim saati zorunludur.'),
  daily_price: z
    .string()
    .trim()
    .min(1, 'Günlük fiyat zorunludur.')
    .refine((v) => {
      const n = Number(v.replace(/\./g, '').replace(',', '.'));
      return !Number.isNaN(n) && n >= 0;
    }, 'Günlük fiyat 0’dan küçük olamaz.'),
  discount_amount: moneyString('İndirim 0’dan küçük olamaz.'),
  extra_charge: moneyString('Ek ücret 0’dan küçük olamaz.'),
  deposit_amount: moneyString('Depozito 0’dan küçük olamaz.'),
  notes: z.string().trim().optional(),
});

export type RentalFormValues = z.infer<typeof rentalFormSchema>;

export const rentalEditSchema = rentalFormSchema.omit({
  vehicle_id: true,
  customer_id: true,
});

export type RentalEditFormValues = z.infer<typeof rentalEditSchema>;

/** Parses a Turkish-formatted numeric string ("1.234,50") into a number. */
export function parseNumber(value?: string | null): number {
  if (!value) return 0;
  return Number(String(value).replace(/\./g, '').replace(',', '.')) || 0;
}
