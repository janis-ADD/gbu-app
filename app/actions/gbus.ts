'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { logSafe } from '@/lib/log';
import { getScope } from '@/lib/wizard/scopes';
import { buildDefaultGbuTitle } from '@/lib/wizard/titles';
import {
  listRiskCatalog,
  listMeasureCatalog,
  listLegalRefs
} from '@/lib/catalogs/server';
import { buildEngineSnapshot } from '@/lib/wizard/engine';
import type { ActivityTags } from '@/lib/wizard/activities';
import type {
  WizardFormState,
  ReleaseState
} from '@/lib/forms/states';

/**
 * GBU Server Actions. Eine GBU ist eine tätigkeitsbezogene Beurteilung
 * innerhalb eines Bundles.
 *
 * State-Invalidation: Änderungen an hazards markieren measures als leer.
 */

/* ─── GBU innerhalb Bundle erstellen ───────────────────────────────── */
type CreateGbuResult =
  | { kind: 'go-gbu'; bundleId: string; gbuId: string }
  | { kind: 'go-bundle-error'; bundleId: string; code: string };

/**
 * Custom-Title-Sanitizer: max 80 Zeichen, alphanumerisch + Leerzeichen +
 * deutsche Sonderzeichen + sichere Satzzeichen. Keine HTML-Tags, keine
 * Quotes (verhindert Display-Bruch + JSON-Probleme).
 */
// Erlaubt zusätzlich das schmale „·" (Middle Dot, U+00B7) — wird in der
// Default-Titel-Logik als Trenner zwischen Scope und Firmenname benutzt
// (siehe lib/wizard/titles.ts).
const SAFE_TITLE_PATTERN = /[^a-zA-Z0-9äöüÄÖÜß ·\-.,/&()]/g;
function sanitizeCustomTitle(raw: string): string {
  return raw.replace(SAFE_TITLE_PATTERN, '').trim().slice(0, 80);
}

const CreateGbuSchema = z.object({
  bundle_id: z.string().uuid(),
  scope_slug: z.string().min(2).max(60),
  custom_title: z.string().trim().max(200).optional().or(z.literal(''))
});

async function attemptCreateGbu(
  bundleId: string,
  scopeSlug: string,
  customTitle?: string
): Promise<CreateGbuResult> {
  try {
    const supabase = createClient();
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) {
      return { kind: 'go-bundle-error', bundleId, code: 'auth' };
    }
    const userId = userData.user.id;
    const scope = getScope(scopeSlug);

    // Firmennamen aus dem Bundle holen — für sprechenden Default-Titel.
    const { data: bundleRow } = await supabase
      .from('ra_bundles')
      .select('company_profile')
      .eq('id', bundleId)
      .maybeSingle<{ company_profile: { company_name?: string } | null }>();
    const companyName = bundleRow?.company_profile?.company_name;

    // Für eigene Arbeitsbereiche: Custom-Titel ist Pflicht und wird
    // sanitisiert. Für vordefinierte Scopes: „{scope.title} · {company}".
    let title: string;
    if (scopeSlug === 'eigener') {
      const cleaned = customTitle ? sanitizeCustomTitle(customTitle) : '';
      if (cleaned.length < 3) {
        return { kind: 'go-bundle-error', bundleId, code: 'title_too_short' };
      }
      title = cleaned;
    } else {
      title = buildDefaultGbuTitle(scope?.title ?? scopeSlug, companyName);
    }

    const { data, error } = await supabase
      .from('ra_gbus')
      .insert({
        tenant_id: userId,
        bundle_id: bundleId,
        scope_slug: scopeSlug,
        title,
        hazards: { risk_slugs: scope?.default_risk_slugs ?? [] },
        activities: scope ? { description: scope.rationale } : {}
      })
      .select('id')
      .single<{ id: string }>();

    if (error || !data) {
      logSafe('gbu.create.fail', { code: error?.code ?? 'unknown' }, 'warn');
      return { kind: 'go-bundle-error', bundleId, code: 'create_failed' };
    }

    await supabase.from('ra_audit_events').insert({
      action: 'gbu.create',
      actor_user_id: userId,
      tenant_id: userId,
      target_table: 'ra_gbus',
      target_id: data.id,
      metadata: { stage: scopeSlug, custom: scopeSlug === 'eigener' }
    });

    return { kind: 'go-gbu', bundleId, gbuId: data.id };
  } catch {
    logSafe('gbu.create.error', { code: 'service_unavailable' }, 'error');
    return { kind: 'go-bundle-error', bundleId, code: 'service_unavailable' };
  }
}

