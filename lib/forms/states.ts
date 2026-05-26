/**
 * Initial-States + Result-Types für Server-Actions.
 *
 * Liegt bewusst außerhalb der "use server"-Dateien, weil
 * Next.js dort nur async-function-Exports erlaubt.
 */

/* ─── Auth ────────────────────────────────────────────────────────────── */
export type AuthState = {
  ok: boolean;
  error: string | null;
  info?: string;
};
export const AUTH_INITIAL: AuthState = { ok: false, error: null };

/* ─── Onboarding ─────────────────────────────────────────────────────── */
export type OnboardingState = {
  ok: boolean;
  error: string | null;
};
export const ONBOARDING_INITIAL: OnboardingState = { ok: false, error: null };

/* ─── Wizard (Steps 1–5) ─────────────────────────────────────────────── */
export type WizardFormState = { ok: boolean; error: string | null };
export const WIZARD_INITIAL: WizardFormState = { ok: false, error: null };

/* ─── Release (Step 6) ───────────────────────────────────────────────── */
export type ReleaseState =
  | { kind: 'idle' }
  | { kind: 'success'; versionId: string; versionNumber: number }
  | { kind: 'error'; message: string }
  | { kind: 'paywall' };
export const RELEASE_INITIAL: ReleaseState = { kind: 'idle' };

/* ─── Billing ────────────────────────────────────────────────────────── */
export type BillingState = {
  ok: boolean;
  error: string | null;
  info?: string;
};
export const BILLING_INITIAL: BillingState = { ok: false, error: null };
