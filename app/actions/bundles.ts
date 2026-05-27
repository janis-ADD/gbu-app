'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { logSafe } from '@/lib/log';
import { suggestScopesForIndustry, getScope } from '@/lib/wizard/scopes';
import { buildDefaultGbuTitle } from '@/lib/wizard/titles';
import type { BundleSetupState } from '@/lib/forms/states';

/**
 * Bundle = Compliance-Mappe pro Betrieb (1 pro Snapshot).
 * Enthält Unternehmensdaten + BG, dient als Container für N GBUs.
 *
 * Types/Initial-States: lib/forms/states.ts (Next.js erlaubt in
 * "use server"-Dateien nur async-function-Exports).
 */

type CreateResult =
  | { kind: 'go-bundle'; id: string }
  | { kind: 'go-login' }
  | { kind: 'go-list-with-error'; code: 'create_failed' | 'service_unavailable' };

async function attemptCreate(): Promise<CreateResult> {
  try {
    const supabase = createClient();
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return { kind: 'go-login' };
    const userId = userData.user.id;

    const defaultTitle = `Gefährdungsbeurteilung ${new Date().toLocaleDateString(
      'de-DE',
      { year: 'numeric', month: '2-digit', day: '2-digit' }
    )}`;

    // Profil als Default-Seed für Bundle-Setup
    const { data: profile } = await supabase
      .from('ra_user_profiles')
      .select('company_name, industry, employee_bucket, role_in_company, state')
      .eq('user_id', userId)
      .maybeSingle();

    const seededCompany = {
      company_name: profile?.company_name ?? '',
      industry: profile?.industry ?? '',
      employee_bucket: profile?.employee_bucket ?? '',
      role_in_company: profile?.role_in_company ?? '',
      state: profile?.state ?? ''
    };

    const { data, error } = await supabase
      .from('ra_bundles')
      .insert({
        tenant_id: userId,
        owner_user_id: userId,
        title: defaultTitle,
        company_profile: seededCompany
      })
      .select('id')
      .single<{ id: string }>();

    if (error || !data) {
      logSafe('bundle.create.fail', { code: error?.code ?? 'unknown' }, 'warn');
      return { kind: 'go-list-with-error', code: 'create_failed' };
    }

    await supabase.from('ra_audit_events').insert({
      action: 'bundle.create',
      actor_user_id: userId,
      tenant_id: userId,
      target_table: 'ra_bundles',
      target_id: data.id
    });
    logSafe('bundle.create.ok', { user_id: userId });
    return { kind: 'go-bundle', id: data.id };
  } catch {
    logSafe('bundle.create.error', { code: 'service_unavailable' }, 'error');
    return { kind: 'go-list-with-error', code: 'service_unavailable' };
  }
}

export async function createBundleAction(): Promise<void> {
  const result = await attemptCreate();
  if (result.kind === 'go-login') redirect('/login');
  if (result.kind === 'go-list-with-error') {
    redirect(`/app/bundles?error=${result.code}`);
  }
  redirect(`/app/bundles/${result.id}/setup?ev=bundle_create`);
}

/* ─── Bundle-Setup (Phase A): Company + BG ─────────────────────────── */

const BUCKET = ['1', '2-5', '6-20', '21-50', '51-250', '250+'] as const;
const STATES = ['BW','BY','BE','BB','HB','HH','HE','MV','NI','NW','RP','SL','SN','ST','SH','TH'] as const;

const CompanySchema = z.object({
  company_name: z.string().trim().min(2, 'Bitte Firmennamen angeben.').max(120),
  industry: z.string().trim().min(2, 'Bitte Branche wählen.').max(80),
  employee_bucket: z.enum(BUCKET, {
    errorMap: () => ({ message: 'Bitte Mitarbeiterzahl wählen.' })
  }),
  state: z.enum(STATES, {
    errorMap: () => ({ message: 'Bitte Bundesland wählen.' })
  }),
  role_in_company: z.string().trim().min(2).max(80),
  street: z.string().trim().max(120).optional().or(z.literal('')),
  postal_code: z.string().trim().max(10).optional().or(z.literal('')),
  city: z.string().trim().max(80).optional().or(z.literal('')),
  short_description: z.string().trim().max(2000).optional().or(z.literal(''))
});

