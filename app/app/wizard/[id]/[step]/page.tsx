import { notFound } from 'next/navigation';
import { getAssessment } from '@/lib/assessments/server';
import { getCurrentProfile } from '@/lib/profile/server';
import {
  listBgCatalog,
  listRiskCatalog,
  listMeasureCatalog,
  listLegalRefs,
  listTrainingCatalog
} from '@/lib/catalogs/server';
import {
  suggestBgCandidates,
  suggestRisksForAreas,
  suggestMeasuresForRisks,
  suggestTrainingsForRisks,
  suggestAreasForIndustry,
  deriveOpenItems
} from '@/lib/wizard/derive';
import type { GermanState } from '@/lib/db/types';
import { WORK_AREAS } from '@/lib/wizard/areas';
import { Step1Form } from '@/components/wizard/Step1Form';
import { Step2Form } from '@/components/wizard/Step2Form';
import { Step3Form } from '@/components/wizard/Step3Form';
import { Step4Form } from '@/components/wizard/Step4Form';
import { Step5Form } from '@/components/wizard/Step5Form';
import { Step6Release } from '@/components/wizard/Step6Release';
import { SafetyHint, HumanLoopNote } from '@/components/wizard/SafetyHint';

const STEP_TITLES: Record<number, { eyebrow: string; title: string; lead: string }> = {
  1: { eyebrow: 'Schritt 1 von 6', title: 'Betriebsdaten erfassen', lead: 'Grundlagen deines Unternehmens — bitte keine Personennamen.' },
  2: { eyebrow: 'Schritt 2 von 6', title: 'Berufsgenossenschaft', lead: 'Wir schlagen die zuständige BG anhand deiner Branche vor.' },
  3: { eyebrow: 'Schritt 3 von 6', title: 'Arbeitsbereiche auswählen', lead: 'Welche Bereiche kommen in deinem Betrieb tatsächlich vor?' },
  4: { eyebrow: 'Schritt 4 von 6', title: 'Gefahrenquellen bestätigen', lead: 'Aus deinen Bereichen abgeleitete typische Risiken — bitte bestätigen oder ergänzen.' },
  5: { eyebrow: 'Schritt 5 von 6', title: 'Maßnahmen & offene Punkte', lead: 'Welche Schutzmaßnahmen setzt du bereits um?' },
  6: { eyebrow: 'Schritt 6 von 6', title: 'Auswertung & Freigabe', lead: 'Prüfe die Beurteilung und erstelle einen versionsfesten Snapshot.' }
};

export default async function StepPage({
  params
}: {
  params: { id: string; step: string };
}) {
  const stepNo = parseInt(params.step, 10);
  if (!stepNo || stepNo < 1 || stepNo > 6) notFound();

  const a = await getAssessment(params.id);
  if (!a) notFound();
  const meta = STEP_TITLES[stepNo]!;

  // Daten je nach Step
  const ctx = await getCurrentProfile();

  return (
    <div>
      <div className="wizard-head">
        <div>
          <div className="section-eyebrow">{meta.eyebrow}</div>
          <h2 className="section-title-main">{meta.title}</h2>
          <p style={{ fontSize: 13.5, color: 'var(--text-2)', marginTop: 4 }}>
            {meta.lead}
          </p>
        </div>
        <span className={`badge ${stepNo >= 5 ? 'badge-amber' : 'badge-blue'}`}>
          {stepNo >= 5 ? 'Prüfung empfohlen' : 'In Bearbeitung'}
        </span>
      </div>

      <div className="wizard-body">
        {stepNo === 1 && <Step1Section assessmentId={a.id} step1={a.step1_company} profile={ctx?.profile ?? null} />}
        {stepNo === 2 && <Step2Section assessmentId={a.id} step1={a.step1_company} step2={a.step2_bg} profile={ctx?.profile ?? null} />}
        {stepNo === 3 && <Step3Section assessmentId={a.id} step1={a.step1_company} step3={a.step3_areas} />}
        {stepNo === 4 && <Step4Section assessmentId={a.id} step3={a.step3_areas} step4={a.step4_hazards} />}
        {stepNo === 5 && <Step5Section assessmentId={a.id} step3={a.step3_areas} step4={a.step4_hazards} step5={a.step5_measures} />}
        {stepNo === 6 && <Step6Section assessment={a} />}
      </div>
    </div>
  );
}

/* ─── Step-Sektionen (Server Components, laden ihre Daten selbst) ─────── */

