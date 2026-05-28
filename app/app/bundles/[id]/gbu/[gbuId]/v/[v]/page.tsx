import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getBundle } from '@/lib/bundles/server';
import { getGbu, getGbuVersion } from '@/lib/gbus/server';
import { getCurrentQuota } from '@/lib/quota/server';
import {
  listBgCatalog, listLegalRefs, listMeasureCatalog, listRiskCatalog
} from '@/lib/catalogs/server';
import { getScope } from '@/lib/wizard/scopes';
import { industryLabel } from '@/lib/wizard/industries';
import {
  buildEngineSnapshot,
  isEngineSnapshotV2,
  verifySnapshotIntegrity,
  ENGINE_VERSION,
  type EngineSnapshotV2
} from '@/lib/wizard/engine';
import type { ActivityTags } from '@/lib/wizard/activities';
import {
  sortMeasuresForUi,
  UI_GROUP_LABELS,
  UI_GROUP_DESCRIPTIONS,
  UI_GROUP_ORDER
} from '@/lib/wizard/ui-priority';
import { COPY, OBLIGATION_UI_LABELS } from '@/lib/copy/microcopy';
import {
  explainRiskTriggers,
  explainMeasureBasis,
  explainWeighting,
  qualitativeSeverity,
  qualitativeLikelihood
} from '@/lib/wizard/explain';
import { REVIEW_TRIGGER_EVENTS, type ReviewIntervalMonths, type ReviewTriggerEvent } from '@/lib/db/types';
import { PrintButton } from '@/components/version/PrintButton';

const TRIGGER_LABELS: Record<ReviewTriggerEvent, string> = Object.fromEntries(
  REVIEW_TRIGGER_EVENTS.map((t) => [t.value, t.label])
) as Record<ReviewTriggerEvent, string>;

function intervalLabel(m: ReviewIntervalMonths | null | undefined): string {
  if (!m) return 'Kein festes Intervall';
  if (m === 6)  return 'Alle 6 Monate';
  if (m === 12) return 'Alle 12 Monate';
  if (m === 24) return 'Alle 24 Monate';
  return `Alle ${m} Monate`;
}

/**
 * Version-Page (Read-only Snapshot + Druckansicht).
 *
 * Compliance-Doktrin: Eine veröffentlichte GBU ist ein UNVERÄNDERLICHES
 * Artefakt. Diese Seite liest ausschließlich aus `snapshot.engine_snapshot`
 * — niemals deriveGbu() auf Live-Daten anwenden.
 *
 * Legacy-Versionen (vor Migration 0009) haben kein engine_snapshot. Für
 * diese wird ein deutlich gekennzeichneter Best-Effort-Snapshot aus den
 * AKTUELLEN Stammdaten gebaut, mit klarem Warnbanner für den User.
 */
