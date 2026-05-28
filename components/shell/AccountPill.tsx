import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import type { RaSubscription } from '@/lib/db/types';

/**
 * Account-Pill im Sidebar-Footer.
 * Liest User, Display-Name + Plan (single Round-Trip).
 */
export async function AccountPill() {
  let email: string | null = null;
  let displayName: string | null = null;
  let planSlug: 'free' | 'basic' | 'pro' | null = null;

  try {
    const supabase = createClient();
    const { data: userData } = await supabase.auth.getUser();
    if (userData.user) {
      email = userData.user.email ?? null;

      const [profileRes, subRes] = await Promise.all([
        supabase
          .from('ra_user_profiles')
          .select('display_name, company_name')
          .eq('user_id', userData.user.id)
          .maybeSingle<{ display_name: string | null; company_name: string | null }>(),
        supabase
          .from('ra_subscriptions')
          .select('plan_slug')
          .eq('tenant_id', userData.user.id)
          .maybeSingle<Pick<RaSubscription, 'plan_slug'>>()
      ]);

      displayName = profileRes.data?.company_name ?? profileRes.data?.display_name ?? null;
      planSlug = (subRes.data?.plan_slug as 'free' | 'basic' | 'pro' | undefined) ?? null;
    }
  } catch {
    /* defensiv */
  }

  const label = displayName ?? email ?? 'Nicht angemeldet';
  const initials = (displayName ?? email ?? '—')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) || '—';

  // Plan-Anzeige als ruhiger Text unter dem Firmennamen — keine Badge-Optik
  // (R2 aus dem UX-Bereinigungs-Sprint). Wirkt wie eine Kontoinformation,
  // nicht wie ein Upsell.
  const planLabel = planSlug === 'pro'
    ? 'Pro-Plan'
    : planSlug === 'basic'
      ? 'Basic-Plan'
      : planSlug === 'free'
        ? 'Free-Plan'
        : 'Konto verwalten';

  return (
    <Link href="/app/account" className="account-pill" data-clickable="true">
      <div className="account-avatar">{initials}</div>
      <div style={{ minWidth: 0, flex: 1 }}>
        <div className="account-name">{label}</div>
        <div className="account-plan">{planLabel}</div>
      </div>
    </Link>
  );
}
