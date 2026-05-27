import { createClient } from '@/lib/supabase/server';
import type { RaBundle } from '@/lib/db/types';

export async function listMyBundles(): Promise<RaBundle[]> {
  try {
    const supabase = createClient();
    const { data } = await supabase
      .from('ra_bundles')
      .select('*')
      .order('updated_at', { ascending: false });
    return (data ?? []) as RaBundle[];
  } catch {
    return [];
  }
}

export async function getBundle(id: string): Promise<RaBundle | null> {
  try {
    const supabase = createClient();
    const { data } = await supabase
      .from('ra_bundles')
      .select('*')
      .eq('id', id)
      .maybeSingle<RaBundle>();
    return data ?? null;
  } catch {
    return null;
  }
}

export async function getBundleStats(bundleId: string): Promise<{
  total: number;
  released: number;
  draft: number;
  stale: number;
}> {
  const empty = { total: 0, released: 0, draft: 0, stale: 0 };
  try {
    const supabase = createClient();
    const { data } = await supabase
      .from('ra_gbus')
      .select('status,is_stale')
      .eq('bundle_id', bundleId);
    const rows = (data ?? []) as Array<{
      status: 'draft' | 'in_review' | 'released' | 'stale';
      is_stale: boolean;
    }>;
    return rows.reduce(
      (acc, r) => {
        acc.total += 1;
        if (r.status === 'released') acc.released += 1;
        else acc.draft += 1;
        if (r.is_stale) acc.stale += 1;
        return acc;
      },
      { ...empty }
    );
  } catch {
    return empty;
  }
}

export async function getMyBundleCounts(): Promise<{
  total: number;
  in_setup: number;
  active: number;
  archived: number;
}> {
  const empty = { total: 0, in_setup: 0, active: 0, archived: 0 };
  try {
    const supabase = createClient();
    const { data } = await supabase.from('ra_bundles').select('status');
    const rows = (data ?? []) as Array<{ status: 'in_setup' | 'active' | 'archived' }>;
    return rows.reduce<typeof empty>(
      (acc, r) => {
        acc.total += 1;
        acc[r.status] = (acc[r.status] ?? 0) + 1;
        return acc;
      },
      { ...empty }
    );
  } catch {
    return empty;
  }
}