async function Step1Section({
  assessmentId,
  step1,
  profile
}: {
  assessmentId: string;
  step1: Record<string, unknown>;
  profile: {
    company_name: string | null;
    industry: string | null;
    employee_bucket: string | null;
    role_in_company: string | null;
    state: GermanState | null;
  } | null;
}) {
  const s = step1 as Record<string, string | undefined>;
  return (
    <>
      <SafetyHint>
        <strong>Wie das System hier arbeitet:</strong>{' '}
        Eingaben werden ausschließlich zur Vorauswahl aus geprüften DGUV-/BG-/ASR-Quellen
        genutzt — keine erfundenen Vorschriften. <HumanLoopNote />
      </SafetyHint>
      <Step1Form
        assessmentId={assessmentId}
        initial={{
          company_name: s.company_name ?? profile?.company_name ?? '',
          industry: s.industry ?? profile?.industry ?? '',
          street: s.street ?? '',
          postal_code: s.postal_code ?? '',
          city: s.city ?? '',
          employee_bucket: s.employee_bucket ?? profile?.employee_bucket ?? '',
          state: s.state ?? profile?.state ?? '',
          role_in_company: s.role_in_company ?? profile?.role_in_company ?? '',
          short_description: s.short_description ?? ''
        }}
      />
    </>
  );
}

async function Step2Section({
  assessmentId,
  step1,
  step2,
  profile
}: {
  assessmentId: string;
  step1: Record<string, unknown>;
  step2: Record<string, unknown>;
  profile: { state: GermanState | null } | null;
}) {
  const bgCatalog = await listBgCatalog();
  const industry = (step1 as { industry?: string }).industry;
  const candidates = suggestBgCandidates(industry, bgCatalog);

  const s2 = step2 as {
    confirmed_bg_slugs?: string[];
    state?: string;
    unclear?: boolean;
  };
  const selected = s2.confirmed_bg_slugs ?? [];
  const state = (s2.state as GermanState | undefined) ?? profile?.state ?? null;

  return (
    <Step2Form
      assessmentId={assessmentId}
      bgCatalog={bgCatalog}
      candidates={candidates}
      selected={selected}
      state={state}
      unclear={!!s2.unclear}
    />
  );
}

async function Step3Section({
  assessmentId,
  step1,
  step3
}: {
  assessmentId: string;
  step1: Record<string, unknown>;
  step3: Record<string, unknown>;
}) {
  const selected = (step3 as { area_slugs?: string[] }).area_slugs ?? [];
  const industry = (step1 as { industry?: string }).industry;
  const preselected = suggestAreasForIndustry(industry);
  return (
    <Step3Form
      assessmentId={assessmentId}
      selected={selected}
      preselectedFromIndustry={preselected}
      industryLabel={industry ?? 'deine Branche'}
    />
  );
}

async function Step4Section({
  assessmentId,
  step3,
  step4
}: {
  assessmentId: string;
  step3: Record<string, unknown>;
  step4: Record<string, unknown>;
}) {
  const areaSlugs = (step3 as { area_slugs?: string[] }).area_slugs ?? [];
  const riskCatalog = await listRiskCatalog();
  const suggested = suggestRisksForAreas(areaSlugs, riskCatalog);
  const selected = (step4 as { risk_slugs?: string[] }).risk_slugs ?? [];

  return (
    <>
      <SafetyHint>
        <strong>Genauigkeit zählt:</strong> Je präziser deine Bestätigung,
        desto passender die Maßnahmen-Vorschläge im nächsten Schritt. Bei
        unklarer Datenlage gibt das System bewusst keine Empfehlung.
      </SafetyHint>
      <Step4Form
        assessmentId={assessmentId}
        suggestedRisks={suggested}
        allRisks={riskCatalog}
        selected={selected}
      />
    </>
  );
}

async function Step5Section({
  assessmentId,
  step3,
  step4,
  step5
}: {
  assessmentId: string;
  step3: Record<string, unknown>;
  step4: Record<string, unknown>;
  step5: Record<string, unknown>;
}) {
  const areaSlugs = (step3 as { area_slugs?: string[] }).area_slugs ?? [];
  const riskSlugs = (step4 as { risk_slugs?: string[] }).risk_slugs ?? [];
  const [measureCatalog, refsForMeasures] = await Promise.all([
    listMeasureCatalog(),
    listLegalRefs()
  ]);
  const measures = suggestMeasuresForRisks(riskSlugs, measureCatalog);
  const openItems = deriveOpenItems(areaSlugs, riskSlugs);
  const ack = (step5 as { measure_acknowledgements?: Record<string, { confirmed: boolean }> })
    .measure_acknowledgements ?? {};
  const legalRefMap = new Map(refsForMeasures.map((r) => [r.slug, r]));

  return (
    <Step5Form
      assessmentId={assessmentId}
      measures={measures}
      openItems={openItems}
      legalRefMap={legalRefMap}
      acknowledged={ack}
    />
  );
}