export async function createGbuAction(formData: FormData): Promise<void> {
  const parsed = CreateGbuSchema.safeParse({
    bundle_id: formData.get('bundle_id'),
    scope_slug: formData.get('scope_slug'),
    custom_title: formData.get('custom_title')
  });
  if (!parsed.success) {
    redirect('/app/bundles');
  }
  const result = await attemptCreateGbu(
    parsed.data!.bundle_id,
    parsed.data!.scope_slug,
    parsed.data!.custom_title || undefined
  );
  if (result.kind === 'go-bundle-error') {
    redirect(`/app/bundles/${result.bundleId}?error=${result.code}`);
  }
  redirect(`/app/bundles/${result.bundleId}/gbu/${result.gbuId}/1?ev=gbu_create`);
}

/* ─── GBU Steps speichern ──────────────────────────────────────────── */

const ActivitiesSchema = z.object({
  description: z.string().trim().max(2000).optional().or(z.literal('')),
  tags: z.object({
    work_height: z.enum(['keine','bis-2m','ueber-2m','fassade-dach']).optional(),
    mobility:    z.enum(['stationaer','baustelle','aussendienst','fahrzeuge']).optional(),
    environment: z.array(z.string()).optional(),
    tools:       z.array(z.string()).optional(),
    hazardous_substances: z.array(z.string()).optional(),
    workforce:   z.array(z.string()).optional(),
    psychological: z.array(z.string()).optional(),
    // Iteration-3-Kontext-Tags. Alle optional — wenn nicht gesetzt,
    // verhält sich die Engine wie in Iteration 2 (Multiplikator 1.0).
    intensity:   z.enum(['gelegentlich','regelmaessig','taeglich','dauerhaft']).optional(),
    exposure:    z.enum(['gering','mittel','hoch']).optional()
  }).optional()
});

/** Title kann jederzeit umbenannt werden (gerade für eigene Bereiche). */
const TitleEditSchema = z.string().trim().min(3).max(80);

const HazardsSchema = z.object({
  risk_slugs: z.array(z.string()).min(1, 'Bitte mindestens ein Risiko bestätigen.')
});

const MeasuresSchema = z.object({
  measure_acknowledgements: z.record(
    z.object({
      confirmed: z.boolean(),
      note: z.string().max(500).optional()
    })
  )
});

const REVIEW_TRIGGER_VALUES = ['unfall', 'neue-maschine', 'neuer-gefahrstoff', 'neue-taetigkeit', 'gesetzesaenderung'] as const;

const ResponsibleSchema = z.object({
  responsible_role: z.string().trim().min(2, 'Bitte Rolle angeben.').max(80),
  review_due_date: z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/, 'Bitte gültiges Datum (JJJJ-MM-TT).'),
  review_interval_months: z.union([
    z.literal('6'), z.literal('12'), z.literal('24'), z.literal('')
  ]).optional(),
  review_trigger_events: z.array(z.enum(REVIEW_TRIGGER_VALUES)).optional()
});

