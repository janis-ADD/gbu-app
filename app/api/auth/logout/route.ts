import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { logSafe } from '@/lib/log';

/**
 * Logout. Erwartet POST (Sidebar-Form postet hierher).
 * Idempotent: auch ohne Session redirected zu /login.
 */
export async function POST(request: Request) {
  try {
    const supabase = createClient();
    await supabase.auth.signOut();
    logSafe('auth.signout.ok', {});
  } catch {
    logSafe('auth.signout.error', { code: 'service_unavailable' }, 'warn');
  }
  return NextResponse.redirect(new URL('/login', request.url), { status: 303 });
}
