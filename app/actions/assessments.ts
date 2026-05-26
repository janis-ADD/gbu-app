'use server';

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { logSafe } from '@/lib/log';

/**
 * Erstellt ein neues Assessment für den eingeloggten User
 * und leitet zum Wizard Schritt 1 weiter.
 *
 * Erstellung ist im MVP IMMER erlaubt (auch wenn Quota voll) —
 * die Paywall greift erst beim Release (gemäß Modell A).
 *
 * Hinweis zu redirect(): wird ausschließlich AUSSERHALB von try/catch
 * aufgerufen, sonst verschluckt der catch den NEXT_REDIRECT-Error.
 */
type Result =
  | { kind: 'go-wizard'; id: string }
  | { kind: 'go-login' }
  | { kind: 'go-list-with-error'; code: 'create_failed' | 'service_unavailable' };

async function attempt(): Promise<Result> {
  try {
    const supabase = createClient();
    const { data: userData, error: userErr } = await supabase.auth.getUser();
    if (userErr || !userData.user) {
      return { kind: 'go-login' };
    }
    const userId = userData.user.id;

    const defaultTitle = `Gefährdungsbeurteilung ${new Date().toLocaleDateString(
      'de-DE',
      { year: 'numeric', month: '2-digit', day: '2-digit' }
    )}`;

    const { data, error } = await supabase
      .from('ra_assessments')
      .insert({
        tenant_id: userId,
        owner_user_id: userId,
        title: defaultTitle
      })
      .select('id')
      .single<{ id: string }>();

    if (error || !data) {
      logSafe('assessment.create.fail', { code: error?.code ?? 'unknown' }, 'warn');
      return { kind: 'go-list-with-error', code: 'create_failed' };
    }

    await supabase.from('ra_audit_events').insert({
      action: 'assessment.create',
      actor_user_id: userId,
      tenant_id: userId,
      target_table: 'ra_assessments',
      target_id: data.id
    });

    logSafe('assessment.create.ok', { user_id: userId });
    return { kind: 'go-wizard', id: data.id };
  } catch {
    logSafe('assessment.create.error', { code: 'service_unavailable' }, 'error');
    return { kind: 'go-list-with-error', code: 'service_unavailable' };
  }
}

export async function createAssessmentAction(): Promise<void> {
  const result = await attempt();
  if (result.kind === 'go-login') redirect('/login');
  if (result.kind === 'go-list-with-error') {
    redirect(`/app/assessments?error=${result.code}`);
  }
  redirect(`/app/wizard/${result.id}/1?ev=assessment_create`);
}
