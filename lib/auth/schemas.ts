import { z } from 'zod';

/**
 * Zod-Schemas für Auth-Formulare.
 * Generische Fehler-Messages auf Deutsch, kein Email-Enumeration.
 */
export const SignInSchema = z.object({
  email: z.string().trim().email('Ungültige E-Mail-Adresse.'),
  password: z.string().min(1, 'Passwort erforderlich.')
});
export type SignInInput = z.infer<typeof SignInSchema>;

export const SignUpSchema = z.object({
  email: z.string().trim().email('Ungültige E-Mail-Adresse.'),
  password: z
    .string()
    .min(10, 'Mindestens 10 Zeichen.')
    .max(128, 'Maximal 128 Zeichen.')
});
export type SignUpInput = z.infer<typeof SignUpSchema>;

export const ForgotSchema = z.object({
  email: z.string().trim().email('Ungültige E-Mail-Adresse.')
});
export type ForgotInput = z.infer<typeof ForgotSchema>;
