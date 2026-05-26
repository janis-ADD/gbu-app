import { cookies } from 'next/headers';
import { createServerClient, type CookieOptions } from '@supabase/ssr';

/**
 * Supabase-Client für Server Components, Server Actions und Route Handlers.
 * Liest/Setzt Session-Cookies über next/headers.
 *
 * In Server Components kann `cookies().set()` einen Fehler werfen
 * (RSC dürfen Cookies nicht schreiben) — wir fangen den Fehler still,
 * weil der Cookie-Refresh dann in der middleware passiert.
 */
export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    throw new Error(
      '[supabase/server] NEXT_PUBLIC_SUPABASE_URL / _ANON_KEY fehlen. ' +
        'Bitte web/.env.local setzen (Vorlage: .env.example).'
    );
  }

  const cookieStore = cookies();

  return createServerClient(url, key, {
    cookies: {
      get(name: string) {
        return cookieStore.get(name)?.value;
      },
      set(name: string, value: string, options: CookieOptions) {
        try {
          cookieStore.set({ name, value, ...options });
        } catch {
          // Server Component: Cookies sind dort read-only.
          // Refresh übernimmt die Middleware.
        }
      },
      remove(name: string, options: CookieOptions) {
        try {
          cookieStore.set({ name, value: '', ...options });
        } catch {
          // siehe oben
        }
      }
    }
  });
}