export default async function GbuVersionPage({
  params
}: {
  params: { id: string; gbuId: string; v: string };
}) {
  const v = parseInt(params.v, 10);
  if (!v || v < 1) notFound();

  const [bundle, gbu, version, quota] = await Promise.all([
    getBundle(params.id),
    getGbu(params.gbuId),
    getGbuVersion(params.gbuId, v),
    getCurrentQuota()
  ]);
  if (!bundle || !gbu || !version || gbu.bundle_id !== bundle.id) notFound();

  const snap = version.snapshot as Record<string, unknown>;
  const bundleData = (snap.bundle ?? {}) as Record<string, unknown>;
  const gbuData = (snap.gbu ?? {}) as Record<string, unknown>;
  const company = ((bundleData.company ?? {}) as Record<string, string | undefined>);
  const bg = ((bundleData.bg ?? {}) as Record<string, unknown>);
  const bgSlugs = (bg.confirmed_bg_slugs as string[]) ?? [];
  const responsibleRole = gbuData.responsible_role as string | undefined;
  const reviewDate = gbuData.review_due_date as string | undefined;
  const reviewInterval = (gbuData.review_interval_months as ReviewIntervalMonths | null | undefined) ?? gbu.review_interval_months;
  const reviewTriggers = ((gbuData.review_trigger_events as ReviewTriggerEvent[] | undefined) ?? gbu.review_trigger_events ?? []) as ReviewTriggerEvent[];
  const scope = getScope((gbuData.scope_slug as string) ?? gbu.scope_slug);
  const isCustomScope = (gbuData.scope_slug ?? gbu.scope_slug) === 'eigener';
  const areaLabel = isCustomScope ? 'Eigener Arbeitsbereich' : (scope?.title ?? '—');

  // BG-Catalog wird nur zur Anzeige der BG-Namen gebraucht (Display-Werte,
  // die User selbst ausgewählt hat) — kein Engine-Ergebnis, akzeptabel
  // dass diese aus aktuellem Stand kommen.
  const bgCatalog = await listBgCatalog();
  const bgNames = bgSlugs.map((s) => bgCatalog.find((b) => b.slug === s)?.name).filter(Boolean) as string[];

  /* ─── Engine-Snapshot extrahieren + Integrität prüfen ─────────────── */
  const rawEngineSnap = snap.engine_snapshot;
  let engineSnap: EngineSnapshotV2;
  let isLegacy = false;
  let legacyNote: string | null = null;

  if (isEngineSnapshotV2(rawEngineSnap)) {
    engineSnap = rawEngineSnap;
  } else {
    // Legacy oder v1-ohne-Hash: aus aktuellen Live-Daten ein Best-Effort-
    // Snapshot generieren (NICHT in DB persistieren). Mit klarem Banner.
    isLegacy = true;
    const legacyKind = (rawEngineSnap as { note?: string; schema_version?: number } | null)?.note ?? null;
    const legacySchemaVersion = (rawEngineSnap as { schema_version?: number } | null)?.schema_version;
    legacyNote = legacyKind === 'legacy_release_no_engine_snapshot'
      ? 'Diese Version wurde vor Einführung des Engine-Snapshot-Freezes (Migration 0009) erstellt. Die unten gezeigte Engine-Ableitung wurde aus den AKTUELLEN Stammdaten rekonstruiert (Best-Effort) und kann von der ursprünglich angezeigten Ableitung abweichen.'
      : legacySchemaVersion === 1
        ? 'Diese Version wurde vor Einführung des Snapshot-Hashes (Schema v2, Migration 0010) erstellt. Inhalt ist eingefroren, aber Integrität nicht kryptografisch verifizierbar.'
        : 'Diese Version hat keinen kompatiblen Engine-Snapshot. Die Ableitung wird aus aktuellen Stammdaten reproduziert.';

    const [riskCatalog, measureCatalog, legalRefs] = await Promise.all([
      listRiskCatalog(),
      listMeasureCatalog(),
      listLegalRefs()
    ]);
    const tags = ((gbuData.activities as { tags?: ActivityTags } | undefined)?.tags
      ?? (gbu.activities?.tags as ActivityTags)
      ?? {}) as ActivityTags;
    const riskSlugs = ((gbuData.hazards as { risk_slugs?: string[] } | undefined)?.risk_slugs) ?? [];
    const ack = ((gbuData.measures as { measure_acknowledgements?: Record<string, { confirmed: boolean; note?: string }> } | undefined)?.measure_acknowledgements) ?? {};
    engineSnap = buildEngineSnapshot(tags, riskCatalog, measureCatalog, legalRefs, ack, riskSlugs);
  }

  // Integritäts-Verifikation: passt der gespeicherte Hash zum Inhalt?
  const integrity = isLegacy
    ? { ok: false, expected: '', actual: '', reason: 'no_hash' as const }
    : verifySnapshotIntegrity(engineSnap);

  /* ─── Anzeige-Daten ausschließlich aus engineSnap ───────────────── */
  const visibleRisks = engineSnap.derived_risks;
  const visibleMeasures = engineSnap.derived_measures;
  const missingControls = engineSnap.missing_controls;
  const ackMap = engineSnap.measure_acknowledgements;
  const refMap = engineSnap.legal_refs;
  const activitiesDescription = (gbuData.activities as { description?: string } | undefined)?.description;
  // Tags für Kontext-Erklärung in Kapitel 2 (explainWeighting). Live-Daten
  // sind hier OK, weil Activity-Tags Teil des unveränderlichen Inputs sind —
  // sie ändern sich nicht zwischen Release und Anzeige.
  const displayTags = ((gbuData.activities as { tags?: ActivityTags } | undefined)?.tags
    ?? (gbu.activities?.tags as ActivityTags)
    ?? {}) as ActivityTags;

  const isFree = quota?.plan_slug === 'free';
  const versionHash = `sha256:${version.id.replace(/-/g, '').slice(0, 12)}…`;
  const releasedDate = new Date(version.released_at).toLocaleDateString('de-DE');
  const reviewDateFormatted = reviewDate ? new Date(reviewDate).toLocaleDateString('de-DE') : '—';
  const usedRefs = Object.values(refMap);

  // Reproduzierbarkeits-Marker (kurz)
  const engineVersionDisplay = engineSnap.engine_version;
  const catalogHashShort = engineSnap.catalog_hash.slice(0, 12);
  const snapshotHashShort = engineSnap.snapshot_hash ? engineSnap.snapshot_hash.slice(0, 12) : '—';
  const engineMatchesCurrent = engineSnap.engine_version === ENGINE_VERSION;

  // Aktualitäts-Status für die nächste Wirksamkeitsprüfung
  type DueStatus = { kind: 'current' | 'soon' | 'overdue' | 'unknown'; days: number; label: string; detail: string };
  function computeDueStatus(): DueStatus {
    if (!reviewDate) return { kind: 'unknown', days: 0, label: 'Kein Termin gesetzt', detail: 'Bitte im Wizard nachtragen.' };
    const days = Math.ceil((new Date(reviewDate).getTime() - Date.now()) / 86_400_000);
    if (days < 0)  return { kind: 'overdue', days, label: `Überfällig seit ${-days} Tagen`, detail: `Vorgesehene Wirksamkeitsprüfung war am ${reviewDateFormatted}. Bitte zeitnah aktualisieren.` };
    if (days <= 30) return { kind: 'soon',    days, label: `Fällig in ${days} Tagen`,     detail: `Termin: ${reviewDateFormatted}. Aktualisierung sollte zeitnah eingeleitet werden.` };
    return                  { kind: 'current', days, label: `Aktuell (${days} Tage bis Prüfung)`, detail: `Nächste planmäßige Wirksamkeitsprüfung am ${reviewDateFormatted}.` };
  }
  const dueStatus = computeDueStatus();

  // Visuelle Severity-Label-Bestimmung
  function severityLabel(score: number): 'gering' | 'mittel' | 'hoch' {
    if (score >= 16) return 'hoch';
    if (score >= 9)  return 'mittel';
    return 'gering';
  }

  return (
    <main className="content">
      <div className="content-head">
        <div>
          <h1>{scope?.icon ?? '📋'} {gbu.title}</h1>
          <p>
            v{version.version_number} · freigegeben {releasedDate} ·{' '}
            <Link href={`/app/bundles/${bundle.id}`} style={{ color: 'var(--petrol)', fontWeight: 600 }}>
              ‹ Zurück zur Mappe
            </Link>
          </p>
        </div>
        <PrintButton />
      </div>

      {/* Geschäftsführer-Sicht: kurze, vertrauensvolle Status-Aussage.
          Hashes und technische Details liegen im Aufklapper darunter. */}
      <div className={`alert-banner ${integrity.ok ? 'is-success' : isLegacy ? '' : 'is-error'}`}>
        <span className="alert-banner-icon">
          {integrity.ok ? '✅' : isLegacy ? '⚠️' : '⛔'}
        </span>
        <div className="alert-banner-text">
          <strong>Version {version.version_number} · freigegeben am {releasedDate}.</strong>{' '}
          {integrity.ok ? (
            <>Dieses Dokument ist unveränderlich und revisionssicher.</>
          ) : isLegacy ? (
            <>Dieses Dokument ist eingefroren. Eine kryptografische Integritätsprüfung ist für diese Legacy-Version nicht möglich.</>
          ) : (
            <><strong>Integritätsprüfung fehlgeschlagen.</strong> Bitte Support kontaktieren — die Anzeige unten basiert auf dem gespeicherten Inhalt ohne verifizierten Hash.</>
          )}
        </div>
      </div>

      {/* Technische Prüfinformationen — ein einziger, dezenter Toggle.
         Forensik-Sprache („Hash-Mismatch", „Legacy", „verifiziert") landet
         ausschließlich in dieser Details-Sektion, nicht im Hauptfluss. */}
      <details className="audit-details">
        <summary className="audit-details-summary">
          Technische Prüfinformationen anzeigen
        </summary>
        <div className="audit-details-body">
          <div>
            <span className="audit-details-label">Versions-ID</span>
            <code>{versionHash}</code>
          </div>
          <div>
            <span className="audit-details-label">Snapshot-Kennung</span>
            <code>{engineSnap.snapshot_hash || '—'}</code>
            <span className={`audit-details-status audit-details-status-${integrity.ok ? 'ok' : isLegacy ? 'legacy' : 'mismatch'}`}>
              {integrity.ok ? '✓ unverändert' : isLegacy ? 'ältere Version' : '⚠ nicht eindeutig zuordenbar'}
            </span>
          </div>
          <div>
            <span className="audit-details-label">Katalog-Kennung</span>
            <code>{engineSnap.catalog_hash}</code>
          </div>
          <div>
            <span className="audit-details-label">Berechnungs-Version</span>
            <span>{engineVersionDisplay}{!engineMatchesCurrent ? <em style={{ color: 'var(--text-3)', marginLeft: 6 }}>(aktuell: {ENGINE_VERSION})</em> : null}</span>
          </div>
          <div>
            <span className="audit-details-label">Schema</span>
            <span>v{engineSnap.schema_version}</span>
          </div>
          {isLegacy && legacyNote ? (
            <div style={{ gridColumn: '1 / -1', marginTop: 8, padding: 10, background: 'var(--off, #f7f9fc)', borderRadius: 8, fontSize: 12, color: 'var(--text-2)' }}>
              <strong>Hinweis zu älteren Versionen:</strong> {legacyNote} Eine neue
              Freigabe würde den Stand fest einfrieren.
            </div>
          ) : null}
          {!integrity.ok && !isLegacy ? (
            <div style={{ gridColumn: '1 / -1', marginTop: 8, padding: 10, background: 'var(--red-bg)', borderRadius: 8, fontSize: 12, color: '#991b1b' }}>
              <strong>Hinweis:</strong> Der gespeicherte Inhalt lässt sich aktuell
              nicht eindeutig der Original-Berechnung zuordnen. Bitte den Support
              kontaktieren.
            </div>
          ) : null}
        </div>
      </details>

      {/* Plan-/Upgrade-UI entfernt aus dem Arbeitsfluss (R5):
         Pläne werden ausschließlich unter /app/account verwaltet.
         Die GBU-Version-Page bleibt fokussiert auf das Compliance-Dokument. */}

      <div className={`muster${isFree ? ' is-free-watermark' : ''}`}>
        {/* ─── Versteckte string-set-Quellen für @page Running-Header ── */}
        <span className="print-doc-title">Gefährdungsbeurteilung — {gbu.title}</span>
        <span className="print-doc-version">v{version.version_number} · {company.company_name ?? '—'}</span>
        <span className="print-doc-hash">Kennung {snapshotHashShort} · Berechnung {engineVersionDisplay}</span>

        {/* ─── PDF-Cover (nur Print) ─────────────────────────────────── */}
        <div className="print-cover">
          <div className="pc-brand">
            {/* Echtes Logo — direktes <img> für maximale Print-Kompatibilität */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/brand/mark.png" alt="" className="pc-brand-mark-img" />
            <div className="pc-brand-text">
              <div className="pc-brand-name">sicherheitsunterweisung24.de</div>
              <div className="pc-brand-tagline">Strukturierte Gefährdungsbeurteilung</div>
            </div>
          </div>

          <div className="pc-spacer" />

          <div className="pc-eyebrow">Gefährdungsbeurteilung · ArbSchG §5 / §6</div>
          <h1 className="pc-title">{gbu.title}</h1>
          <p className="pc-sub">
            {company.company_name ?? '—'}
            {company.industry ? ` · ${industryLabel(company.industry)}` : ''}
          </p>

          <div className="pc-meta-grid">
            <div>
              <span className="label">Mappe</span>
              <span className="value">{bundle.title}</span>
            </div>
            <div>
              <span className="label">Arbeitsbereich</span>
              <span className="value">{areaLabel}</span>
            </div>
            <div>
              <span className="label">Standort</span>
              <span className="value">
                {[company.postal_code, company.city].filter(Boolean).join(' ') || '—'}
                {company.state ? ` · ${company.state}` : ''}
              </span>
            </div>
            <div>
              <span className="label">Mitarbeitende</span>
              <span className="value">{company.employee_bucket ?? '—'}</span>
            </div>
            <div>
              <span className="label">Verantwortliche Rolle</span>
              <span className="value">{responsibleRole ?? '—'}</span>
            </div>
            <div>
              <span className="label">Vom Betrieb bestätigte BG</span>
              <span className="value">{bgNames.length > 0 ? bgNames.join(', ') : (bg.unclear ? 'noch zu klären' : '—')}</span>
            </div>
            <div>
              <span className="label">Version</span>
              <span className="value">v{version.version_number} · freigegeben am {releasedDate}</span>
            </div>
            <div>
              <span className="label">Nächste Wirksamkeitsprüfung</span>
              <span className="value">{reviewDateFormatted}</span>
            </div>
          </div>

          <div className="pc-foot">
            <strong>Reproduzierbares Compliance-Dokument.</strong>{' '}
            Diese Beurteilung wurde aus den vom Betrieb dokumentierten Tätigkeits-Angaben
            deterministisch gegen einen kuratierten DGUV-/BG-/ASR-Quellenkatalog
            erstellt und zur Freigabe-Zeit kryptografisch eingefroren. Sie ersetzt
            keine fachkundige Prüfung durch Arbeitgeber, verantwortliche Person
            oder Fachkraft für Arbeitssicherheit.
            <div className="pc-hash">
              {integrity.ok ? '✓ Inhalt unverändert' : isLegacy ? 'Stand vor Einführung der Integritäts-Kennung' : 'Inhalt nicht eindeutig zuordenbar — bitte Support kontaktieren'}
              {' · Berechnung '}{engineVersionDisplay}
              {' · Katalog '}{catalogHashShort}
              {' · Kennung '}{snapshotHashShort}
              {' · Druck '}{new Date().toLocaleDateString('de-DE')}
            </div>
          </div>
        </div>

        {/* ─── Inhaltsverzeichnis (nur Print, eigene Seite) ─────────── */}
        <div className="print-toc">
          <h2 className="print-toc-title">Inhaltsverzeichnis</h2>
          <ol className="print-toc-list">
            <li><span className="print-toc-num">Kapitel 1</span><span className="print-toc-label">Überblick</span><span className="print-toc-page" /></li>
            {activitiesDescription ? (
              <li><span className="print-toc-num">Kapitel 2</span><span className="print-toc-label">Tätigkeiten</span><span className="print-toc-page" /></li>
            ) : null}
            {visibleRisks.length > 0 ? (
              <li><span className="print-toc-num">Kapitel 3</span><span className="print-toc-label">Erkannte Gefährdungen</span><span className="print-toc-page" /></li>
            ) : null}
            {visibleMeasures.length > 0 ? (
              <li><span className="print-toc-num">Kapitel 4</span><span className="print-toc-label">Maßnahmenplan</span><span className="print-toc-page" /></li>
            ) : null}
            {visibleMeasures.some((m) => m.is_mandatory) ? (
              <li><span className="print-toc-num">Kapitel 5</span><span className="print-toc-label">Pflichtmaßnahmen — Übersicht</span><span className="print-toc-page" /></li>
            ) : null}
            {missingControls.length > 0 ? (
              <li><span className="print-toc-num">Kapitel 6</span><span className="print-toc-label">Offene Punkte</span><span className="print-toc-page" /></li>
            ) : null}
            <li><span className="print-toc-num">Kapitel 7</span><span className="print-toc-label">Verantwortlichkeiten</span><span className="print-toc-page" /></li>
            <li><span className="print-toc-num">Kapitel 8</span><span className="print-toc-label">Prüf- und Aktualisierungsintervalle</span><span className="print-toc-page" /></li>
            {usedRefs.length > 0 ? (
              <li><span className="print-toc-num">Kapitel 9</span><span className="print-toc-label">Quellen und Rechtsgrundlagen</span><span className="print-toc-page" /></li>
            ) : null}
            <li><span className="print-toc-num">Anhang A</span><span className="print-toc-label">Genehmigungsvermerk</span><span className="print-toc-page" /></li>
            <li><span className="print-toc-num">Anhang B</span><span className="print-toc-label">Reproduzierbarkeit und Audit</span><span className="print-toc-page" /></li>
          </ol>
        </div>

        {/* ─── Bildschirm-Header ────────────────────────────────────── */}
        <div className="muster-head">
          <div>
            <div className="muster-title">{gbu.title} — v{version.version_number}</div>
            <div className="muster-sub">
              {bundle.title} · {company.company_name ?? '—'}
              {isFree ? ' · Free-Plan (Wasserzeichen)' : ''}
            </div>
          </div>
          <span className="badge badge-green">Freigegeben</span>
        </div>

        <div className="muster-body">
          <div className="trust-banner">
            <div className="trust-shield">🛡️</div>
            <div className="trust-banner-body">
              <div className="trust-banner-title">Wie diese Beurteilung entstanden ist</div>
              <div className="trust-banner-text">
                Tätigkeitsbezogene GBU gem. ArbSchG §5 &amp; §6. Risiken sind aus
                den dokumentierten Tätigkeits-Angaben deterministisch abgeleitet,
                Maßnahmen aus geprüftem DGUV/BG/ASR-Quellenkatalog. Der
                Engine-Output wurde zur Release-Zeit eingefroren —
                Versions-Anzeige ist reproduzierbar.
                <span className="human-loop-note">Strukturierte Ableitung · fachliche Freigabe durch Verantwortliche</span>
              </div>
            </div>
          </div>

          <section className="pdf-section">
            <div className="pdf-section-num">Kapitel 1</div>
            <h3>Überblick</h3>

            {/* Identifikations-Block — Audit-Standard: alle Schlüssel-
                Felder auf einer Doppelseite. Doppelung zum Cover ist
                gewünscht, weil bei Heftung die Cover-Seite oft separat
                läuft. */}
            <div className="data-box">
              <div><strong>Beurteilungs-Kennung</strong> <span>v{version.version_number} · {snapshotHashShort}</span></div>
              <div><strong>Unternehmen</strong> <span>{company.company_name ?? '—'}</span></div>
              <div><strong>Branche</strong> <span>{industryLabel(company.industry)}</span></div>
              <div><strong>Standort</strong> <span>{[company.postal_code, company.city].filter(Boolean).join(' ') || '—'}{company.state ? ` · ${company.state}` : ''}</span></div>
              <div><strong>Mappe</strong> <span>{bundle.title}</span></div>
              <div><strong>Arbeitsbereich</strong> <span>{areaLabel}</span></div>
              <div><strong>Vom Betrieb bestätigte BG</strong> <span>{bgNames.length > 0 ? bgNames.join(', ') : (bg.unclear ? 'noch zu klären' : '—')}</span></div>
              <div><strong>Erstellt am (Freigabe)</strong> <span>{releasedDate}</span></div>
              <div><strong>Nächste Wirksamkeitsprüfung</strong> <span>{reviewDateFormatted} <em style={{ color: 'var(--text-3)', fontStyle: 'normal', fontWeight: 400 }}>· {dueStatus.label}</em></span></div>
              <div><strong>Verantwortlich für Umsetzung</strong> <span>{responsibleRole ?? '—'}</span></div>
            </div>

            {/* Kompakte Kennzahlen-Zeile für den Audit-Blick — alle Werte
                stammen aus dem eingefrorenen Engine-Snapshot. */}
            <div style={{
              marginTop: 10,
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gap: 8
            }}>
              <div style={{ padding: '8px 10px', background: '#fafbfc', border: '1px solid var(--border)', borderRadius: 8 }}>
                <div style={{ fontSize: 10, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700 }}>Gefährdungen</div>
                <div style={{ fontSize: 18, fontWeight: 700, color: '#0f172a' }}>{visibleRisks.length}</div>
              </div>
              <div style={{ padding: '8px 10px', background: '#fafbfc', border: '1px solid var(--border)', borderRadius: 8 }}>
                <div style={{ fontSize: 10, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700 }}>davon Pflicht</div>
                <div style={{ fontSize: 18, fontWeight: 700, color: '#0f172a' }}>{visibleRisks.filter((r) => r.is_mandatory).length}</div>
              </div>
              <div style={{ padding: '8px 10px', background: '#fafbfc', border: '1px solid var(--border)', borderRadius: 8 }}>
                <div style={{ fontSize: 10, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700 }}>Maßnahmen</div>
                <div style={{ fontSize: 18, fontWeight: 700, color: '#0f172a' }}>{visibleMeasures.length}</div>
              </div>
              <div style={{ padding: '8px 10px', background: '#fafbfc', border: '1px solid var(--border)', borderRadius: 8 }}>
                <div style={{ fontSize: 10, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700 }}>Pflicht-Maßnahmen</div>
                <div style={{ fontSize: 18, fontWeight: 700, color: '#0f172a' }}>{visibleMeasures.filter((m) => m.is_mandatory).length}</div>
              </div>
            </div>
          </section>

          {activitiesDescription ? (
            <section className="pdf-section">
              <div className="pdf-section-num">Kapitel 2</div>
              <h3>Tätigkeiten</h3>
              <p>{activitiesDescription}</p>
              {(() => {
                const w = explainWeighting(displayTags);
                return w ? (
                  <div style={{
                    marginTop: 6, padding: '6px 10px',
                    fontSize: 10.5, lineHeight: 1.55,
                    color: 'var(--text-2)',
                    borderLeft: '2px solid var(--petrol, #1B6CA8)',
                    background: '#fafbfc'
                  }}>
                    <strong style={{ color: '#0c3a5c' }}>Kontext berücksichtigt:</strong>{' '}
                    {w}
                  </div>
                ) : null;
              })()}
            </section>
          ) : null}

          {/* ─── Risiken — Audit-Tabelle: lfd. Nr, Sortierung nach Risiko ─── */}
          <div className="print-page-break" aria-hidden="true" />
          {visibleRisks.length > 0 ? (
            <section className="pdf-section">
              <div className="pdf-section-num">Kapitel 3</div>
              <h3>Erkannte Gefährdungen</h3>
              <p>
                {COPY.explainability.pdf.risksIntro} Sortierung absteigend nach
                Risiko-Bewertung. Pflicht-Gefährdungen erfordern Betriebs­anweisung,
                PSA-Bereitstellung und/oder Unterweisung gemäß den zugehörigen
                Quellen (siehe Spalte „Quellen" und Kapitel 9).
              </p>
              <div className="risk-table">
                <div className="risk-table-head" style={{ display: 'grid', gridTemplateColumns: '0.25fr 1.6fr 0.7fr 1.0fr 1.8fr' }}>
                  <span>Nr.</span>
                  <span>Gefährdung</span>
                  <span>Bewertung</span>
                  <span>Quellen</span>
                  <span>Begründung</span>
                </div>
                {[...visibleRisks]
                  .sort((a, b) => {
                    // Pflicht zuerst, dann nach Score absteigend
                    if (a.is_mandatory !== b.is_mandatory) return a.is_mandatory ? -1 : 1;
                    const scoreA = (engineSnap.severity_scores[a.risk.slug]?.score) ?? (a.severity * a.likelihood);
                    const scoreB = (engineSnap.severity_scores[b.risk.slug]?.score) ?? (b.severity * b.likelihood);
                    return scoreB - scoreA;
                  })
                  .map((d, idx) => {
                  const score = engineSnap.severity_scores[d.risk.slug] ?? {
                    severity: d.severity, likelihood: d.likelihood, score: d.severity * d.likelihood
                  };
                  const sevLabel = severityLabel(score.score);
                  const sevQual = qualitativeSeverity(score.severity);
                  const likQual = qualitativeLikelihood(score.likelihood);
                  const riskRefs = (d.risk.source_ref_slugs ?? [])
                    .map((s) => refMap[s])
                    .filter(Boolean)
                    .slice(0, 4);
                  return (
                    <div className="risk-table-row" key={d.risk.slug} style={{ display: 'grid', gridTemplateColumns: '0.25fr 1.6fr 0.7fr 1.0fr 1.8fr' }}>
                      <div style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-3)', fontWeight: 600 }}>
                        {String(idx + 1).padStart(2, '0')}
                      </div>
                      <div className={d.is_mandatory ? 'pdf-mandatory-mark' : ''}>
                        <strong>{d.risk.name}</strong>
                        {d.is_mandatory ? (
                          <span className="conf-badge conf-low" style={{ marginLeft: 6 }}>Pflicht</span>
                        ) : null}
                      </div>
                      <div>
                        <span className={`severity-pill sev-${sevLabel}`}>
                          <span className="severity-pill-dot" />
                          Risiko {sevLabel}
                        </span>
                        <div style={{ fontSize: 10.5, color: 'var(--text-3)', marginTop: 4 }}>
                          Schwere: {sevQual} · Eintritt: {likQual}
                        </div>
                      </div>
                      <div style={{ fontSize: 10.5 }}>
                        {riskRefs.length === 0 ? (
                          <span style={{ color: 'var(--text-3)' }}>—</span>
                        ) : (
                          riskRefs.map((r) => (
                            <div key={r!.slug} style={{ marginBottom: 2 }}>
                              <span className="src-chip" title={r!.title}>{r!.citation}</span>
                            </div>
                          ))
                        )}
                      </div>
                      <div style={{ fontSize: 11.5, lineHeight: 1.5 }}>
                        {explainRiskTriggers(d)}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          ) : null}

          {/* ─── Maßnahmen — Handlungsleitfaden nach UI-Priority-Gruppen ─ */}
          <div className="print-page-break" aria-hidden="true" />
          {visibleMeasures.length > 0 ? (
            <section className="pdf-section">
              <div className="pdf-section-num">Kapitel 4</div>
              <h3>Maßnahmenplan</h3>
              <p>
                {COPY.explainability.pdf.measuresIntro}
              </p>
              <div style={{
                marginTop: 8, marginBottom: 12,
                padding: '8px 12px',
                background: '#fafbfc',
                border: '1px solid var(--border)',
                borderRadius: 6,
                fontSize: 10.5, lineHeight: 1.55, color: 'var(--text-2)'
              }}>
                <strong style={{ color: '#0c3a5c' }}>STOP-Prinzip (ArbSchG §4):</strong>{' '}
                Maßnahmen sind nach Wirksamkeits-Hierarchie zu wählen —{' '}
                <strong>S</strong>ubstitution vor{' '}
                <strong>T</strong>echnischen vor{' '}
                <strong>O</strong>rganisatorischen vor{' '}
                <strong>P</strong>ersonenbezogenen Maßnahmen. Substitution
                ist in den hier kuratierten Maßnahmen ggf. Bestandteil
                technischer Maßnahmen (Spalte „STOP").
              </div>
              {(() => {
                const grouped = sortMeasuresForUi(visibleMeasures);
                const riskNamesBySlug: Record<string, string> = Object.fromEntries(
                  visibleRisks.map((r) => [r.risk.slug, r.risk.name])
                );
                // Empfohlene Frist pro UI-Gruppe — als Konvention im Render,
                // nicht im Snapshot/Schema (kein Datenmodell-Wechsel).
                const GROUP_FRIST: Record<typeof UI_GROUP_ORDER[number], string> = {
                  jetzt_wichtig:          'innerhalb 14 Tagen prüfen',
                  als_naechstes_sinnvoll: 'innerhalb 3 Monaten',
                  spaeter_optimierbar:    'innerhalb 12 Monaten / nächste turnusmäßige Aktualisierung'
                };
                // Laufende Nummer über alle Gruppen hinweg (Audit-konform).
                let runningNr = 0;
                return UI_GROUP_ORDER.map((g) => {
                  const list = grouped[g];
                  if (list.length === 0) return null;
                  return (
                    <div key={g} style={{ marginBottom: 16 }}>
                      <div style={{
                        marginTop: 10, marginBottom: 6,
                        padding: '8px 10px',
                        background: '#f4f8fb',
                        borderLeft: '3px solid #0c3a5c',
                        borderRadius: '0 6px 6px 0'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
                          <span style={{ fontSize: 13, fontWeight: 750, color: '#0c3a5c' }}>
                            {UI_GROUP_LABELS[g]}
                          </span>
                          <span style={{
                            fontSize: 10.5, fontWeight: 600, color: 'var(--text-3)',
                            padding: '1px 7px', background: '#fff',
                            border: '1px solid var(--border, #d6e4f0)', borderRadius: 100
                          }}>
                            {list.length} Maßnahmen
                          </span>
                        </div>
                        <div style={{ marginTop: 4, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, fontSize: 10.5 }}>
                          <div>
                            <span style={{ color: 'var(--text-3)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', fontSize: 9.5 }}>Empfohlene Frist:</span>{' '}
                            <span style={{ color: 'var(--text-1)', fontWeight: 600 }}>{GROUP_FRIST[g]}</span>
                          </div>
                          <div>
                            <span style={{ color: 'var(--text-3)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', fontSize: 9.5 }}>Verantwortlich:</span>{' '}
                            <span style={{ color: 'var(--text-1)', fontWeight: 600 }}>{responsibleRole ?? '—'}</span>
                          </div>
                        </div>
                        <div style={{ marginTop: 4, fontSize: 10, color: 'var(--text-3)', lineHeight: 1.5, fontStyle: 'italic' }}>
                          {COPY.explainability.groupContext[g]}
                        </div>
                      </div>
                      <div className="risk-table">
                        <div className="risk-table-head" style={{ display: 'grid', gridTemplateColumns: '0.25fr 2.4fr 0.35fr 0.5fr 1.1fr' }}>
                          <span>Nr.</span>
                          <span>Maßnahme</span>
                          <span>STOP</span>
                          <span>Status</span>
                          <span>Quellen</span>
                        </div>
                        {list.map((m) => {
                          runningNr += 1;
                          const cat = m.measure.category;
                          const top = cat === 'technisch' ? 'T' : cat === 'organisatorisch' ? 'O' : 'P';
                          const confirmed = ackMap[m.measure.slug]?.confirmed ?? false;
                          const mandatoryReason = engineSnap.mandatory_reasons[m.measure.slug] ?? m.mandatory_reason;
                          const obligation = m.obligation_type ?? (m.is_mandatory ? 'pflicht' : 'empfehlung');
                          const obligationLabel = OBLIGATION_UI_LABELS[obligation];
                          const obligationCls = obligation === 'pflicht' ? 'conf-low'
                            : obligation === 'angebot' ? 'conf-medium' : 'conf-high';
                          return (
                            <div className="risk-table-row" key={m.measure.slug} style={{ display: 'grid', gridTemplateColumns: '0.25fr 2.4fr 0.35fr 0.5fr 1.1fr' }}>
                              <div style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-3)', fontWeight: 600 }}>
                                {String(runningNr).padStart(2, '0')}
                              </div>
                              <div className={m.is_mandatory ? 'pdf-mandatory-mark' : ''}>
                                <strong>{m.measure.short_text}</strong>
                                <span className={`conf-badge ${obligationCls}`} style={{ marginLeft: 6 }}>
                                  {obligationLabel}
                                </span>
                                <div style={{ fontSize: 11, color: 'var(--text-2)', marginTop: 3, lineHeight: 1.5 }}>
                                  {m.measure.long_text}
                                </div>
                                {(() => {
                                  const why = explainMeasureBasis(m, riskNamesBySlug);
                                  return why ? (
                                    <div style={{
                                      fontSize: 10.5, color: 'var(--text-2)', marginTop: 4,
                                      padding: '4px 8px',
                                      background: 'var(--off, #f7f9fc)',
                                      borderLeft: '2px solid var(--petrol, #1B6CA8)',
                                      borderRadius: 4, lineHeight: 1.5
                                    }}>
                                      <strong style={{ color: 'var(--petrol, #0c3a5c)' }}>Warum:</strong> {why}
                                    </div>
                                  ) : null;
                                })()}
                                {mandatoryReason && !m.is_mandatory ? (
                                  <div style={{ fontSize: 10.5, color: '#475569', marginTop: 4 }}>
                                    <strong style={{ color: '#0c3a5c' }}>Grundlage:</strong> {mandatoryReason}
                                  </div>
                                ) : null}
                              </div>
                              <div style={{ fontSize: 11 }}>
                                <span className="conf-badge">{top}</span>
                              </div>
                              <div style={{ fontSize: 11 }}>
                                <span className={`conf-badge ${confirmed ? 'conf-high' : 'conf-low'}`}>
                                  {confirmed ? '✓ umgesetzt' : 'offen'}
                                </span>
                              </div>
                              <div>
                                {m.measure.source_ref_slugs.slice(0, 3).map((s) => {
                                  const ref = refMap[s];
                                  return ref ? (
                                    <div key={s} style={{ marginBottom: 2 }}>
                                      <span className="src-chip" title={ref.title}>{ref.citation}</span>
                                    </div>
                                  ) : null;
                                })}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                });
              })()}
            </section>
          ) : null}

          {/* ─── Pflichtmaßnahmen — Audit-Tabelle mit lfd. Nr ──────── */}
          {visibleMeasures.some((m) => m.is_mandatory) ? (
            <section className="pdf-section">
              <div className="pdf-section-num">Kapitel 5</div>
              <h3>Pflichtmaßnahmen — Audit-Übersicht</h3>
              <p>
                Diese Maßnahmen ergeben sich direkt aus geltenden Vorschriften
                (ArbSchG, DGUV, BetrSichV, GefStoffV — siehe Spalte
                „Grundlage"). Vollständige Beschreibung mit Frist und
                Verantwortlich siehe Kapitel 4.
              </p>
              <div className="risk-table">
                <div className="risk-table-head" style={{ display: 'grid', gridTemplateColumns: '0.25fr 1.8fr 1.8fr 0.5fr' }}>
                  <span>Nr.</span>
                  <span>Pflicht-Maßnahme</span>
                  <span>Rechtsgrundlage</span>
                  <span>Status</span>
                </div>
                {visibleMeasures.filter((m) => m.is_mandatory).map((m, idx) => {
                  const confirmed = ackMap[m.measure.slug]?.confirmed ?? false;
                  const reason = engineSnap.mandatory_reasons[m.measure.slug] ?? m.mandatory_reason;
                  return (
                    <div className="risk-table-row" key={`mand-${m.measure.slug}`} style={{ display: 'grid', gridTemplateColumns: '0.25fr 1.8fr 1.8fr 0.5fr' }}>
                      <div style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-3)', fontWeight: 600 }}>
                        {String(idx + 1).padStart(2, '0')}
                      </div>
                      <div className="pdf-mandatory-mark"><strong>{m.measure.short_text}</strong></div>
                      <div style={{ fontSize: 11.5 }}>{reason ?? 'Pflicht-Maßnahme.'}</div>
                      <div>
                        <span className={`conf-badge ${confirmed ? 'conf-high' : 'conf-low'}`}>
                          {confirmed ? '✓ umgesetzt' : 'noch offen'}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          ) : null}

          {/* ─── Noch zu klären (sachlich, nicht panisch) ──────────── */}
          {missingControls.length > 0 ? (
            <section className="pdf-section pdf-missing-section">
              <div className="pdf-section-num">Kapitel 6</div>
              <h3>Noch zu klären</h3>
              <p>
                {COPY.explainability.pdf.openIssuesIntro} Eine fachkundige Prüfung
                wird empfohlen.
              </p>
              <div className="risk-table">
                <div className="risk-table-head" style={{ display: 'grid', gridTemplateColumns: '1.5fr 0.8fr 1.7fr' }}>
                  <span>Punkt</span>
                  <span>Rechtsgrundlage</span>
                  <span>Empfohlenes Vorgehen</span>
                </div>
                {missingControls.map((mc) => (
                  <div className="risk-table-row" key={mc.code} style={{ display: 'grid', gridTemplateColumns: '1.5fr 0.8fr 1.7fr' }}>
                    <div><strong>{mc.message}</strong></div>
                    <div style={{ fontSize: 11 }}>
                      <span className="src-chip">{mc.legal_basis}</span>
                    </div>
                    <div style={{ fontSize: 11.5 }}>{mc.suggested_action}</div>
                  </div>
                ))}
              </div>
            </section>
          ) : null}

          {/* ─── Verantwortlichkeiten ─────────────────────────────── */}
          <div className="print-page-break" aria-hidden="true" />
          <section className="pdf-section">
            <div className="pdf-section-num">Kapitel 7</div>
            <h3>Verantwortlichkeiten</h3>
            <p>
              ArbSchG §6 verlangt die schriftliche Dokumentation der
              Verantwortlichkeit. Personennamen werden bewusst nicht erfasst,
              sondern eine Rolle. Pflichtenübertragung im Sinne von ArbSchG §13
              bleibt davon unberührt — die letzte Verantwortung trägt der
              Arbeitgeber.
            </p>
            <div className="data-box">
              <div><strong>Verantwortlich für Umsetzung der Maßnahmen</strong> <span>{responsibleRole ?? '—'}</span></div>
              <div><strong>Erstellt / freigegeben am</strong> <span>{releasedDate}</span></div>
              <div><strong>Pflicht-Disclaimer bestätigt</strong> <span>ja · siehe Anhang A · Cell 3</span></div>
              <div><strong>Nächste Wirksamkeitsprüfung</strong> <span>{reviewDateFormatted} · {dueStatus.label}</span></div>
              <div><strong>Aktualisierungs-Intervall</strong> <span>{intervalLabel(reviewInterval)}</span></div>
            </div>
            <div style={{
              marginTop: 8, padding: '8px 10px',
              fontSize: 10.5, color: 'var(--text-3)',
              borderLeft: '2px solid var(--border)',
              lineHeight: 1.55
            }}>
              <strong style={{ color: 'var(--text-2)' }}>Hinweis zur fachlichen Prüfung:</strong>{' '}
              Die fachliche Prüfung durch eine Fachkraft für Arbeitssicherheit
              (DGUV V2) und/oder den/die Sicherheitsbeauftragte:n ist im
              Anhang A · Cell 2 zu dokumentieren.
            </div>
          </section>

          {/* ─── Prüf- & Aktualisierungsintervalle ────────────────── */}
          <section className="pdf-section">
            <div className="pdf-section-num">Kapitel 8</div>
            <h3>Prüf- und Aktualisierungsintervalle</h3>
            <p>
              Die Aktualität der Gefährdungsbeurteilung wird sowohl durch ein
              regelmäßiges Intervall als auch durch konkrete Anlässe sichergestellt
              (ArbSchG §3, §6).
            </p>

            <div className={`print-status-banner status-${dueStatus.kind}`}>
              <div style={{ flex: 1 }}>
                <div className="print-status-banner-label">Aktualitätsstatus</div>
                <div className="print-status-banner-value">{dueStatus.label}</div>
                <div className="print-status-banner-detail">{dueStatus.detail}</div>
              </div>
            </div>

            <div className="data-box">
              <div><strong>Nächste Wirksamkeitsprüfung</strong> <span>{reviewDateFormatted}</span></div>
              <div><strong>Standard-Intervall</strong> <span>{intervalLabel(reviewInterval)}</span></div>
              <div>
                <strong>Außerplanmäßige Anlässe</strong>
                <span>
                  {reviewTriggers.length === 0
                    ? <em style={{ color: 'var(--text-3)' }}>keine festgelegt</em>
                    : reviewTriggers.map((t) => TRIGGER_LABELS[t] ?? t).join(' · ')}
                </span>
              </div>
            </div>
          </section>

          {usedRefs.length > 0 && (
            <section className="pdf-section">
              <div className="pdf-section-num">Kapitel 9</div>
              <h3>Quellen &amp; Rechtsgrundlagen</h3>
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
                  Kuratierter Quellenkatalog — zur Freigabe-Zeit eingefroren.
                  Fachredaktion vor produktiver Nutzung empfohlen.
                </div>
              </div>
            </section>
          )}

          {/* ─── Anhang A: Genehmigungsvermerk ────────────────────── */}
          <div className="print-page-break" aria-hidden="true" />
          <section className="pdf-section">
            <div className="pdf-section-num">Anhang A</div>
            <h3>Genehmigungsvermerk</h3>
            <p>
              Diese Gefährdungsbeurteilung wurde digital erstellt und durch die
              Bestätigung des Pflicht-Disclaimers zur betrieblichen Nutzung
              freigegeben. Die folgende dreiteilige Signatur dient bei externer
              Vorlage (Auditor:in, Sicherheitsbeauftragte:r, Aufsichtsbehörde,
              Berufsgenossenschaft) als handschriftlicher Bestätigungsraum.
              Die digitale Freigabe ist durch die Snapshot-Kennung am
              Dokumentende kryptografisch verifizierbar.
            </p>
            <div className="print-approval">
              <div className="print-approval-title">Bestätigung der Wirksamkeit · ArbSchG §6 / DGUV V1 §3</div>
              <div className="print-approval-grid">
                <div className="print-approval-cell">
                  <div style={{ fontSize: 9, fontWeight: 700, color: '#0c3a5c', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>
                    1 · Verantwortlich für Umsetzung
                  </div>
                  <div style={{ fontSize: 10.5, color: 'var(--text-1)', fontWeight: 600, marginBottom: 14 }}>
                    {responsibleRole ?? '—'}
                  </div>
                  <div style={{ fontSize: 9, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.04em', borderTop: '1px solid #94a3b8', paddingTop: 3, marginBottom: 16 }}>
                    Name (in Druckbuchstaben)
                  </div>
                  <div style={{ fontSize: 9, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.04em', borderTop: '1px solid #94a3b8', paddingTop: 3 }}>
                    Datum · Unterschrift
                  </div>
                </div>

                <div className="print-approval-cell">
                  <div style={{ fontSize: 9, fontWeight: 700, color: '#0c3a5c', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>
                    2 · Fachlich geprüft durch
                  </div>
                  <div style={{ fontSize: 10.5, color: 'var(--text-3)', fontStyle: 'italic', marginBottom: 14 }}>
                    z. B. Fachkraft für Arbeitssicherheit, SiBe
                  </div>
                  <div style={{ fontSize: 9, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.04em', borderTop: '1px solid #94a3b8', paddingTop: 3, marginBottom: 16 }}>
                    Name · Funktion
                  </div>
                  <div style={{ fontSize: 9, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.04em', borderTop: '1px solid #94a3b8', paddingTop: 3 }}>
                    Datum · Unterschrift
                  </div>
                </div>

                <div className="print-approval-cell">
                  <div style={{ fontSize: 9, fontWeight: 700, color: '#0c3a5c', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>
                    3 · Freigegeben durch Arbeitgeber
                  </div>
                  <div style={{ fontSize: 10.5, color: 'var(--text-3)', fontStyle: 'italic', marginBottom: 14 }}>
                    digital bestätigt am {releasedDate}
                  </div>
                  <div style={{ fontSize: 9, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.04em', borderTop: '1px solid #94a3b8', paddingTop: 3, marginBottom: 16 }}>
                    Name · Funktion
                  </div>
                  <div style={{ fontSize: 9, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.04em', borderTop: '1px solid #94a3b8', paddingTop: 3 }}>
                    Datum · Unterschrift
                  </div>
                </div>
              </div>
              <div className="print-approval-foot">
                Digitale Freigabe bestätigt am {releasedDate}. Diese Version ist
                unveränderlich eingefroren und trägt die Kennung{' '}
                <code>{snapshotHashShort}</code>{' '}
                ({integrity.ok ? 'Inhalt unverändert' : isLegacy ? 'Stand vor Einführung der Kennung' : 'Inhalt nicht eindeutig zuordenbar — bitte Support kontaktieren'}).
                Eine inhaltliche Nachänderung wäre an der Kennung erkennbar.
              </div>
            </div>
          </section>

          {/* ─── Anhang B: Technische Prüfinformationen ───────────── */}
          <section className="pdf-section">
            <div className="pdf-section-num">Anhang B</div>
            <h3>Technische Prüfinformationen</h3>
            <p>
              Diese Beurteilung ist nachvollziehbar reproduzierbar. Bei identischer
              Eingabe und identischem Katalogstand erzeugt die Berechnung dieselbe
              Snapshot-Kennung. Eine nachträgliche inhaltliche Veränderung wäre an
              dieser Stelle erkennbar — der Vergleich ist auf Wunsch der prüfenden
              Stelle möglich.
            </p>
            <div className="data-box">
              <div><strong>Versions-ID</strong> <span><code>{versionHash}</code></span></div>
              <div><strong>Snapshot-Kennung (SHA-256)</strong> <span><code>{snapshotHashShort}</code> · {integrity.ok ? 'Inhalt unverändert' : isLegacy ? 'Stand vor Einführung der Kennung' : 'nicht eindeutig zuordenbar'}</span></div>
              <div><strong>Katalog-Kennung</strong> <span><code>{catalogHashShort}</code></span></div>
              <div><strong>Berechnungs-Version</strong> <span>{engineVersionDisplay}</span></div>
              <div><strong>Schema-Version</strong> <span>v{engineSnap.schema_version}</span></div>
            </div>
          </section>

          <div className="print-note">
            <strong>Hinweis.</strong> Diese Gefährdungsbeurteilung ist ein
            kuratierter, kryptografisch eingefrorener Entwurf auf Basis der vom
            Betrieb dokumentierten Tätigkeits-Angaben. Sie ersetzt nicht die
            fachkundige Prüfung durch Arbeitgeber, verantwortliche Person oder
            Fachkraft für Arbeitssicherheit gemäß DGUV V2.
          </div>
        </div>

        <div className="print-footer print-only">
          sicherheitsunterweisung24.de · GBU {gbu.title} · v{version.version_number} · Snapshot {snapshotHashShort}
        </div>
      </div>
    </main>
  );
}
