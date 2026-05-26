import { createClient } from '@/lib/supabase/server';
import type { RaPlan } from '@/lib/db/types';

export async function listPublicPlans(): Promise<RaPlan[]> {
  try {
    const supabase = createClient();
    const { data } = await supabase
      .from('ra_plans')
      .select('slug, name, tagline, max_releases, features, monthly_eur, yearly_eur, is_public, sort_order')
      .eq('is_public', true)
      .order('sort_order');
    return (data ?? []) as RaPlan[];
  } catch {
    return [];
  }
}
