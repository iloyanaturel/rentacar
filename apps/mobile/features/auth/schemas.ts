import { z } from 'zod';

export const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, 'E-posta adresinizi giriniz.')
    .email('Geçerli bir e-posta adresi giriniz.'),
  password: z.string().min(1, 'Şifrenizi giriniz.'),
});

export type LoginFormValues = z.infer<typeof loginSchema>;

export const forgotPasswordSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, 'E-posta adresinizi giriniz.')
    .email('Geçerli bir e-posta adresi giriniz.'),
});

export type ForgotPasswordFormValues = z.infer<typeof forgotPasswordSchema>;
