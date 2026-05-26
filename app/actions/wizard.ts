'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { logSafe } from '@/lib/log';
import type { WizardFormState, ReleaseState } from '@/lib/forms/states';

// Types/Initial-States liegen in lib/forms/states.ts (Next.js erlaubt in
// "use server"-Dateien nur async-function-Exports).

/**
 * Wizard Server Actions — eine pro Step plus Release.
 * Jede Action validiert per zod, schreibt in die jsonb-Spalte,
 * setzt current_step hoch und revalidiert die Page.
 *
 * RLS sorgt für Tenant-Check (assessment.tenant_id = auth.uid()).
 */

const Step1Schema = z.object({
  company_name: z.string().trim().min(2).max(120),
  industry:     z.string().trim().min(2).max(80),
  street:       z.string().trim().max(120).optional().or(z.literal('')),
  postal_code:  z.string().trim().max(10).optional().or(z.literal('')),
  city:         z.string().trim().max(80).optional().or(z.literal('')),
  employee_bucket: z.enum(['1', '2-5', '6-20', '21-50', '51-250', '250+']),
  state: z.enum(['BW','BY','BE','BB','HB','HH','HE','MV','NI','NW','RP','SL','SN','ST','SH','TH']),
  role_in_company: z.string().trim().min(2).max(80),
  short_description: z.string().trim().max(2000).optional().or(z.literal(''))
});

const Step2Schema = z.object({
  // Multi-Select: mind. 1 Kandidat oder explizit "noch unklar"
  confirmed_bg_slugs: z.array(z.string()).optional().default([]),
  state: z.string().trim().min(2).max(2).optional().or(z.literal('')),
  unclear: z.boolean(),       // "Zuständigkeit noch zu klären"
  self_verified: z.boolean()  // Pflicht-Eigenklärungs-Checkbox
}).refine(
  (d) => d.self_verified === true,
  { message: 'Bitte die Eigenklärungs-Checkbox bestätigen.', path: ['self_verified'] }
).refine(
  (d) => d.unclear || d.confirmed_bg_slugs.length > 0,
  { message: 'Bitte mindestens eine BG auswählen oder „noch unklar" markieren.', path: ['confirmed_bg_slugs'] }
);

const Step3Schema = z.object({
  area_slugs: z.array(z.string()).min(1, 'Bitte mindestens einen Bereich wählen.')
});

const Step4Schema = z.object({
  risk_slugs: z.array(z.string()).min(1, 'Bitte mindestens ein Risiko bestätigen.')
});

const Step5Schema = z.object({
  // Pro Maßnahme: confirmed (boolean) + notes (optional)
  measure_acknowledgements: z.record(z.object({
    confirmed: z.boolean(),
    notes: z.string().max(500).optional()
  })),
  // Pro OpenItem: resolved (boolean)
  open_item_resolutions: z.record(z.boolean())
});

type ActionResult =
  | { ok: true }
  | { ok: false; error: string };

async function persistStep<T extends Record<string, unknown>>(
  assessmentId: string,
  stepNo: 1 | 2 | 3 | 4 | 5 | 6,
  column: 'step1_company' | 'step2_bg' | 'step3_areas' | 'step4_hazards' | 'step5_measures' | 'step6_review',
  payload: T
): Promise<ActionResult> {
  try {
    const supabase = createClient();
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return { ok: false, error: 'Sitzung abgelaufen.' };

    const next = Math.min(6, stepNo + 1);
    const newStatus = stepNo === 6 ? 'in_review' : 'draft';

    const { error } = await supabase
      .from('ra_assessments')
      .update({
        [column]: payload,
        current_step: next,
        status: newStatus
      })
      .eq('id', assessmentId);

    if (error) {
      logSafe('wizard.save.fail', { code: error.code ?? 'unknown', stage: column }, 'warn');
      return { ok: false, error: 'Speichern fehlgeschlagen. Bitte erneut versuchen.' };
    }

    await supabase.from('ra_audit_events').insert({
      action: `wizard.${column}.save`,
      actor_user_id: userData.user.id,
      tenant_id: userData.user.id,
      target_table: 'ra_assessments',
      target_id: assessmentId,
      metadata: { step: stepNo }
    });

    return { ok: true };
  } catch {
    logSafe('wizard.save.error', { code: 'service_unavailable' }, 'error');
    return { ok: false, error: 'Dienst gerade nicht verfügbar.' };
  }
}

// ─── Step 1 ────────────────────────────────────────────────────────────
export async function saveStep1(
  assessmentId: string,
  _prev: WizardFormState,
  formData: FormData
): Promise<WizardFormState> {
  const parsed = Step1Schema.safeParse({
    company_name: formData.get('company_name'),
    industry: formData.get('industry'),
    street: formData.get('street'),
    postal_code: formData.get('postal_code'),
    city: formData.get('city'),
    employee_bucket: formData.get('employee_bucket'),
    state: formData.get('state'),
    role_in_company: formData.get('role_in_company'),
    short_description: formData.get('short_description')
  });
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return { ok: false, error: first?.message ?? 'Bitte Felder prüfen.' };
  }
  const res = await persistStep(assessmentId, 1, 'step1_company', parsed.data);
  if (!res.ok) return { ok: false, error: res.error };
  revalidatePath(`/app/wizard/${assessmentId}`, 'layout');
  redirect(`/app/wizard/${assessmentId}/2`);
}

