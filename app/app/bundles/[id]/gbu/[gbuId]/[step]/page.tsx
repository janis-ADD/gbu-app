import { notFound } from 'next/navigation';
import { getBundle } from '@/lib/bundles/server';
import { getGbu } from '@/lib/gbus/server';
import {
  listRiskCatalog,
  listMeasureCatalog,
  listLegalRefs
} from '@/lib/catalogs/server';
import { getScope } from '@/lib/wizard/scopes';
import {
  SCOPE_QUESTIONS,
  SCOPE_DEFAULTS,
  type ActivityTags
} from '@/lib/wizard/activities';
import { deriveGbu } from '@/lib/wizard/engine';
import {
  ActivityTagsForm
} from '@/components/gbus/ActivityTagsForm';
import {
  GbuStep2RisksForm,
  GbuStep3MeasuresForm,
  GbuStep4ResponsibilityForm,
  GbuStep5ReleaseForm
} from '@/components/gbus/EngineStepsForms';
import { RiskCard, MissingControlsPanel, PlausibilityPanel, EngineSummary } from '@/components/gbus/EngineOutputs';
import { COPY } from '@/lib/copy/microcopy';
import { explainWeighting } from '@/lib/wizard/explain';
import { getCurrentQuota } from '@/lib/quota/server';

const STEPS = COPY.steps;

export default async function GbuStepPage({
  params
}: {
  params: { id: string; gbuId: string; step: string };
}) {
  const stepNo = parseInt(params.step, 10) as 1 | 2 | 3 | 4 | 5;
  if (!stepNo || stepNo < 1 || stepNo > 5) notFound();

  const [bundle, gbu] = await Promise.all([
    getBundle(params.id),
    getGbu(params.gbuId)
  ]);
  if (!bundle || !gbu || gbu.bundle_id !== bundle.id) notFound();

  const scope = getScope(gbu.scope_slug);
  const meta = STEPS[stepNo]!;

  // Aktuelle Tags + Defaults pro Scope
  const currentTags = (gbu.activities?.tags as ActivityTags) ?? {};
  const tagsEffective: ActivityTags = {
    ...(SCOPE_DEFAULTS[gbu.scope_slug] ?? {}),
    ...currentTags
  };

  return (
    <main className="content">
      <div className="content-head">
        <div>
          <h1>{scope?.icon ?? '📋'} {gbu.title}</h1>
          <p>
            Schritt {stepNo} von 5 ·{' '}
            <a href={`/app/bundles/${bundle.id}`} style={{ color: 'var(--petrol)', fontWeight: 600 }}>
              ‹ Zurück zur Mappe „{bundle.title}"
            </a>
          </p>
        </div>
        {gbu.is_stale ? <span className="badge badge-amber">veraltet — bitte aktualisieren</span> : null}
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        {([1,2,3,4,5] as const).map((n) => (
          <span key={n} className={`badge ${n === stepNo ? 'badge-blue' : n < stepNo ? 'badge-green' : 'badge-gray'}`}>
            {n}. {STEPS[n]!.title}
          </span>
        ))}
      </div>

      <h2 style={{ fontSize: 18, fontWeight: 650, margin: '0 0 8px' }}>{meta.title}</h2>
      <p style={{ fontSize: 13, color: 'var(--text-2)', marginBottom: 16 }}>{meta.lead}</p>

      {stepNo === 1 && (
        <ActivityTagsForm
          bundleId={bundle.id}
          gbuId={gbu.id}
          title={gbu.title}
          isCustomScope={gbu.scope_slug === 'eigener'}
          description={(gbu.activities?.description as string) ?? ''}
          tags={tagsEffective}
          dimensions={SCOPE_QUESTIONS[gbu.scope_slug] ?? ['environment', 'tools']}
        />
      )}
      {stepNo === 2 && <Step2 bundleId={bundle.id} gbu={gbu} tags={tagsEffective} />}
      {stepNo === 3 && <Step3 bundleId={bundle.id} gbu={gbu} tags={tagsEffective} />}
      {stepNo === 4 && (
        <GbuStep4ResponsibilityForm
          bundleId={bundle.id}
          gbuId={gbu.id}
          defaultRole={gbu.responsible_role ?? ''}
          defaultDate={gbu.review_due_date ?? ''}
          defaultIntervalMonths={gbu.review_interval_months ?? null}
          defaultTriggers={gbu.review_trigger_events ?? []}
        />
      )}
      {stepNo === 5 && <Step5 bundleId={bundle.id} gbu={gbu} tags={tagsEffective} />}
    </main>
  );
}