async function persistGbuStep(
  gbuId: string,
  stepNo: 1 | 2 | 3 | 4 | 5,
  patch: Record<string, unknown>,
  /** zusätzlich downstream-Felder auf Default zurücksetzen */
  downstreamReset?: Record<string, unknown>
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const supabase = createClient();
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return { ok: false, error: 'Sitzung abgelaufen.' };

    const next = Math.min(5, stepNo + 1);
    const merged = {
      ...patch,
      ...(downstreamReset ?? {}),
      current_step: next,
      is_stale: false,
      stale_reason: null,
      status: stepNo === 5 ? 'in_review' : 'draft'
    };

    const { error } = await supabase.from('ra_gbus').update(merged).eq('id', gbuId);
    if (error) {
      logSafe('gbu.save.fail', { code: error.code ?? 'unknown', stage: String(stepNo) }, 'warn');
      return { ok: false, error: 'Speichern fehlgeschlagen.' };
    }
    await supabase.from('ra_audit_events').insert({
      action: `gbu.step${stepNo}.save`,
      actor_user_id: userData.user.id,
      tenant_id: userData.user.id,
      target_table: 'ra_gbus',
      target_id: gbuId,
      metadata: { stage: String(stepNo) }
    });
    return { ok: true };
  } catch {
    logSafe('gbu.save.error', { code: 'service_unavailable' }, 'error');
    return { ok: false, error: 'Dienst gerade nicht verfügbar.' };
  }
}

/* Step 1 — Tätigkeitsbeschreibung + optionales Umbenennen */
export async function saveGbuStep1(
  bundleId: string,
  gbuId: string,
  _prev: WizardFormState,
  formData: FormData
): Promise<WizardFormState> {
  const description = formData.get('description');
  const work_height = formData.get('work_height');
  const mobility = formData.get('mobility');
  const environment = formData.getAll('environment').map(String);
  const tools = formData.getAll('tools').map(String);
  const hazardous_substances = formData.getAll('hazardous_substances').map(String);
  const workforce = formData.getAll('workforce').map(String);
  const psychological = formData.getAll('psychological').map(String);
  const rawTitle = formData.get('title');
  // Iteration-3-Kontext-Tags. Leere Strings („Noch nicht sicher") werden
  // herausgefiltert — fehlende Werte bleiben fehlend, die Engine bleibt
  // konservativ (Multiplikator 1.0).
  const intensityRaw = formData.get('intensity');
  const exposureRaw  = formData.get('exposure');
  const intensity = typeof intensityRaw === 'string' && intensityRaw.length > 0 ? intensityRaw : undefined;
  const exposure  = typeof exposureRaw  === 'string' && exposureRaw.length  > 0 ? exposureRaw  : undefined;

  const parsed = ActivitiesSchema.safeParse({
    description,
    tags: {
      ...(work_height ? { work_height } : {}),
      ...(mobility ? { mobility } : {}),
      ...(environment.length ? { environment } : {}),
      ...(tools.length ? { tools } : {}),
      ...(hazardous_substances.length ? { hazardous_substances } : {}),
      ...(workforce.length ? { workforce } : {}),
      ...(psychological.length ? { psychological } : {}),
      ...(intensity ? { intensity } : {}),
      ...(exposure ? { exposure } : {})
    }
  });
  if (!parsed.success) {
    return { ok: false, error: 'Bitte Tätigkeitsangaben prüfen.' };
  }

  // Optionales Umbenennen — Sanitizer wie beim Anlegen
  let titlePatch: { title: string } | null = null;
  if (typeof rawTitle === 'string' && rawTitle.trim().length > 0) {
    const cleaned = sanitizeCustomTitle(rawTitle);
    const titleParse = TitleEditSchema.safeParse(cleaned);
    if (!titleParse.success) {
      return { ok: false, error: 'Bitte einen gültigen Titel angeben (3–80 Zeichen).' };
    }
    titlePatch = { title: titleParse.data };
  }

  // Wenn Tags sich ändern → Maßnahmen-Bestätigungen zurücksetzen (Engine derived neu)
  const supabase = createClient();
  const { data: cur } = await supabase
    .from('ra_gbus')
    .select('activities, hazards, title')
    .eq('id', gbuId)
    .maybeSingle<{
      activities: { tags?: Record<string, unknown> };
      hazards: { risk_slugs?: string[] };
      title: string;
    }>();

  const oldTags = JSON.stringify(cur?.activities?.tags ?? {});
  const newTags = JSON.stringify(parsed.data.tags ?? {});
  const tagsChanged = oldTags !== newTags;

  const res = await persistGbuStep(
    gbuId,
    1,
    { activities: parsed.data, ...(titlePatch ?? {}) },
    tagsChanged ? { hazards: {}, measures: {} } : undefined
  );
  if (!res.ok) return { ok: false, error: res.error };
  revalidatePath(`/app/bundles/${bundleId}`, 'layout');
  redirect(`/app/bundles/${bundleId}/gbu/${gbuId}/2`);
}

