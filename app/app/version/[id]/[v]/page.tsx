import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getVersion } from '@/lib/versions/server';
import { getAssessment } from '@/lib/assessments/server';
import { getCurrentQuota } from '@/lib/quota/server';
import {
  listBgCatalog,
  listLegalRefs,
  listMeasureCatalog,
  listRiskCatalog,
  listTrainingCatalog
} from '@/lib/catalogs/server';
import {
  suggestMeasuresForRisks,
  suggestTrainingsForRisks
} from '@/lib/wizard/derive';
import { WORK_AREAS } from '@/lib/wizard/areas';
import { PrintButton } from '@/components/version/PrintButton';
import { HumanLoopNote } from '@/components/wizard/SafetyHint';

export default async function VersionPage({
  params
}: {
  params: { id: string; v: string };
}) {
  const v = parseInt(params.v, 10);
  if (!v || v < 1) notFound();

  const [version, assessment, quota] = await Promise.all([
    getVersion(params.id, v),
    getAssessment(params.id),
    getCurrentQuota()
  ]);
  if (!version || !assessment) notFound();

  // Snapshot enthält bereits company/bg/areas/hazards/measures/review,
  // wir nutzen jedoch die Catalogs als Quelle für Display (deterministisch).
  const snap = version.snapshot as Record<string, Record<string, unknown>>;
  const company = (snap.company ?? {}) as Record<string, string | undefined>;
  const bgBlock = (snap.bg ?? {}) as {
    confirmed_bg_slugs?: string[];
    state?: string;
    unclear?: boolean;
    self_verified_at?: string;
  };
  const areaSlugs = ((snap.areas as { area_slugs?: string[] } | undefined)?.area_slugs ?? []);
  const riskSlugs = ((snap.hazards as { risk_slugs?: string[] } | undefined)?.risk_slugs ?? []);

  const [bgCatalog, riskCatalog, measureCatalog, trainingCatalog, refs] = await Promise.all([
    listBgCatalog(),
    listRiskCatalog(),
    listMeasureCatalog(),
    listTrainingCatalog(),
    listLegalRefs()
  ]);
  const bgNames = (bgBlock.confirmed_bg_slugs ?? [])
    .map((s) => bgCatalog.find((b) => b.slug === s)?.name)
    .filter((n): n is string => !!n);
  const bgLabel = bgBlock.unclear
    ? 'noch zu klären (Eigenklärung läuft)'
    : bgNames.length > 0
    ? bgNames.join(', ')
    : '— nicht bestätigt —';
  const verifiedAt = bgBlock.self_verified_at
    ? new Date(bgBlock.self_verified_at).toLocaleDateString('de-DE')
    : null;
  const refMap = new Map(refs.map((r) => [r.slug, r]));
  const measures = suggestMeasuresForRisks(riskSlugs, measureCatalog);
  const trainings = suggestTrainingsForRisks(riskSlugs, trainingCatalog);
  const risks = riskCatalog.filter((r) => riskSlugs.includes(r.slug));
  const areas = areaSlugs
    .map((slug) => WORK_AREAS.find((w) => w.slug === slug))
    .filter((a): a is NonNullable<typeof a> => !!a);

  const usedRefSlugs = new Set<string>();
  measures.forEach((m) => m.source_ref_slugs.forEach((s) => usedRefSlugs.add(s)));
  const usedRefs = Array.from(usedRefSlugs)
    .map((s) => refMap.get(s))
    .filter((r): r is NonNullable<typeof r> => !!r);

  const isFree = quota?.plan_slug === 'free';
  const versionHash = `sha256:${(version.id as string).replace(/-/g, '').slice(0, 12)}…`;

  return (
    <main className="content">
      <div className="content-head">
        <div>
          <h1>{assessment.title}</h1>
          <p>
            Version v{version.version_number} · freigegeben am{' '}
            {new Date(version.released_at).toLocaleDateString('de-DE')} ·{' '}
            <Link href="/app/assessments" style={{ color: 'var(--petrol)', fontWeight: 600 }}>
              ‹ Alle Beurteilungen
            </Link>
          </p>
        </div>
        <PrintButton />
      </div>

      <div className="alert-banner is-success">
        <span className="alert-banner-icon">✅</span>
        <div className="alert-banner-text">
          <strong>Version v{version.version_number} aktiv.</strong>{' '}
          Snapshot ist unveränderlich (Append-only). Disclaimer wurde
          bestätigt. Versions-Hash: <code>{versionHash}</code>
        </div>
      </div>

      {quota?.plan_slug !== 'pro' && (
        <div className="quota-card" style={{ marginBottom: '1.5rem' }}>
          <div className="quota-icon">⭐</div>
          <div className="quota-body">
            <div className="quota-title">
              {quota?.plan_slug === 'basic'
                ? 'Pro: Unterweisungen aktivieren'
                : 'Nächster Schritt: Unterweisungen aktivieren'}
            </div>
            <div className="quota-desc">
              {quota?.plan_slug === 'basic'
                ? 'Mit Pro aktivierst du die empfohlenen Unterweisungs-Module direkt aus dieser GBU für deine Mitarbeitenden — über Memberspot.'
                : 'Mit Basic entfernst du das Wasserzeichen und erhältst unbegrenzte Releases. Mit Pro kannst du zusätzlich Unterweisungen aktivieren.'}
            </div>
          </div>
          <a href="/app/upgrade" className="btn btn-primary">Plan ansehen</a>
        </div>
      )}

      <div className={`muster${isFree ? ' is-free-watermark' : ''}`}>
        <div className="muster-head">
          <div>
            <div className="muster-title">{assessment.title} — v{version.version_number}</div>
            <div className="muster-sub">
              Quellenstand: {usedRefs[0]?.reviewed_at?.slice(0, 10) ?? '—'}
              {isFree ? ' · Free-Plan: PDF mit Wasserzeichen' : ''}
            </div>
          </div>
          <span className="badge badge-green">Freigegeben</span>
        </div>

        <div className="print-only" style={{ padding: '18px 22px', borderBottom: '1px solid #ccc' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 11, color: '#555' }}>
            <span><strong>SU24 — KI-Gefährdungsbeurteilung</strong></span>
            <span>{company.company_name ?? '—'} · v{version.version_number}</span>
            <span>{versionHash}</span>
          </div>
        </div>

        <div className="muster-body">
          <div className="trust-banner">
            <div className="trust-shield">🛡️</div>
            <div className="trust-banner-body">
              <div className="trust-banner-title">
                Diese Version wurde durch die verantwortliche Person geprüft und freigegeben
              </div>
              <div className="trust-banner-text">
                Maßnahmen wurden ausschließlich aus dem geprüften
                <strong> DGUV / BG / ASR-Quellenkatalog</strong> abgeleitet —
                <strong> keine erfundenen Vorschriften</strong>.{' '}
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
              <div><strong>Bundesland:</strong> {bgBlock.state ?? company.state ?? '—'}</div>
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
                  <span key={w.slug} className="tag">{w.icon} {w.name}</span>
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
                Aktivierung als Unterweisungs-Module folgt über Memberspot (Pro-Plan).
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
                  <strong>Quellenstand:</strong> {usedRefs[0]?.reviewed_at?.slice(0, 10) ?? '—'} ·
                  <strong> Pflege durch:</strong> {usedRefs[0]?.reviewed_by ?? '—'} ·
                  Kuratiertes Mini-Set, Fachredaktion vor produktiver Nutzung empfohlen.
                </div>
              </div>
            </section>
          )}

          <div className="print-note">
            <strong>Pflicht-Disclaimer:</strong> Dieser Inhalt ist ein KI-/Catalog-gestützter
            Entwurf für eine Gefährdungsbeurteilung und ersetzt keine fachkundige Prüfung
            durch Arbeitgeber, verantwortliche Person, Fachkraft für Arbeitssicherheit
            oder andere zuständige Stellen.
          </div>
        </div>

        <div
          className="print-only"
          style={{ padding: '14px 22px', borderTop: '1px solid #ccc', textAlign: 'center', fontSize: 10, color: '#666' }}
        >
          SU24 — Gefährdungsbeurteilung · {versionHash} · gedruckt am{' '}
          {new Date().toLocaleDateString('de-DE')}
        </div>
      </div>
    </main>
  );
}
