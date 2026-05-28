import { cookies } from 'next/headers';
import { createServerClient, type CookieOptions } from '@supabase/ssr';

/**
 * Supabase-Client für Server Components, Server Actions und Route Handlers.
 * Liest/Setzt Session-Cookies über next/headers.
 *
 * In Server Components kann `cookies().set()` einen Fehler werfen
 * (RSC dürfen Cookies nicht schreiben) — wir fangen den Fehler still,
 * weil der Cookie-Refresh dann in der middleware passiert.
 *
 * ⚠️ Diese Funktion darf NICHT innerhalb von `unstable_cache`-Callbacks
 *    aufgerufen werden — der `cookies()`-Aufruf ist dort requestkontext-
 *    los und wirft (oder liefert anon ohne JWT). Für Cookie-freie Reads
 *    aus Catalog-Tabellen → `createAnonClient()` verwenden.
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

/**
 * Cookies-freier Supabase-Client für Reads aus PUBLIC-Catalog-Tabellen.
 *
 * Benutzt anon-Key ohne JWT — alle Anfragen laufen unter der Rolle `anon`.
 * Setzt voraus, dass die Ziel-Tabellen eine RLS-Policy für `anon` haben
 * (Migration 0015 öffnet ra_bg_catalog / ra_risk_catalog / ra_measure_catalog
 * / ra_legal_refs / ra_training_catalog für anon-SELECT).
 *
 * Vorteil gegenüber `createClient()`: Dieser Client kann sicher innerhalb
 * `unstable_cache`-Callbacks verwendet werden, weil er kein `cookies()`
 * aus `next/headers` aufruft (das wäre requestkontext-abhängig und würde
 * in einer cached function werfen oder leer liefern).
 *
 * NICHT verwenden für tenant-spezifische Tabellen (ra_bundles, ra_gbus,
 * ra_subscriptions, etc.) — dort braucht's den User-Kontext.
 */
export function createAnonClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    throw new Error(
      '[supabase/server] NEXT_PUBLIC_SUPABASE_URL / _ANON_KEY fehlen.'
    );
  }
  return createServerClient(url, key, {
    cookies: {
      get: () => undefined,
      set: () => undefined,
      remove: () => undefined
    }
  });
}
