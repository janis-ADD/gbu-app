import { createClient } from '@/lib/supabase/server';
import type { RaPlan, RaSubscription } from '@/lib/db/types';

export type Quota = {
  plan_slug: 'free' | 'basic' | 'pro';
  plan_name: string;
  max: number | null;       // null = unbegrenzt
  used: number;              // = Anzahl freigegebener GBUs (distinct)
  remaining: number | null;
  is_unlimited: boolean;
  is_exhausted: boolean;
};

/**
 * Quota wird auf Basis FREIGEGEBENER GBUs berechnet (nicht Bundles).
 * Gem. GBU-Bundle-Doktrin: 1 Bundle hat N GBUs, Limit zählt GBUs.
 */
export async function getCurrentQuota(): Promise<Quota | null> {
  try {
    const supabase = createClient();
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return null;
    const tenantId = userData.user.id;

    const [subRes, plansRes, gbuVersionsRes] = await Promise.all([
      supabase
        .from('ra_subscriptions')
        .select('plan_slug, status')
        .eq('tenant_id', tenantId)
        .maybeSingle<Pick<RaSubscription, 'plan_slug' | 'status'>>(),
      supabase.from('ra_plans').select('slug, name, max_releases'),
      supabase
        .from('ra_gbu_versions')
        .select('gbu_id')
        .eq('tenant_id', tenantId)
    ]);

    const sub = subRes.data;
    const plans = (plansRes.data ?? []) as Array<Pick<RaPlan, 'slug' | 'name' | 'max_releases'>>;
    const rows = (gbuVersionsRes.data ?? []) as Array<{ gbu_id: string }>;
    const usedRaw = new Set(rows.map((r) => r.gbu_id)).size;

    const planSlug = (sub?.plan_slug ?? 'free') as Quota['plan_slug'];
    const plan = plans.find((p) => p.slug === planSlug);
    const max = plan?.max_releases ?? null;
    const planName = plan?.name ?? 'Free';

    return {
      plan_slug: planSlug,
      plan_name: planName,
      max,
      used: usedRaw,
      remaining: max === null ? null : Math.max(0, max - usedRaw),
      is_unlimited: max === null,
      is_exhausted: max !== null && usedRaw >= max
    };
  } catch {
    return null;
  }
}
