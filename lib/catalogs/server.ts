import { createClient } from '@/lib/supabase/server';
import type {
  RaBgCatalog,
  RaLegalRef,
  RaMeasureCatalog,
  RaRiskCatalog,
  RaTrainingCatalog
} from '@/lib/db/types';

/**
 * Loader für Stammdaten. RLS erlaubt Lesen für `authenticated`.
 * Wird in Server Components / Server Actions verwendet.
 *
 * ─── TEMP DEBUG (Real User Validation Sprint) ─────────────────────────
 * Vormals: jeder Loader war in `unstable_cache(...)` gewrappt
 *          (10-Min-TTL, Tag 'catalogs').
 *
 * Befund: `unstable_cache`-Callbacks laufen ohne Request-Kontext.
 * `createClient()` ruft aber `cookies()` aus `next/headers` auf — das ist
 * in einer cached function entweder verboten (wirft) oder liefert null.
 * Effekt: erster Fetch lieferte `[]`, die 10-Min-TTL hielt das leere Array
 * danach für jeden weiteren Request → BG-Liste blieb auch nach erfolgreicher
 * DB-Migration leer.
 *
 * Workaround hier: jede Catalog-Funktion liest direkt, kein unstable_cache.
 * Performance: pro Wizard-Render 3–4 zusätzliche Roundtrips gegen 6/29/19/35
 * Zeilen — vernachlässigbar.
 *
 * Permanenter Fix folgt separat: entweder
 *   (a) RLS-Policies für Catalog-Tabellen auf `to anon, authenticated`
 *       öffnen (Catalog ist public-reference data), oder
 *   (b) auf `react.cache(...)` umstellen (per-request Dedup, kein
 *       cross-request-Cache).
 *
 * Diagnose-Logging unten ist bewusst console.error/log mit pg_*-Feldern
 * — umgeht die DSGVO-Whitelist, weil hier RLS-/Verbindungs-Ursachen
 * sichtbar sein müssen. Keine PII in den Logs.
 */

async function fetchBgCatalog(): Promise<RaBgCatalog[]> {
  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('ra_bg_catalog')
      .select('slug, name, description, industries, data_source, is_complete')
      .order('name');
    if (error) {
      console.error('[catalog.bg.fetch] supabase error', {
        pg_code: error.code, pg_message: error.message,
        pg_details: error.details, pg_hint: error.hint
      });
      return [];
    }
    console.log('[catalog.bg.fetch] ok', { count: (data ?? []).length });
    return (data ?? []) as RaBgCatalog[];
  } catch (err) {
    console.error('[catalog.bg.fetch] threw', {
      name: err instanceof Error ? err.name : null,
      message: err instanceof Error ? err.message : String(err),
      stack: err instanceof Error ? err.stack?.split('\n').slice(0, 4).join('\n') : null
    });
    return [];
  }
}

async function fetchRiskCatalog(): Promise<RaRiskCatalog[]> {
  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('ra_risk_catalog')
      .select('slug, name, category, typical_areas, source_ref_slugs, data_source, trigger_conditions, severity_default, likelihood_default, requires_betriebsanweisung, requires_psa, requires_unterweisung')
      .order('name');
    if (error) {
      console.error('[catalog.risk.fetch] supabase error', {
        pg_code: error.code, pg_message: error.message,
        pg_details: error.details, pg_hint: error.hint
      });
      return [];
    }
    console.log('[catalog.risk.fetch] ok', { count: (data ?? []).length });
    return (data ?? []) as RaRiskCatalog[];
  } catch (err) {
    console.error('[catalog.risk.fetch] threw', {
      message: err instanceof Error ? err.message : String(err)
    });
    return [];
  }
}

async function fetchMeasureCatalog(): Promise<RaMeasureCatalog[]> {
  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('ra_measure_catalog')
      .select('slug, short_text, long_text, category, applies_to_risks, source_ref_slugs, confidence, data_source, is_mandatory_when')
      .order('short_text');
    if (error) {
      console.error('[catalog.measure.fetch] supabase error', {
        pg_code: error.code, pg_message: error.message,
        pg_details: error.details, pg_hint: error.hint
      });
      return [];
    }
    console.log('[catalog.measure.fetch] ok', { count: (data ?? []).length });
    return (data ?? []) as RaMeasureCatalog[];
  } catch (err) {
    console.error('[catalog.measure.fetch] threw', {
      message: err instanceof Error ? err.message : String(err)
    });
    return [];
  }
}

async function fetchAllLegalRefs(): Promise<RaLegalRef[]> {
  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('ra_legal_refs')
      .select('slug, kind, citation, title, url, bg_slug, reviewed_by, reviewed_at, data_source')
      .order('citation');
    if (error) {
      console.error('[catalog.legal.fetch] supabase error', {
        pg_code: error.code, pg_message: error.message,
        pg_details: error.details, pg_hint: error.hint
      });
      return [];
    }
    console.log('[catalog.legal.fetch] ok', { count: (data ?? []).length });
    return (data ?? []) as RaLegalRef[];
  } catch (err) {
    console.error('[catalog.legal.fetch] threw', {
      message: err instanceof Error ? err.message : String(err)
    });
    return [];
  }
}

async function fetchTrainingCatalog(): Promise<RaTrainingCatalog[]> {
  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('ra_training_catalog')
      .select('slug, name, related_risks, memberspot_id, data_source')
      .order('name');
    if (error) {
      console.error('[catalog.training.fetch] supabase error', {
        pg_code: error.code, pg_message: error.message,
        pg_details: error.details, pg_hint: error.hint
      });
      return [];
    }
    console.log('[catalog.training.fetch] ok', { count: (data ?? []).length });
    return (data ?? []) as RaTrainingCatalog[];
  } catch (err) {
    console.error('[catalog.training.fetch] threw', {
      message: err instanceof Error ? err.message : String(err)
    });
    return [];
  }
}

/* ─── Public Loader (TEMP: kein unstable_cache, siehe Header-Doku) ──── */

export const listBgCatalog       = fetchBgCatalog;
export const listRiskCatalog     = fetchRiskCatalog;
export const listMeasureCatalog  = fetchMeasureCatalog;
export const listTrainingCatalog = fetchTrainingCatalog;

/**
 * Legal-Refs. Wenn `slugs` übergeben wird, filtern wir den Vollsatz
 * in-memory (kein extra Roundtrip). Ohne Argument: alle Refs.
 *
 * TEMP: voher gecached via unstable_cache — siehe Header.
 */
export async function listLegalRefs(slugs?: string[]): Promise<RaLegalRef[]> {
  const all = await fetchAllLegalRefs();
  if (!slugs || slugs.length === 0) return all;
  const wanted = new Set(slugs);
  return all.filter((r) => wanted.has(r.slug));
}
