import { z } from 'zod';

const phoneRegex = /^(\+90|0)?5\d{9}$/;

export const customerFormSchema = z.object({
  first_name: z.string().trim().min(1, 'Ad alanı zorunludur.'),
  last_name: z.string().trim().min(1, 'Soyad alanı zorunludur.'),
  phone: z
    .string()
    .trim()
    .min(1, 'Telefon alanı zorunludur.')
    .refine(
      (v) => phoneRegex.test(v.replace(/[\s()-]/g, '')),
      'Geçerli bir telefon numarası giriniz.',
    ),
  email: z
    .string()
    .trim()
    .optional()
    .refine(
      (v) => !v || z.string().email().safeParse(v).success,
      'Geçerli bir e-posta adresi giriniz.',
    ),
  national_id: z
    .string()
    .trim()
    .optional()
    .refine((v) => !v || /^\d{11}$/.test(v), 'TC Kimlik No 11 haneli olmalıdır.'),
  license_number: z.string().trim().optional(),
  license_expiry: z.string().trim().optional(),
  birth_date: z.string().trim().optional(),
  address: z.string().trim().optional(),
  notes: z.string().trim().optional(),
});

export type CustomerFormValues = z.infer<typeof customerFormSchema>;

export function normalizePhone(phone: string): string {
  return phone.replace(/[\s()-]/g, '');
}