// ─── Step 2 — BG-Kandidaten (KEINE Empfehlung) ─────────────────────────
export async function saveStep2(
  assessmentId: string,
  _prev: WizardFormState,
  formData: FormData
): Promise<WizardFormState> {
  const slugs = formData.getAll('confirmed_bg_slug').map((v) => String(v));
  const parsed = Step2Schema.safeParse({
    confirmed_bg_slugs: slugs,
    state: formData.get('state') ?? '',
    unclear: formData.get('unclear') === 'on',
    self_verified: formData.get('self_verified') === 'on'
  });
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return { ok: false, error: first?.message ?? 'Bitte Felder prüfen.' };
  }
  const res = await persistStep(assessmentId, 2, 'step2_bg', {
    confirmed_bg_slugs: parsed.data.confirmed_bg_slugs,
    state: parsed.data.state || null,
    unclear: parsed.data.unclear,
    self_verified: true,
    self_verified_at: new Date().toISOString()
  });
  if (!res.ok) return { ok: false, error: res.error };
  revalidatePath(`/app/wizard/${assessmentId}`, 'layout');
  redirect(`/app/wizard/${assessmentId}/3`);
}

// ─── Step 3 ────────────────────────────────────────────────────────────
export async function saveStep3(
  assessmentId: string,
  _prev: WizardFormState,
  formData: FormData
): Promise<WizardFormState> {
  const slugs = formData.getAll('area_slug').map((v) => String(v));
  const parsed = Step3Schema.safeParse({ area_slugs: slugs });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Bitte Bereiche wählen.' };
  }
  const res = await persistStep(assessmentId, 3, 'step3_areas', parsed.data);
  if (!res.ok) return { ok: false, error: res.error };
  revalidatePath(`/app/wizard/${assessmentId}`, 'layout');
  redirect(`/app/wizard/${assessmentId}/4`);
}

// ─── Step 4 ────────────────────────────────────────────────────────────
export async function saveStep4(
  assessmentId: string,
  _prev: WizardFormState,
  formData: FormData
): Promise<WizardFormState> {
  const slugs = formData.getAll('risk_slug').map((v) => String(v));
  const parsed = Step4Schema.safeParse({ risk_slugs: slugs });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Bitte Risiken bestätigen.' };
  }
  const res = await persistStep(assessmentId, 4, 'step4_hazards', parsed.data);
  if (!res.ok) return { ok: false, error: res.error };
  revalidatePath(`/app/wizard/${assessmentId}`, 'layout');
  redirect(`/app/wizard/${assessmentId}/5`);
}

// ─── Step 5 ────────────────────────────────────────────────────────────
export async function saveStep5(
  assessmentId: string,
  _prev: WizardFormState,
  formData: FormData
): Promise<WizardFormState> {
  // Reads checkbox-Pairs aus FormData: measure_<slug>=on
  const measureAck: Record<string, { confirmed: boolean }> = {};
  for (const [key, value] of formData.entries()) {
    if (key.startsWith('measure_')) {
      measureAck[key.slice('measure_'.length)] = { confirmed: value === 'on' };
    }
  }
  const openItems: Record<string, boolean> = {};
  for (const [key, value] of formData.entries()) {
    if (key.startsWith('open_')) {
      openItems[key.slice('open_'.length)] = value === 'on';
    }
  }
  const parsed = Step5Schema.safeParse({
    measure_acknowledgements: measureAck,
    open_item_resolutions: openItems
  });
  if (!parsed.success) {
    return { ok: false, error: 'Bitte Maßnahmen prüfen.' };
  }
  const res = await persistStep(assessmentId, 5, 'step5_measures', parsed.data);
  if (!res.ok) return { ok: false, error: res.error };
  revalidatePath(`/app/wizard/${assessmentId}`, 'layout');
  redirect(`/app/wizard/${assessmentId}/6`);
}

// ─── Release (Step 6) ──────────────────────────────────────────────────
export async function releaseAssessmentAction(
  assessmentId: string,
  _prev: ReleaseState,
  formData: FormData
): Promise<ReleaseState> {
  const ack = formData.get('disclaimer_ack') === 'on';
  if (!ack) {
    return { kind: 'error', message: 'Bitte Disclaimer bestätigen.' };
  }
  try {
    const supabase = createClient();
    const { data, error } = await supabase.rpc('ra_release_version', {
      p_assessment_id: assessmentId,
      p_disclaimer_ack: true,
      p_release_notes: null
    });
    if (error) {
      logSafe('wizard.release.fail', { code: error.code ?? error.message?.slice(0, 40) ?? 'unknown' }, 'warn');
      // PostgreSQL custom errcode '53400' = quota_exhausted
      if (error.code === '53400' || (error.message ?? '').includes('quota_exhausted')) {
        return { kind: 'paywall' };
      }
      return {
        kind: 'error',
        message: 'Freigabe fehlgeschlagen. Bitte später erneut versuchen.'
      };
    }
    const versionId = String(data);
    // Versionsnummer per zweitem Query
    const { data: ver } = await supabase
      .from('ra_assessment_versions')
      .select('version_number')
      .eq('id', versionId)
      .maybeSingle<{ version_number: number }>();

    logSafe('wizard.release.ok', { version_number: ver?.version_number ?? 0 });
    return {
      kind: 'success',
      versionId,
      versionNumber: ver?.version_number ?? 0
    };
  } catch {
    logSafe('wizard.release.error', { code: 'service_unavailable' }, 'error');
    return {
      kind: 'error',
      message: 'Dienst gerade nicht verfügbar.'
    };
  }
}