/* Step 2 — Gefährdungen wählen (mit Downstream-Reset auf measures) */
export async function saveGbuStep2(
  bundleId: string,
  gbuId: string,
  _prev: WizardFormState,
  formData: FormData
): Promise<WizardFormState> {
  const slugs = formData.getAll('risk_slug').map((v) => String(v));
  const parsed = HazardsSchema.safeParse({ risk_slugs: slugs });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Bitte Risiken wählen.' };
  }

  // Wichtig: vorhandene measures NICHT pauschal löschen, sondern auf {} zurücksetzen
  // → User muss in Step 3 erneut bestätigen welche Maßnahmen umgesetzt sind.
  // Das ist die State-Invalidation-Policy.
  const supabase = createClient();
  const { data: cur } = await supabase
    .from('ra_gbus')
    .select('hazards')
    .eq('id', gbuId)
    .maybeSingle<{ hazards: { risk_slugs?: string[] } }>();
  const oldSlugs = cur?.hazards?.risk_slugs ?? [];
  const newSlugs = parsed.data.risk_slugs;
  const changed =
    oldSlugs.length !== newSlugs.length ||
    !oldSlugs.every((s) => newSlugs.includes(s));

  const res = await persistGbuStep(
    gbuId,
    2,
    { hazards: parsed.data },
    changed ? { measures: {} } : undefined
  );
  if (!res.ok) return { ok: false, error: res.error };
  revalidatePath(`/app/bundles/${bundleId}`, 'layout');
  redirect(`/app/bundles/${bundleId}/gbu/${gbuId}/3`);
}

/* Step 3 — Maßnahmen-Bestätigung */
export async function saveGbuStep3(
  bundleId: string,
  gbuId: string,
  _prev: WizardFormState,
  formData: FormData
): Promise<WizardFormState> {
  const ack: Record<string, { confirmed: boolean }> = {};
  for (const [key, value] of formData.entries()) {
    if (key.startsWith('measure_')) {
      ack[key.slice('measure_'.length)] = { confirmed: value === 'on' };
    }
  }
  const parsed = MeasuresSchema.safeParse({ measure_acknowledgements: ack });
  if (!parsed.success) {
    return { ok: false, error: 'Bitte Maßnahmen prüfen.' };
  }
  const res = await persistGbuStep(gbuId, 3, { measures: parsed.data });
  if (!res.ok) return { ok: false, error: res.error };
  revalidatePath(`/app/bundles/${bundleId}`, 'layout');
  redirect(`/app/bundles/${bundleId}/gbu/${gbuId}/4`);
}

/* Step 4 — Verantwortliche Rolle + Wirksamkeits-Folge-Datum (ArbSchG §6)
 *          + optionales Standard-Intervall + Trigger-Anlässe (ArbSchG §3).
 */
