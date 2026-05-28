import { unstable_cache } from 'next/cache';
import { createAnonClient } from '@/lib/supabase/server';
import type {
  RaBgCatalog,
  RaLegalRef,
  RaMeasureCatalog,
  RaRiskCatalog,
  RaTrainingCatalog
} from '@/lib/db/types';

/**
 * Loader für Stammdaten. Catalog-Tabellen sind seit Migration 0015 für
 * `anon` lesbar (kein PII, reine Referenzdaten). Wir nutzen deshalb hier
 * `createAnonClient()` — der greift NICHT auf `cookies()` aus `next/headers`
 * zu und kann sicher innerhalb von `unstable_cache`-Callbacks verwendet
 * werden.
 *
 * PERFORMANCE: Stammdaten ändern sich nur durch Migrationen — wir cachen sie
 * mit `unstable_cache` (10 min TTL). Pro Wizard-Render würden sonst 3-4
 * Catalog-Queries gegen Supabase fliegen.
 *
 * OBSERVABILITY: Jeder Loader loggt im Erfolgsfall `count`, im Fehlerfall
 * die Supabase-Error-Felder (pg_code/message/details/hint). Diese
 * `console.error`-Zeilen umgehen die `logSafe`-Whitelist bewusst — sie
 * enthalten KEIN PII (nur DB-Status), sind aber notwendig, damit
 * Schema-/RLS-Probleme nicht still verschluckt werden (vgl. Real User
 * Validation Sprint, Iteration 2).
 */

const CATALOG_TTL = 60 * 10; // 10 Minuten
const CATALOG_TAGS = ['catalogs'];

async function fetchBgCatalog(): Promise<RaBgCatalog[]> {
  try {
    const supabase = createAnonClient();
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
    return (data ?? []) as RaBgCatalog[];
  } catch (err) {
    console.error('[catalog.bg.fetch] threw', {
      name: err instanceof Error ? err.name : null,
      message: err instanceof Error ? err.message : String(err)
    });
    return [];
  }
}

async function fetchRiskCatalog(): Promise<RaRiskCatalog[]> {
  try {
    const supabase = createAnonClient();
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
    const supabase = createAnonClient();
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
    const supabase = createAnonClient();
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
    const supabase = createAnonClient();
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
    return (data ?? []) as RaTrainingCatalog[];
  } catch (err) {
    console.error('[catalog.training.fetch] threw', {
      message: err instanceof Error ? err.message : String(err)
    });
    return [];
  }
}

/* ─── Gecachte öffentliche Loader ────────────────────────────────────── */

export const listBgCatalog = unstable_cache(
  fetchBgCatalog,
  ['catalog:bg'],
  { revalidate: CATALOG_TTL, tags: CATALOG_TAGS }
);

export const listRiskCatalog = unstable_cache(
  fetchRiskCatalog,
  ['catalog:risks'],
  { revalidate: CATALOG_TTL, tags: CATALOG_TAGS }
);

export const listMeasureCatalog = unstable_cache(
  fetchMeasureCatalog,
  ['catalog:measures'],
  { revalidate: CATALOG_TTL, tags: CATALOG_TAGS }
);

export const listTrainingCatalog = unstable_cache(
  fetchTrainingCatalog,
  ['catalog:training'],
  { revalidate: CATALOG_TTL, tags: CATALOG_TAGS }
);

/** Vollständige Legal-Refs (gecacht). */
const listAllLegalRefs = unstable_cache(
  fetchAllLegalRefs,
  ['catalog:legal:all'],
  { revalidate: CATALOG_TTL, tags: CATALOG_TAGS }
);

/**
 * Legal-Refs. Wenn `slugs` übergeben wird, filtern wir den gecachten Vollsatz
 * in-memory (kein extra Roundtrip). Ohne Argument: alle Refs.
 */
export async function listLegalRefs(slugs?: string[]): Promise<RaLegalRef[]> {
  const all = await listAllLegalRefs();
  if (!slugs || slugs.length === 0) return all;
  const wanted = new Set(slugs);
  return all.filter((r) => wanted.has(r.slug));
}
