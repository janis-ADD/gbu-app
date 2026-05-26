'use server';

import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { SignInSchema, SignUpSchema, ForgotSchema } from '@/lib/auth/schemas';
import { logSafe } from '@/lib/log';
import type { AuthState } from '@/lib/forms/states';

/**
 * Auth Server Actions.
 *
 * Wichtige Designentscheidungen:
 *  - Generische Fehler-Messages (kein User-Enumeration)
 *  - redirect() steht IMMER außerhalb des try/catch (sonst wird der
 *    NEXT_REDIRECT-Error verschluckt)
 *  - Logs enthalten NIEMALS E-Mail/Passwort (nur Action + Code)
 *  - Bei fehlenden ENV-Variablen: freundliche Fehlermeldung statt Crash
 *
 * Initial-States/Types liegen in lib/forms/states.ts — Next.js erlaubt
 * in "use server"-Dateien ausschließlich async-function-Exports.
 */

const GENERIC_LOGIN_ERR = 'E-Mail oder Passwort ungültig.';
const GENERIC_SERVICE_ERR =
  'Anmeldung gerade nicht verfügbar. Bitte später erneut versuchen.';

function siteOrigin(): string {
  // Bevorzugt explizite ENV (Produktion). Fallback: Host-Header (Dev).
  const env = process.env.NEXT_PUBLIC_SITE_URL;
  if (env) return env.replace(/\/$/, '');
  const h = headers();
  const host = h.get('x-forwarded-host') ?? h.get('host') ?? 'localhost:3000';
  const proto = h.get('x-forwarded-proto') ?? 'http';
  return `${proto}://${host}`;
}

/* ─── Sign In ─────────────────────────────────────────────────────────── */
export async function signInAction(
  _prev: AuthState,
  formData: FormData
): Promise<AuthState> {
  const parsed = SignInSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password')
  });
  if (!parsed.success) {
    return { ok: false, error: 'Bitte E-Mail und Passwort prüfen.' };
  }

  let success = false;
  try {
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword(parsed.data);
    if (error) {
      logSafe('auth.signin.fail', { code: error.code ?? 'unknown' }, 'warn');
      return { ok: false, error: GENERIC_LOGIN_ERR };
    }
    success = true;
  } catch {
    logSafe('auth.signin.error', { code: 'service_unavailable' }, 'error');
    return { ok: false, error: GENERIC_SERVICE_ERR };
  }
  if (success) redirect('/app/dashboard');
  return { ok: false, error: GENERIC_SERVICE_ERR };
}

/* ─── Sign Up ─────────────────────────────────────────────────────────── */
export async function signUpAction(
  _prev: AuthState,
  formData: FormData
): Promise<AuthState> {
  const acceptTerms = formData.get('accept_terms') === 'on';
  if (!acceptTerms) {
    return { ok: false, error: 'Bitte AGB und Datenschutzerklärung akzeptieren.' };
  }

  const parsed = SignUpSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password')
  });
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return { ok: false, error: first?.message ?? 'Bitte Felder prüfen.' };
  }

  try {
    const supabase = createClient();
    const { error } = await supabase.auth.signUp({
      email: parsed.data.email,
      password: parsed.data.password,
      options: {
        emailRedirectTo: `${siteOrigin()}/auth/callback`
      }
    });
    if (error) {
      logSafe('auth.signup.fail', { code: error.code ?? 'unknown' }, 'warn');
      // Generischer Hinweis: kein User-Enumeration
      return {
        ok: false,
        error:
          'Registrierung gerade nicht möglich. Bitte später erneut versuchen.'
      };
    }
    logSafe('auth.signup.ok', {});
  } catch {
    logSafe('auth.signup.error', { code: 'service_unavailable' }, 'error');
    return { ok: false, error: GENERIC_SERVICE_ERR };
  }

  return {
    ok: true,
    error: null,
    info:
      'Wir haben dir eine Bestätigungs-Mail geschickt. Bitte prüfe dein Postfach.',
    // Hinweis: bei aktiver "Confirm email off" in Supabase-Dev läuft der User
    // direkt zu /app/dashboard?ev=sign_up — getriggert via auth/callback.
  };
}

/* ─── Forgot Password ─────────────────────────────────────────────────── */
export async function requestPasswordResetAction(
  _prev: AuthState,
  formData: FormData
): Promise<AuthState> {
  const parsed = ForgotSchema.safeParse({ email: formData.get('email') });
  if (!parsed.success) {
    return { ok: false, error: 'Bitte E-Mail prüfen.' };
  }

  // Wir antworten IMMER mit Success — gegen User-Enumeration.
  try {
    const supabase = createClient();
    await supabase.auth.resetPasswordForEmail(parsed.data.email, {
      redirectTo: `${siteOrigin()}/auth/callback`
    });
    logSafe('auth.forgot.ok', {});
  } catch {
    logSafe('auth.forgot.error', { code: 'service_unavailable' }, 'error');
    // Auch hier: kein expliziter Fehler an User, um Enumeration zu vermeiden
  }

  return {
    ok: true,
    error: null,
    info:
      'Falls ein Account mit dieser E-Mail existiert, haben wir dir einen Reset-Link geschickt.'
  };
}
