import { createBrowserClient } from '@supabase/ssr';

/**
 * Supabase-Client für Client Components ("use client").
 * Liest ENV-Vars zur Aufruf-Zeit (lazy), damit der Build auch ohne
 * gesetzte Variablen durchläuft. Runtime-Aufrufe ohne ENV werfen
 * einen klaren Fehler.
 *
 * Niemals ServiceRoleKey hier verwenden — nur ANON.
 */
export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    throw new Error(
      '[supabase/client] NEXT_PUBLIC_SUPABASE_URL / _ANON_KEY fehlen. ' +
        'Bitte web/.env.local setzen (Vorlage: .env.example).'
    );
  }
  return createBrowserClient(url, key);
}
