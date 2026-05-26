'use server';

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { OnboardingSchema } from '@/lib/auth/onboarding-schema';
import { logSafe } from '@/lib/log';
import type { OnboardingState } from '@/lib/forms/states';

// Types/Initial-States: siehe lib/forms/states.ts (Next.js erlaubt in
// "use server"-Dateien nur async-function-Exports).

export async function completeOnboardingAction(
  _prev: OnboardingState,
  formData: FormData
): Promise<OnboardingState> {
  const parsed = OnboardingSchema.safeParse({
    company_name: formData.get('company_name'),
    industry: formData.get('industry')
  });
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return { ok: false, error: first?.message ?? 'Bitte Felder prüfen.' };
  }

  let success = false;
  try {
    const supabase = createClient();
    const { data: userData, error: userErr } = await supabase.auth.getUser();
    if (userErr || !userData.user) {
      return { ok: false, error: 'Sitzung abgelaufen — bitte erneut anmelden.' };
    }

    const { error } = await supabase
      .from('ra_user_profiles')
      .update({
        company_name: parsed.data.company_name,
        industry: parsed.data.industry,
        display_name: parsed.data.company_name,
        onboarding_completed_at: new Date().toISOString()
      })
      .eq('user_id', userData.user.id);

    if (error) {
      logSafe('onboarding.update.fail', { code: error.code ?? 'unknown' }, 'warn');
      return {
        ok: false,
        error: 'Profil konnte nicht gespeichert werden. Bitte später erneut versuchen.'
      };
    }

    // Audit-Event
    await supabase.from('ra_audit_events').insert({
      action: 'onboarding.complete',
      actor_user_id: userData.user.id,
      tenant_id: userData.user.id,
      metadata: { stage: 'onboarding' }
    });

    logSafe('onboarding.complete.ok', { user_id: userData.user.id });
    success = true;
  } catch {
    logSafe('onboarding.error', { code: 'service_unavailable' }, 'error');
    return {
      ok: false,
      error: 'Speichern gerade nicht verfügbar. Bitte später erneut versuchen.'
    };
  }

  if (success) redirect('/app/dashboard?ev=onboarding_complete');
  return { ok: false, error: 'Unbekannter Fehler.' };
}