export async function saveGbuStep4(
  bundleId: string,
  gbuId: string,
  _prev: WizardFormState,
  formData: FormData
): Promise<WizardFormState> {
  const parsed = ResponsibleSchema.safeParse({
    responsible_role: formData.get('responsible_role'),
    review_due_date: formData.get('review_due_date'),
    review_interval_months: formData.get('review_interval_months') ?? undefined,
    review_trigger_events: formData.getAll('review_trigger_events').map(String)
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Bitte Felder prüfen.' };
  }
  const interval = parsed.data.review_interval_months as string | undefined;
  const patch = {
    responsible_role: parsed.data.responsible_role,
    review_due_date: parsed.data.review_due_date,
    review_interval_months: interval && interval.length > 0 ? parseInt(interval, 10) : null,
    review_trigger_events: parsed.data.review_trigger_events ?? []
  };
  const res = await persistGbuStep(gbuId, 4, patch);
  if (!res.ok) return { ok: false, error: res.error };
  revalidatePath(`/app/bundles/${bundleId}`, 'layout');
  redirect(`/app/bundles/${bundleId}/gbu/${gbuId}/5`);
}

/* Step 5 — Release.
 *
 * Compliance-Pfad (Doktrin): vor dem RPC-Aufruf wird der vollständige
 * Engine-Snapshot vom Server erzeugt (deterministisch aus aktuellen Tags +
 * Stammdaten) und als JSONB an ra_release_gbu(p_engine_snapshot) übergeben.
 * Damit ist die Version reproduzierbar OHNE die Engine je wieder aufzurufen.
 */
export async function releaseGbuAction(
  bundleId: string,
  gbuId: string,
  _prev: ReleaseState,
  formData: FormData
): Promise<ReleaseState> {
  const ack = formData.get('disclaimer_ack') === 'on';
  if (!ack) return { kind: 'error', message: 'Bitte Disclaimer bestätigen.' };

  try {
    const supabase = createClient();

    // 1. Aktuelle GBU laden — Tags + ausgewählte Risiken + Acks
    const { data: gbu, error: gbuErr } = await supabase
      .from('ra_gbus')
      .select('id, tenant_id, activities, hazards, measures, deleted_at, is_stale')
      .eq('id', gbuId)
      .maybeSingle<{
        id: string;
        tenant_id: string;
        activities: { description?: string; tags?: ActivityTags } | null;
        hazards: { risk_slugs?: string[] } | null;
        measures: { measure_acknowledgements?: Record<string, { confirmed: boolean; note?: string }> } | null;
        deleted_at: string | null;
        is_stale: boolean;
      }>();

    if (gbuErr || !gbu || gbu.deleted_at) {
      logSafe('gbu.release.gbu_missing', { code: gbuErr?.code ?? 'not_found' }, 'warn');
      return { kind: 'error', message: 'GBU nicht gefunden.' };
    }

    // 2. Stammdaten (gecacht) — Snapshot baut self-contained drauf auf
    const [riskCatalog, measureCatalog, legalRefs] = await Promise.all([
      listRiskCatalog(),
      listMeasureCatalog(),
      listLegalRefs()
    ]);

    // 3. Engine-Snapshot deterministisch bauen
    const tags = (gbu.activities?.tags ?? {}) as ActivityTags;
    const selectedRiskSlugs = gbu.hazards?.risk_slugs ?? [];
    const acks = gbu.measures?.measure_acknowledgements ?? {};
    const engineSnapshot = buildEngineSnapshot(
      tags,
      riskCatalog,
      measureCatalog,
      legalRefs,
      acks,
      selectedRiskSlugs
    );

    // 4. RPC mit Snapshot — atomar in DB, Quota- und Stale-Check serverseitig
    const { data, error } = await supabase.rpc('ra_release_gbu', {
      p_gbu_id: gbuId,
      p_disclaimer_ack: true,
      p_release_notes: null,
      p_engine_snapshot: engineSnapshot
    });
    if (error) {
      logSafe('gbu.release.fail', { code: error.code ?? error.message?.slice(0, 40) ?? 'unknown' }, 'warn');
      if (error.code === '53400' || (error.message ?? '').includes('quota_exhausted')) {
        return { kind: 'paywall' };
      }
      if ((error.message ?? '').includes('gbu_is_stale')) {
        return {
          kind: 'error',
          message: 'Diese GBU ist veraltet (Unternehmensdaten/BG wurden geändert). Bitte Inhalt erneut bestätigen.'
        };
      }
      return { kind: 'error', message: 'Freigabe fehlgeschlagen.' };
    }
    const versionId = String(data);
    const { data: ver } = await supabase
      .from('ra_gbu_versions')
      .select('version_number')
      .eq('id', versionId)
      .maybeSingle<{ version_number: number }>();
    logSafe('gbu.release.ok', {
      version_number: ver?.version_number ?? 0,
      engine_version: engineSnapshot.engine_version,
      catalog_hash_prefix: engineSnapshot.catalog_hash.slice(0, 12)
    });
    revalidatePath(`/app/bundles/${bundleId}`, 'layout');
    return {
      kind: 'success',
      versionId,
      versionNumber: ver?.version_number ?? 0
    };
  } catch {
    logSafe('gbu.release.error', { code: 'service_unavailable' }, 'error');
    return { kind: 'error', message: 'Dienst gerade nicht verfügbar.' };
  }
}

/* GBU archivieren (alter Pfad, weiterhin verfügbar). */
export async function archiveGbuAction(bundleId: string, gbuId: string): Promise<void> {
  try {
    const supabase = createClient();
    await supabase
      .from('ra_gbus')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', gbuId);
    logSafe('gbu.archive', { target_id: gbuId });
  } catch {
    logSafe('gbu.archive.error', { code: 'service_unavailable' }, 'error');
  }
  revalidatePath(`/app/bundles/${bundleId}`);
  redirect(`/app/bundles/${bundleId}`);
}

/* ─── GBU löschen mit Paywall-Schutz ──────────────────────────────────
 * Regel (DOKTRIN: "Bezahl-/Paywall-Logik darf nicht umgangen werden"):
 *   - Drafts/In-Review: jederzeit löschbar.
 *   - Freigegebene GBUs auf Free-Plan: BLOCKIERT — sonst könnte der User
 *     löschen → neu erstellen → erneut freigeben, um das 3-GBU-Limit zu
 *     umgehen. Quota basiert auf ra_gbu_versions; selbst wenn er löscht,
 *     bleibt die Version-Zählung erhalten (deshalb wäre die Aktion eh
 *     wirkungslos), aber wir blockieren explizit für klare UX.
 *   - Freigegebene GBUs auf Basic/Pro: löschbar (kein Limit-Konflikt).
 */
async function attemptDeleteGbu(
  tenantId: string,
  gbuId: string
): Promise<'ok' | 'not_found' | 'blocked_free_released' | 'service_unavailable'> {
  try {
    const supabase = createClient();
    const { data: gbu } = await supabase
      .from('ra_gbus')
      .select('id, status, tenant_id, deleted_at')
      .eq('id', gbuId)
      .maybeSingle<{ id: string; status: string; tenant_id: string; deleted_at: string | null }>();

    if (!gbu || gbu.tenant_id !== tenantId || gbu.deleted_at) {
      logSafe('gbu.delete.not_found', { target_id: gbuId }, 'warn');
      return 'not_found';
    }

    if (gbu.status === 'released') {
      const { data: sub } = await supabase
        .from('ra_subscriptions')
        .select('plan_slug')
        .eq('tenant_id', tenantId)
        .maybeSingle<{ plan_slug: string }>();
      const plan = sub?.plan_slug ?? 'free';
      if (plan === 'free') {
        logSafe('gbu.delete.blocked_free_released', { target_id: gbuId }, 'warn');
        return 'blocked_free_released';
      }
    }

    await supabase
      .from('ra_gbus')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', gbuId);
    await supabase.from('ra_audit_events').insert({
      action: 'gbu.delete',
      actor_user_id: tenantId,
      tenant_id: tenantId,
      target_table: 'ra_gbus',
      target_id: gbuId,
      metadata: { status: gbu.status }
    });
    logSafe('gbu.delete.ok', { target_id: gbuId });
    return 'ok';
  } catch {
    logSafe('gbu.delete.error', { code: 'service_unavailable' }, 'error');
    return 'service_unavailable';
  }
}

export async function deleteGbuAction(bundleId: string, gbuId: string): Promise<void> {
  const supabase = createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) {
    redirect('/login');
  }
  const result = await attemptDeleteGbu(userData.user.id, gbuId);
  revalidatePath(`/app/bundles/${bundleId}`);
  const qs = result === 'ok' ? '?notice=gbu_deleted' : `?error=${result}`;
  redirect(`/app/bundles/${bundleId}${qs}`);
}
