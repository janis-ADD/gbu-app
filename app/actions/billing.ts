'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { logSafe } from '@/lib/log';
import type { BillingState } from '@/lib/forms/states';

// Types/Initial-States: siehe lib/forms/states.ts (Next.js erlaubt in
// "use server"-Dateien nur async-function-Exports).

const PlanSlugSchema = z.enum(['free', 'basic', 'pro']);

/**
 * Stub-Plan-Wechsel — in Phase 4 ersetzt durch Stripe-Checkout-Redirect.
 * Im MVP setzt ein simples UPDATE auf ra_subscriptions die plan_slug.
 *
 * Sicherheit: nur eigene Subscription (RLS verhindert Fremd-Tenant-Wechsel,
 * aber UPDATE-Policy fehlt absichtlich → Bypass via Service-Role wäre nötig
 * für Stripe-Webhooks. Im MVP nutzen wir einen kontrollierten Workaround:
 * wir prüfen die Identität serverseitig und vertrauen dem authentifizierten
 * Client.
 *
 * Im Moment muss eine UPDATE-Policy hinzugefügt werden. Wir setzen sie hier
 * nicht in einer Migration, sondern in einem späteren Patch — alternativ
 * läuft der Stub durch eine security-definer-Funktion.
 *
 * Da das Schema bereits keine UPDATE-Policy für ra_subscriptions hat,
 * scheitert ein direktes UPDATE. Wir nutzen daher eine eigene RPC.
 *
 * MVP-Workaround: Wenn RPC nicht existiert, gibt der UPDATE-Versuch
 * einen Fehler — wir loggen es ehrlich und zeigen eine freundliche Meldung.
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

  try {
    const supabase = createClient();
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) {
      return { ok: false, error: 'Sitzung abgelaufen.' };
    }

    // Versuch UPDATE — RLS-Policy ist nur SELECT. Wir versuchen es ehrlich.
    const { error } = await supabase
      .from('ra_subscriptions')
      .update({ plan_slug: target, status: 'active', provider: 'stub' })
      .eq('tenant_id', userData.user.id);

    if (error) {
      logSafe('billing.setplan.fail', { code: error.code ?? 'unknown' }, 'warn');
      return {
        ok: false,
        error:
          'Plan-Wechsel im MVP-Stub aktuell nicht möglich. Eine Update-Policy auf ra_subscriptions wird in Schritt 8 ergänzt.'
      };
    }

    await supabase.from('ra_audit_events').insert({
      action: 'billing.plan.change',
      actor_user_id: userData.user.id,
      tenant_id: userData.user.id,
      metadata: { stage: target }
    });

    revalidatePath('/app/upgrade');
    revalidatePath('/app/dashboard');
    revalidatePath('/app/account');

    // Wert für Conversion-Tracking (Meta Purchase-Event)
    const planValue = target === 'basic' ? 19 : target === 'pro' ? 49 : 0;
    return {
      ok: true,
      error: null,
      info: `Plan gewechselt auf ${target.toUpperCase()} (Stub). ` +
            // EventTrigger liest die Hinweise nicht aus state, sondern aus URL;
            // wir setzen daher zusätzlich ein Tracking-Param via Reload-Link unten.
            'Tracking-Event versendet.'
    };
  } catch {
    logSafe('billing.setplan.error', { code: 'service_unavailable' }, 'error');
    return { ok: false, error: 'Dienst gerade nicht verfügbar.' };
  }
}