async function Step6Section({ assessment }: { assessment: Awaited<ReturnType<typeof getAssessment>> }) {
  if (!assessment) return null;
  const a = assessment;
  const areas = ((a.step3_areas as { area_slugs?: string[] }).area_slugs ?? []).map((slug) =>
    WORK_AREAS.find((w) => w.slug === slug)
  ).filter(Boolean);
  const riskSlugs = (a.step4_hazards as { risk_slugs?: string[] }).risk_slugs ?? [];

  const [riskCatalog, measureCatalog, trainingCatalog, refs] = await Promise.all([
    listRiskCatalog(),
    listMeasureCatalog(),
    listTrainingCatalog(),
    listLegalRefs()
  ]);
  const measures = suggestMeasuresForRisks(riskSlugs, measureCatalog);
  const trainings = suggestTrainingsForRisks(riskSlugs, trainingCatalog);
  const risks = riskCatalog.filter((r) => riskSlugs.includes(r.slug));
  const refMap = new Map(refs.map((r) => [r.slug, r]));

  const usedRefSlugs = new Set<string>();
  measures.forEach((m) => m.source_ref_slugs.forEach((s) => usedRefSlugs.add(s)));
  const usedRefs = Array.from(usedRefSlugs)
    .map((s) => refMap.get(s))
    .filter((r): r is NonNullable<typeof r> => !!r);

  const company = a.step1_company as Record<string, string | undefined>;
  const step2 = a.step2_bg as {
    confirmed_bg_slugs?: string[];
    state?: string;
    unclear?: boolean;
    self_verified_at?: string;
  };
  const bgSlugs = step2.confirmed_bg_slugs ?? [];
  const bgCatalog = await listBgCatalog();
  const bgNames = bgSlugs
    .map((s) => bgCatalog.find((b) => b.slug === s)?.name)
    .filter((n): n is string => !!n);
  const bgLabel = step2.unclear
    ? 'noch zu klären (Eigenklärung läuft)'
    : bgNames.length > 0
    ? bgNames.join(', ')
    : '— nicht bestätigt —';
  const verifiedAt = step2.self_verified_at
    ? new Date(step2.self_verified_at).toLocaleDateString('de-DE')
    : null;

  return (
    <>
      <SafetyHint>
        <strong>Vor der Freigabe:</strong> Jede Maßnahme stützt sich auf
        DGUV/BG/ASR-Quellen. Punkte ohne ausreichende Quellenbasis werden als
        „datenarm" markiert und müssen vor Verwendung fachlich geprüft werden.
      </SafetyHint>

      <div className="muster" style={{ marginTop: 0 }}>
        <div className="muster-head">
          <div>
            <div className="muster-title">Vorschau — Gefährdungsbeurteilung</div>
            <div className="muster-sub">Strukturierter Entwurf aus geprüften Quellen.</div>
          </div>
          <span className="badge badge-blue">{usedRefs.length} Quellen</span>
        </div>
        <div className="muster-body">
          <div className="trust-banner">
            <div className="trust-shield">🛡️</div>
            <div className="trust-banner-body">
              <div className="trust-banner-title">So wurde dieser Entwurf erstellt</div>
              <div className="trust-banner-text">
                Ausschließlich aus dem geprüften <strong>DGUV / BG / ASR-Quellenkatalog</strong>{' '}
                gewählt. Keine erfundenen Vorschriften.{' '}
                <HumanLoopNote />
              </div>
            </div>
          </div>

          <section>
            <h3>1. Betriebsdaten</h3>
            <div className="data-box">
              <div><strong>Unternehmen:</strong> {company.company_name ?? '—'}</div>
              <div><strong>Branche:</strong> {company.industry ?? '—'}</div>
              <div><strong>Standort:</strong> {[company.postal_code, company.city].filter(Boolean).join(' ') || '—'}</div>
              <div><strong>Bundesland:</strong> {step2.state ?? company.state ?? '—'}</div>
              <div><strong>Mitarbeitende:</strong> {company.employee_bucket ?? '—'}</div>
              <div><strong>Verantwortliche Rolle:</strong> {company.role_in_company ?? '—'}</div>
              <div>
                <strong>Vom Betrieb bestätigte Zuständigkeit:</strong> {bgLabel}
                {verifiedAt ? <em style={{ color: 'var(--text-3)' }}> · Eigenklärung dokumentiert am {verifiedAt}</em> : null}
              </div>
            </div>
          </section>

          {areas.length > 0 && (
            <section>
              <h3>2. Arbeitsbereiche</h3>
              <div className="tag-row">
                {areas.map((w) => (
                  <span key={w!.slug} className="tag">{w!.icon} {w!.name}</span>
                ))}
              </div>
            </section>
          )}

          {risks.length > 0 && (
            <section>
              <h3>3. Gefährdungen und empfohlene Maßnahmen</h3>
              <div className="risk-table">
                <div className="risk-table-head">
                  <span>Gefährdung</span>
                  <span>Kategorie</span>
                  <span>Schutzmaßnahmen (Belege)</span>
                </div>
                {risks.map((r) => {
                  const ms = measures.filter((m) => m.applies_to_risks.includes(r.slug));
                  return (
                    <div className="risk-table-row" key={r.slug}>
                      <div>{r.name}</div>
                      <div>{r.category}</div>
                      <div>
                        {ms.length === 0 ? (
                          <em>keine zugeordnete Standardmaßnahme</em>
                        ) : (
                          <ul style={{ paddingLeft: 16, margin: 0 }}>
                            {ms.map((m) => (
                              <li key={m.slug} style={{ marginBottom: 6 }}>
                                {m.short_text}
                                <div className="src-chip-row" style={{ marginTop: 4 }}>
                                  {m.source_ref_slugs.map((s) => {
                                    const ref = refMap.get(s);
                                    return ref ? (
                                      <span key={s} className="src-chip" title={ref.title}>
                                        {ref.citation}
                                      </span>
                                    ) : null;
                                  })}
                                </div>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {trainings.length > 0 && (
            <section>
              <h3>4. Empfohlene Unterweisungen</h3>
              <div className="tag-row">
                {trainings.map((t) => (
                  <span key={t.slug} className="tag">{t.name}</span>
                ))}
              </div>
              <div className="note" style={{ marginTop: 8 }}>
                Die Aktivierung als Unterweisungs-Module läuft später über Memberspot
                (Pro-Plan).
              </div>
            </section>
          )}

          {usedRefs.length > 0 && (
            <section>
              <h3>📚 Quellen-Verzeichnis</h3>
              <div className="source-list">
                <ol>
                  {usedRefs.map((r) => (
                    <li key={r.slug}>
                      <code>{r.citation}</code> <strong>{r.title}</strong>
                      {r.url ? <a href={r.url} target="_blank" rel="noopener">Quelle ↗</a> : null}
                    </li>
                  ))}
                </ol>
                <div className="source-list-foot">
                  Kuratiertes Mini-Set (v1) · vor produktiver Nutzung Fachredaktion empfohlen.
                </div>
              </div>
            </section>
          )}

          <div className="print-note">
            <strong>Hinweis:</strong> Dieser Inhalt ist ein KI-/Catalog-gestützter
            Entwurf und ersetzt keine fachkundige Prüfung durch Arbeitgeber,
            verantwortliche Person, Fachkraft für Arbeitssicherheit oder andere
            zuständige Stellen.
          </div>
        </div>
      </div>

      {/* Upgrade-/Unterweisungs-CTA (Conversion) */}
      <div className="quota-card" style={{ marginTop: 20, marginBottom: 12 }}>
        <div className="quota-icon">⭐</div>
        <div className="quota-body">
          <div className="quota-title">Nach der Freigabe: Pro-Plan testen</div>
          <div className="quota-desc">
            Mit <strong>Pro</strong> aktivierst du die empfohlenen Unterweisungen
            direkt aus dieser GBU heraus für deine Mitarbeitenden — über Memberspot.
          </div>
        </div>
        <a href="/app/upgrade" className="btn btn-primary">Pro ansehen</a>
      </div>

      <div style={{ marginTop: 20 }}>
        <Step6Release
          assessmentId={a.id}
          alreadyReleased={a.status === 'released'}
          currentVersion={a.current_version}
        />
      </div>
    </>
  );
}
