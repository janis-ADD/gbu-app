import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { logSafe } from '@/lib/log';

/**
 * Supabase Auth-Callback.
 * Wird vom Bestätigungs-Link in der Welcome-Mail sowie vom
 * Passwort-Reset-Link aufgerufen. Tauscht den `code` gegen eine
 * Session und leitet anschließend ins Dashboard weiter.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  // Default-Ziel: Onboarding (Trigger ev=sign_up dort) — falls schon onboarded
  // redirected die App-Layout-Logik weiter zum Dashboard.
  const next = url.searchParams.get('next') ?? '/onboarding?ev=sign_up';

  if (!code) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  try {
    const supabase = createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      logSafe('auth.callback.fail', { code: error.code ?? 'unknown' }, 'warn');
      return NextResponse.redirect(new URL('/verify?error=1', request.url));
    }
    logSafe('auth.callback.ok', {});
  } catch {
    logSafe('auth.callback.error', { code: 'service_unavailable' }, 'error');
    return NextResponse.redirect(new URL('/verify?error=1', request.url));
  }

  return NextResponse.redirect(new URL(next, request.url));
}