/* ─── Step 2: Engine-Output Risiken + Begründung ─────────────────── */
async function Step2({
  bundleId, gbu, tags
}: {
  bundleId: string;
  gbu: Awaited<ReturnType<typeof getGbu>>;
  tags: ActivityTags;
}) {
  if (!gbu) return null;
  const [riskCatalog, measureCatalog] = await Promise.all([
    listRiskCatalog(), listMeasureCatalog()
  ]);
  const derivation = deriveGbu(tags, riskCatalog, measureCatalog);
  // Vorausgewählte Risiken = entweder gespeicherte oder alle derived
  const stored = (gbu.hazards?.risk_slugs as string[]) ?? [];
  const preselected = stored.length > 0 ? stored : derivation.risks.map((r) => r.risk.slug);

  return (
    <>
      <EngineSummary d={derivation} />
      <MissingControlsPanel items={derivation.missing_controls} />
      <PlausibilityPanel items={derivation.plausibility} />

      <div className="safety-hint">
        <span className="safety-ico" aria-hidden="true">🛡️</span>
        <div>
          <strong>{derivation.risks.length} Gefährdungen abgeleitet.</strong>{' '}
          Jede Karte zeigt, welcher Ihrer Angaben sie ausgelöst hat. Sie können einzelne
          Risiken abwählen — Pflicht-Risiken bitte nur nach kurzer fachlicher Rückfrage entfernen.
          {(() => {
            const w = explainWeighting(tags);
            return w ? (
              <div style={{ marginTop: 6, fontSize: 12, color: 'var(--text-3)' }}>
                {w}
              </div>
            ) : null;
          })()}
        </div>
      </div>

      <div className="area-grid" style={{ marginBottom: 14 }}>
        {derivation.risks.map((d) => <RiskCard key={d.risk.slug} d={d} />)}
      </div>

      <GbuStep2RisksForm
        bundleId={bundleId}
        gbuId={gbu.id}
        risks={derivation.risks.map((d) => d.risk)}
        preselected={preselected}
      />
    </>
  );
}

/* ─── Step 3: Maßnahmen mit Pflicht-Markierung ──────────────────── */
async function Step3({
  bundleId, gbu, tags
}: {
  bundleId: string;
  gbu: Awaited<ReturnType<typeof getGbu>>;
  tags: ActivityTags;
}) {
  if (!gbu) return null;
  const [riskCatalog, measureCatalog, refs] = await Promise.all([
    listRiskCatalog(), listMeasureCatalog(), listLegalRefs()
  ]);
  const derivation = deriveGbu(tags, riskCatalog, measureCatalog);
  const refMap = new Map(refs.map((r) => [r.slug, r]));
  const ack = (gbu.measures?.measure_acknowledgements as Record<string, { confirmed: boolean }>) ?? {};
  // Slug→Name-Lookup für die „Warum erscheint diese Maßnahme?"-Zeile.
  const riskNamesBySlug: Record<string, string> = Object.fromEntries(
    derivation.risks.map((d) => [d.risk.slug, d.risk.name])
  );

  return (
    <>
      <EngineSummary d={derivation} />
      <MissingControlsPanel items={derivation.missing_controls} />

      <GbuStep3MeasuresForm
        bundleId={bundleId}
        gbuId={gbu.id}
        measures={derivation.measures}
        refMap={refMap}
        ack={ack}
        riskNamesBySlug={riskNamesBySlug}
      />
    </>
  );
}

/* ─── Step 5: Release mit Mindestprüfung ────────────────────────── */
async function Step5({
  bundleId, gbu, tags
}: {
  bundleId: string;
  gbu: Awaited<ReturnType<typeof getGbu>>;
  tags: ActivityTags;
}) {
  if (!gbu) return null;
  const [riskCatalog, measureCatalog, quota] = await Promise.all([
    listRiskCatalog(),
    listMeasureCatalog(),
    getCurrentQuota()
  ]);
  const derivation = deriveGbu(tags, riskCatalog, measureCatalog);
  const ack = (gbu.measures?.measure_acknowledgements as Record<string, { confirmed: boolean }>) ?? {};
  const unfulfilled = derivation.measures
    .filter((m) => m.is_mandatory && !ack[m.measure.slug]?.confirmed)
    .map((m) => ({ slug: m.measure.slug, short_text: m.measure.short_text, reason: m.mandatory_reason }));
  // „Letzte freie Freigabe" = Free-Plan + genau noch eine offen.
  // Wenn die Beurteilung schon freigegeben ist, gilt der Hinweis nicht
  // mehr — die Form zeigt dann ohnehin den Erfolg-/Bereits-freigegeben-State.
  const freePlanLastRelease =
    !!quota
    && quota.plan_slug === 'free'
    && quota.remaining === 1
    && gbu.status !== 'released';

  return (
    <GbuStep5ReleaseForm
      bundleId={bundleId}
      gbuId={gbu.id}
      alreadyReleased={gbu.status === 'released'}
      currentVersion={gbu.current_version}
      unfulfilledMandatory={unfulfilled}
      missingControls={derivation.missing_controls}
      freePlanLastRelease={freePlanLastRelease}
    />
  );
}