export async function saveBundleCompany(
  bundleId: string,
  _prev: BundleSetupState,
  formData: FormData
): Promise<BundleSetupState> {
  const parsed = CompanySchema.safeParse({
    company_name: formData.get('company_name'),
    industry: formData.get('industry'),
    employee_bucket: formData.get('employee_bucket'),
    state: formData.get('state'),
    role_in_company: formData.get('role_in_company'),
    street: formData.get('street'),
    postal_code: formData.get('postal_code'),
    city: formData.get('city'),
    short_description: formData.get('short_description')
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Bitte Felder prüfen.' };
  }

  try {
    const supabase = createClient();
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return { ok: false, error: 'Sitzung abgelaufen.' };

    // Vor Update: alten industry-Wert holen, um Stale-Markierung zu entscheiden
    const { data: oldRow } = await supabase
      .from('ra_bundles')
      .select('company_profile')
      .eq('id', bundleId)
      .maybeSingle<{ company_profile: Record<string, unknown> }>();
    const oldIndustry = (oldRow?.company_profile as { industry?: string })?.industry;

    const { error } = await supabase
      .from('ra_bundles')
      .update({ company_profile: parsed.data })
      .eq('id', bundleId);
    if (error) {
      logSafe('bundle.company.save.fail', { code: error.code ?? 'unknown' }, 'warn');
      return { ok: false, error: 'Speichern fehlgeschlagen.' };
    }

    // Wenn Industry sich geändert hat → alle GBUs als stale markieren
    if (oldIndustry && oldIndustry !== parsed.data.industry) {
      await supabase
        .from('ra_gbus')
        .update({ is_stale: true, stale_reason: 'industry_changed' })
        .eq('bundle_id', bundleId)
        .neq('status', 'released');
      logSafe('bundle.industry.changed', { stage: 'mark_stale' }, 'warn');
    }
  } catch {
    logSafe('bundle.company.save.error', { code: 'service_unavailable' }, 'error');
    return { ok: false, error: 'Dienst gerade nicht verfügbar.' };
  }

  revalidatePath(`/app/bundles/${bundleId}`, 'layout');
  redirect(`/app/bundles/${bundleId}/setup?step=bg`);
}

const BgSchema = z.object({
  confirmed_bg_slugs: z.array(z.string()).optional().default([]),
  state: z.string().trim().max(2).optional().or(z.literal('')),
  unclear: z.boolean(),
  self_verified: z.boolean()
})
  .refine((d) => d.self_verified === true, {
    message: 'Bitte die Eigenklärungs-Checkbox bestätigen.',
    path: ['self_verified']
  })
  .refine((d) => d.unclear || d.confirmed_bg_slugs.length > 0, {
    message: 'Bitte mindestens eine BG auswählen oder „noch unklar" markieren.',
    path: ['confirmed_bg_slugs']
  });

export async function saveBundleBg(
  bundleId: string,
  _prev: BundleSetupState,
  formData: FormData
): Promise<BundleSetupState> {
  const slugs = formData.getAll('confirmed_bg_slug').map((v) => String(v));
  const parsed = BgSchema.safeParse({
    confirmed_bg_slugs: slugs,
    state: formData.get('state') ?? '',
    unclear: formData.get('unclear') === 'on',
    self_verified: formData.get('self_verified') === 'on'
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Bitte Felder prüfen.' };
  }

  const bg = {
    confirmed_bg_slugs: parsed.data.confirmed_bg_slugs,
    state: parsed.data.state || null,
    unclear: parsed.data.unclear,
    self_verified: true,
    self_verified_at: new Date().toISOString()
  };

  try {
    const supabase = createClient();
    const { error } = await supabase
      .from('ra_bundles')
      .update({
        bg_assignment: bg,
        status: 'active',
        setup_completed_at: new Date().toISOString()
      })
      .eq('id', bundleId);
    if (error) {
      logSafe('bundle.bg.save.fail', { code: error.code ?? 'unknown' }, 'warn');
      return { ok: false, error: 'Speichern fehlgeschlagen.' };
    }
  } catch {
    logSafe('bundle.bg.save.error', { code: 'service_unavailable' }, 'error');
    return { ok: false, error: 'Dienst gerade nicht verfügbar.' };
  }

  revalidatePath(`/app/bundles/${bundleId}`, 'layout');
  redirect(`/app/bundles/${bundleId}?ev=bundle_setup_done`);
}

/* ─── GBU-Skelett aus Branche generieren (1-Klick) ────────────────── */
export async function seedGbusFromIndustryAction(bundleId: string): Promise<void> {
  let okRedirect = false;
  try {
    const supabase = createClient();
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) {
      redirect('/login');
    }
    const userId = userData.user!.id;

    const { data: bundle } = await supabase
      .from('ra_bundles')
      .select('company_profile')
      .eq('id', bundleId)
      .maybeSingle<{ company_profile: { industry?: string; company_name?: string } }>();
    const industry = bundle?.company_profile?.industry;
    const companyName = bundle?.company_profile?.company_name;
    const suggestions = suggestScopesForIndustry(industry);

    // Nur Scopes anlegen, die noch nicht existieren
    const { data: existing } = await supabase
      .from('ra_gbus')
      .select('scope_slug')
      .eq('bundle_id', bundleId);
    const existSet = new Set((existing ?? []).map((r) => (r as { scope_slug: string }).scope_slug));

    const rows = suggestions
      .filter((s) => !existSet.has(s.slug))
      .map((s) => {
        const scope = getScope(s.slug);
        return {
          tenant_id: userId,
          bundle_id: bundleId,
          scope_slug: s.slug,
          // Sprechender Default-Titel: „{scope.title} · {companyName}".
          // Fällt defensiv auf den Scope-Titel zurück, wenn der Firmenname
          // fehlt — der Nutzer wird in Schritt 1 ohnehin zum Konkretisieren
          // angehalten.
          title: buildDefaultGbuTitle(scope?.title ?? s.slug, companyName),
          hazards: { risk_slugs: scope?.default_risk_slugs ?? [] },
          activities: { description: s.reason }
        };
      });

    if (rows.length > 0) {
      const { error } = await supabase.from('ra_gbus').insert(rows);
      if (error) {
        logSafe('gbu.seed.fail', { code: error.code ?? 'unknown' }, 'warn');
      } else {
        logSafe('gbu.seed.ok', { stage: String(rows.length) });
      }
    }
    okRedirect = true;
  } catch {
    logSafe('gbu.seed.error', { code: 'service_unavailable' }, 'error');
  }
  if (okRedirect) {
    redirect(`/app/bundles/${bundleId}?ev=gbu_seed`);
  }
  redirect(`/app/bundles/${bundleId}`);
}

/* ─── Bundle archivieren (Soft-Delete) ───────────────────────────── */
export async function archiveBundleAction(bundleId: string): Promise<void> {
  try {
    const supabase = createClient();
    await supabase
      .from('ra_bundles')
      .update({ deleted_at: new Date().toISOString(), status: 'archived' })
      .eq('id', bundleId);
    logSafe('bundle.archive', { target_id: bundleId });
  } catch {
    logSafe('bundle.archive.error', { code: 'service_unavailable' }, 'error');
  }
  revalidatePath('/app/bundles');
  redirect('/app/bundles');
}
