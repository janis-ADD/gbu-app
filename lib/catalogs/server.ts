import { unstable_cache } from 'next/cache';
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
 * PERFORMANCE: Stammdaten ändern sich nur durch Migrationen — wir cachen sie
 * mit unstable_cache (10 min TTL). Pro Wizard-Render werden sonst 3-4 Catalog-
 * Queries gegen Supabase abgesetzt, was die p95-Latenz signifikant treibt.
 */

const CATALOG_TTL = 60 * 10; // 10 Minuten
const CATALOG_TAGS = ['catalogs'];

async function fetchBgCatalog(): Promise<RaBgCatalog[]> {
  try {
    const supabase = createClient();
    const { data } = await supabase
      .from('ra_bg_catalog')
      .select('slug, name, description, industries, data_source, is_complete')
      .order('name');
    return (data ?? []) as RaBgCatalog[];
  } catch {
    return [];
  }
}

async function fetchRiskCatalog(): Promise<RaRiskCatalog[]> {
  try {
    const supabase = createClient();
    const { data } = await supabase
      .from('ra_risk_catalog')
      .select('slug, name, category, typical_areas, source_ref_slugs, data_source, trigger_conditions, severity_default, likelihood_default, requires_betriebsanweisung, requires_psa, requires_unterweisung')
      .order('name');
    return (data ?? []) as RaRiskCatalog[];
  } catch {
    return [];
  }
}

async function fetchMeasureCatalog(): Promise<RaMeasureCatalog[]> {
  try {
    const supabase = createClient();
    const { data } = await supabase
      .from('ra_measure_catalog')
      .select('slug, short_text, long_text, category, applies_to_risks, source_ref_slugs, confidence, data_source, is_mandatory_when')
      .order('short_text');
    return (data ?? []) as RaMeasureCatalog[];
  } catch {
    return [];
  }
}

async function fetchAllLegalRefs(): Promise<RaLegalRef[]> {
  try {
    const supabase = createClient();
    const { data } = await supabase
      .from('ra_legal_refs')
      .select('slug, kind, citation, title, url, bg_slug, reviewed_by, reviewed_at, data_source')
      .order('citation');
    return (data ?? []) as RaLegalRef[];
  } catch {
    return [];
  }
}

async function fetchTrainingCatalog(): Promise<RaTrainingCatalog[]> {
  try {
    const supabase = createClient();
    const { data } = await supabase
      .from('ra_training_catalog')
      .select('slug, name, related_risks, memberspot_id, data_source')
      .order('name');
    return (data ?? []) as RaTrainingCatalog[];
  } catch {
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
