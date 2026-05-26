import { z } from 'zod';

/**
 * Minimales Onboarding (60-Sekunden-Doktrin).
 * Nur 2 Pflichtfelder — Bundesland/Mitarbeiterzahl/Rolle kommen
 * in Wizard Step 1 mit sinnvollen Defaults.
 */
export const OnboardingSchema = z.object({
  company_name: z
    .string()
    .trim()
    .min(2, 'Bitte Firmennamen angeben.')
    .max(120, 'Maximal 120 Zeichen.'),
  industry: z
    .string()
    .trim()
    .min(2, 'Bitte Branche wählen.')
    .max(80, 'Maximal 80 Zeichen.')
});
export type OnboardingInput = z.infer<typeof OnboardingSchema>;

/**
 * PII-Warn-Heuristik: zwei aufeinanderfolgende kapitalisierte Wörter
 * wirken wie ein Vor-+Nachname.
 */
export function looksLikePersonName(value: string): boolean {
  return /\b[A-ZÄÖÜ][a-zäöüß]+\s+[A-ZÄÖÜ][a-zäöüß]+\b/.test(value);
}
