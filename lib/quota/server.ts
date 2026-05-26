import { createClient } from '@/lib/supabase/server';
import type { RaPlan, RaSubscription } from '@/lib/db/types';

export type Quota = {
  plan_slug: 'free' | 'basic' | 'pro';
  plan_name: string;
  max: number | null;
  used: number;
  remaining: number | null;
  is_unlimited: boolean;
  is_exhausted: boolean;
};

/**
 * Quota-Berechnung gemäß Modell A (1 Free-Release).
 * Liest aktive Subscription + Anzahl freigegebener Versionen.
 * Liefert null bei nicht eingeloggten/nicht erreichbaren Sessions.
 */
export async function getCurrentQuota(): Promise<Quota | null> {
  try {
    const supabase = createClient();
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return null;
    const tenantId = userData.user.id;

    const [subRes, plansRes, versionCountRes] = await Promise.all([
      supabase
        .from('ra_subscriptions')
        .select('plan_slug, status')
        .eq('tenant_id', tenantId)
        .maybeSingle<Pick<RaSubscription, 'plan_slug' | 'status'>>(),
      supabase.from('ra_plans').select('slug, name, max_releases'),
      supabase
        .from('ra_assessment_versions')
        .select('id', { count: 'exact', head: true })
        .eq('tenant_id', tenantId)
    ]);

    const sub = subRes.data;
    const plans = (plansRes.data ?? []) as Array<Pick<RaPlan, 'slug' | 'name' | 'max_releases'>>;
    const usedRaw = versionCountRes.count ?? 0;

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
