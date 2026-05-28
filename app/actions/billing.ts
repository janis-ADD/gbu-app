'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { logSafe } from '@/lib/log';
import type { BillingState } from '@/lib/forms/states';

const PlanSlugSchema = z.enum(['free', 'basic', 'pro']);

/**
 * MVP-Stub für Plan-Wechsel.
 *
 * Aktuell nur Downgrade auf 'free' erlaubt (RLS-Policy aus Migration 0006).
 * Echtes Upgrade läuft über Stripe — kommt mit Phase 4. Bis dahin zeigen
 * wir bei Upgrade-Klick eine ehrliche „Bald verfügbar"-Meldung statt
 * stillschweigend einen Stub-Wechsel zu machen (das wäre Vertrauensbruch).
 */
export async function setPlanAction(
  _prev: BillingState,
  formData: FormData
): Promise<BillingState> {
  const parsed = PlanSlugSchema.safeParse(formData.get('plan'));
  if (!parsed.success) {
    return { ok: false, error: 'Ungültiger Plan.' };
  }
  const target = parsed.data;

  // Upgrade-Pfade laufen über Stripe (Phase 4) — ehrlich kommunizieren
  if (target !== 'free') {
    return {
      ok: false,
      error:
        'Upgrade läuft demnächst über sichere Bezahlung (Stripe). ' +
        'Wir kontaktieren dich, sobald aktiv. Im MVP zählen wir nur das Free-Limit.'
    };
  }

  try {
    const supabase = createClient();
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return { ok: false, error: 'Sitzung abgelaufen.' };

    const { error } = await supabase
      .from('ra_subscriptions')
      .update({ plan_slug: 'free', status: 'active', provider: 'stub' })
      .eq('tenant_id', userData.user.id);
    if (error) {
      logSafe('billing.downgrade.fail', { code: error.code ?? 'unknown' }, 'warn');
      return { ok: false, error: 'Downgrade fehlgeschlagen.' };
    }
    await supabase.from('ra_audit_events').insert({
      action: 'billing.plan.downgrade',
      actor_user_id: userData.user.id,
      tenant_id: userData.user.id,
      metadata: { stage: 'free' }
    });
    revalidatePath('/app/upgrade');
    revalidatePath('/app/dashboard');
    revalidatePath('/app/account');
    return { ok: true, error: null, info: 'Downgrade auf Free aktiv.' };
  } catch {
    logSafe('billing.error', { code: 'service_unavailable' }, 'error');
    return { ok: false, error: 'Dienst gerade nicht verfügbar.' };
  }
}
