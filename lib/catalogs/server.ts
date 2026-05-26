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
 */
export async function listBgCatalog(): Promise<RaBgCatalog[]> {
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

export async function listRiskCatalog(): Promise<RaRiskCatalog[]> {
  try {
    const supabase = createClient();
    const { data } = await supabase
      .from('ra_risk_catalog')
      .select('slug, name, category, typical_areas, source_ref_slugs, data_source')
      .order('name');
    return (data ?? []) as RaRiskCatalog[];
  } catch {
    return [];
  }
}

export async function listMeasureCatalog(): Promise<RaMeasureCatalog[]> {
  try {
    const supabase = createClient();
    const { data } = await supabase
      .from('ra_measure_catalog')
      .select('slug, short_text, long_text, category, applies_to_risks, source_ref_slugs, confidence, data_source')
      .order('short_text');
    return (data ?? []) as RaMeasureCatalog[];
  } catch {
    return [];
  }
}

export async function listLegalRefs(slugs?: string[]): Promise<RaLegalRef[]> {
  try {
    const supabase = createClient();
    let q = supabase
      .from('ra_legal_refs')
      .select('slug, kind, citation, title, url, bg_slug, reviewed_by, reviewed_at, data_source');
    if (slugs && slugs.length > 0) {
      q = q.in('slug', slugs);
    }
    const { data } = await q.order('citation');
    return (data ?? []) as RaLegalRef[];
  } catch {
    return [];
  }
}

export async function listTrainingCatalog(): Promise<RaTrainingCatalog[]> {
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
