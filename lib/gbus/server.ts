import { createClient } from '@/lib/supabase/server';
import type { RaGbu, RaGbuVersion } from '@/lib/db/types';

export async function listGbusForBundle(bundleId: string): Promise<RaGbu[]> {
  try {
    const supabase = createClient();
    const { data } = await supabase
      .from('ra_gbus')
      .select('*')
      .eq('bundle_id', bundleId)
      .is('deleted_at', null)
      .order('created_at', { ascending: true });
    return (data ?? []) as RaGbu[];
  } catch {
    return [];
  }
}

export async function getGbu(id: string): Promise<RaGbu | null> {
  try {
    const supabase = createClient();
    const { data } = await supabase
      .from('ra_gbus')
      .select('*')
      .eq('id', id)
      .maybeSingle<RaGbu>();
    return data ?? null;
  } catch {
    return null;
  }
}

export async function getGbuVersion(
  gbuId: string,
  versionNumber: number
): Promise<RaGbuVersion | null> {
  try {
    const supabase = createClient();
    const { data } = await supabase
      .from('ra_gbu_versions')
      .select('*')
      .eq('gbu_id', gbuId)
      .eq('version_number', versionNumber)
      .maybeSingle<RaGbuVersion>();
    return data ?? null;
  } catch {
    return null;
  }
}

export async function countMyReleasedGbus(): Promise<number> {
  try {
    const supabase = createClient();
    const { data } = await supabase
      .from('ra_gbu_versions')
      .select('gbu_id');
    const rows = (data ?? []) as Array<{ gbu_id: string }>;
    const unique = new Set(rows.map((r) => r.gbu_id));
    return unique.size;
  } catch {
    return 0;
  }
}
