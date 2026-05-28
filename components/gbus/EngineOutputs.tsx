/**
 * Server-Komponenten für die Anzeige der Engine-Ergebnisse mit Herleitung.
 * Bewusst kein Client-State — alles aus DerivationResult derived.
 *
 * Phase-3-/4-Doktrin: Die UI gruppiert nach UI-Priority (Jetzt wichtig /
 * Als Nächstes sinnvoll / Später optimierbar). Die technischen Engine-
 * Felder (urgency, priority) erscheinen NICHT im Klartext — der GF sieht
 * eine ruhige, priorisierte Liste statt einer Risiko-Matrix.
 *
 * Phase-„Explainable Compliance UX": Jede Karte/Zeile zeigt zusätzlich
 * einen erklärenden Satz, der die Engine-Begründung in Alltagssprache
 * übersetzt. Score-Zahlen (n/5, n/25) werden NICHT mehr angezeigt —
 * nur die qualitativen Labels (gering / mittel / hoch).
 */
import type {
  DerivationResult,
  DerivedRisk,
  DerivedMeasure,
  MissingControl,
  PlausibilityWarning
} from '@/lib/wizard/engine';
import type { RaLegalRef } from '@/lib/db/types';
import {
  UI_GROUP_LABELS,
  UI_GROUP_DESCRIPTIONS,
  UI_GROUP_ORDER,
  sortMeasuresForUi,
  buildUiMeasureSummary,
  type UiGroup
} from '@/lib/wizard/ui-priority';
import {
  explainRiskTriggers,
  explainMeasureBasis,
  qualitativeSeverity,
  qualitativeLikelihood
} from '@/lib/wizard/explain';
import { COPY, OBLIGATION_UI_LABELS } from '@/lib/copy/microcopy';

/* ─── Risiko-Karte ─────────────────────────────────────────────────────
 * Zeigt:
 *   1. Risiko-Name + Pflicht-Badge + qualitatives „Risiko hoch/mittel/gering"
 *   2. Erklärender Satz („Erkannt aufgrund Ihrer Angaben zu …")
 *   3. Qualitative Schwere/Eintritt — KEINE Zahlen
 *   4. Optional: <details> mit den auslösenden Tags (für Audit-Bedarf)
 */
export function RiskCard({ d }: { d: DerivedRisk }) {
  const score = d.severity * d.likelihood;
  const scoreLabel = score >= 16 ? 'hoch' : score >= 9 ? 'mittel' : 'gering';
  const scoreCls = score >= 16 ? 'conf-low' : score >= 9 ? 'conf-medium' : 'conf-high';
  const sev = qualitativeSeverity(d.severity);
  const lik = qualitativeLikelihood(d.likelihood);

  return (
    <div className="area-card" style={{ cursor: 'default' }}>
      <div className="area-top">
        <div className="area-ico" aria-hidden="true">●</div>
        <div style={{ display: 'flex', gap: 6 }}>
          {d.is_mandatory ? <span className="conf-badge conf-low">Pflicht</span> : null}
          <span className={`conf-badge ${scoreCls}`}>Risiko {scoreLabel}</span>
        </div>
      </div>
      <div className="area-title">{d.risk.name}</div>

      <div className="area-text" style={{ marginTop: 8, lineHeight: 1.55 }}>
        {explainRiskTriggers(d)}
      </div>

      <div style={{ marginTop: 8, fontSize: 11.5, color: 'var(--text-3)' }}>
        Schwere: {sev} · Eintritt: {lik}
      </div>

      {d.triggers.length > 0 && (
        <details style={{ marginTop: 8 }}>
          <summary style={{
            fontSize: 11, color: 'var(--text-3)', cursor: 'pointer',
            listStyle: 'revert'
          }}>
            Auslösende Angaben anzeigen
          </summary>
          <ul style={{ paddingLeft: 16, margin: '6px 0 0', listStyle: 'none' }}>
            {d.triggers.map((t, i) => (
              <li key={i} style={{ fontSize: 11.5, color: 'var(--text-3)' }}>
                ▸ {t.label}
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}

/* ─── „Hier besteht Prüfbedarf" — ruhiger als „🚨 Pflicht-Lücken" ─── */
export function MissingControlsPanel({ items }: { items: MissingControl[] }) {
  if (items.length === 0) return null;
  return (
    <div className="alert-banner" style={{ marginBottom: 16, borderLeft: '3px solid var(--amber, #d97706)' }}>
      <span className="alert-banner-icon" aria-hidden="true">📋</span>
      <div className="alert-banner-text" style={{ flex: 1 }}>
        <strong>{COPY.panels.missingControls.title} ({items.length}):</strong>
        <div style={{ fontSize: 12.5, color: 'var(--text-2)', margin: '4px 0 8px', lineHeight: 1.5 }}>
          {COPY.panels.missingControls.intro}
        </div>
        <ul style={{ paddingLeft: 18, margin: 0 }}>
          {items.map((m) => (
            <li key={m.code} style={{ marginBottom: 4 }}>
              <strong>{m.message}</strong>{' '}
              <span style={{ fontSize: 12, color: 'var(--text-3)' }}>({m.legal_basis})</span>
              <br />
              <span style={{ fontSize: 12.5 }}>↳ {m.suggested_action}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

/* ─── Plausibilität — als sanfter Hinweis, nicht als Warnung ────────── */
export function PlausibilityPanel({ items }: { items: PlausibilityWarning[] }) {
  if (items.length === 0) return null;
  return (
    <div className="alert-banner" style={{ marginBottom: 16 }}>
      <span className="alert-banner-icon" aria-hidden="true">💡</span>
      <div className="alert-banner-text">
        <strong>{COPY.panels.plausibility.title}:</strong>
        <div style={{ fontSize: 12.5, color: 'var(--text-2)', margin: '4px 0 6px', lineHeight: 1.5 }}>
          {COPY.panels.plausibility.intro}
        </div>
        <ul style={{ paddingLeft: 18, margin: 0 }}>
          {items.map((w) => <li key={w.code}>{w.message}</li>)}
        </ul>
      </div>
    </div>
  );
}

/* ─── Maßnahmen-Zeile mit „Warum erscheint das?"-Erklärung ────────── */
export function MeasureRow({
  d, refMap, acknowledged, riskNamesBySlug
}: {
  d: DerivedMeasure;
  refMap: Map<string, RaLegalRef>;
  acknowledged: boolean;
  riskNamesBySlug?: Record<string, string>;
}) {
  const refs = d.measure.source_ref_slugs.map((s) => refMap.get(s)).filter(Boolean) as RaLegalRef[];
  const topLabel = d.measure.category === 'technisch' ? 'T'
    : d.measure.category === 'organisatorisch' ? 'O' : 'P';
  const obligation = d.obligation_type ?? (d.is_mandatory ? 'pflicht' : 'empfehlung');
  const obligationLabel = OBLIGATION_UI_LABELS[obligation];
  const obligationCls = obligation === 'pflicht' ? 'conf-low'
    : obligation === 'angebot' ? 'conf-medium' : 'conf-high';
  const why = explainMeasureBasis(d, riskNamesBySlug);

  return (
    <div className="preview-row" key={d.measure.slug}>
      <div>
        <div className="preview-name">
          {d.measure.short_text}
          <span className={`conf-badge ${obligationCls}`} style={{ marginLeft: 8 }}>
            {obligationLabel}
          </span>
        </div>
        <div style={{ fontSize: 12.5, color: 'var(--text-2)', marginTop: 4 }}>
          {d.measure.long_text}
        </div>
        {why && (
          <div style={{
            marginTop: 6, padding: '6px 10px',
            background: 'var(--off, #f7f9fc)',
            border: '1px solid var(--border, #d6e4f0)',
            borderRadius: 6,
            fontSize: 11.5,
            color: 'var(--text-2)',
            lineHeight: 1.55
          }}>
            <span style={{
              display: 'inline-block', marginRight: 4,
              fontSize: 10, fontWeight: 700, color: 'var(--petrol, #1B6CA8)',
              textTransform: 'uppercase', letterSpacing: '0.05em'
            }}>
              Warum?
            </span>
            {why}
          </div>
        )}
        <div className="src-chip-row">
          <span className="src-label">Belege:</span>
          {refs.map((r) => (
            <span key={r.slug} className="src-chip" title={r.title}>{r.citation}</span>
          ))}
        </div>
      </div>
      <div>
        <span className={`conf-badge ${d.measure.category === 'technisch' ? 'conf-high' : d.measure.category === 'organisatorisch' ? 'conf-medium' : 'conf-low'}`}>
          {topLabel}
        </span>
      </div>
      <div>
        <label style={{ display: 'flex', gap: 6, alignItems: 'center', fontSize: 13 }}>
          <input type="checkbox" name={`measure_${d.measure.slug}`} defaultChecked={acknowledged} /> umgesetzt
        </label>
      </div>
    </div>
  );
}

/* ─── Summary oben in der Maßnahmen-Sektion — ruhige Sätze ──────────── */
export function UiMeasureSummaryBlock({ measures }: { measures: DerivedMeasure[] }) {
  const summary = buildUiMeasureSummary(measures);
  return (
    <div style={{
      marginBottom: 16,
      padding: '12px 14px',
      borderRadius: 10,
      background: 'var(--off, #f7f9fc)',
      border: '1px solid var(--border, #d6e4f0)'
    }}>
      <div style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--petrol, #1B6CA8)',
        letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: 6 }}>
        Überblick
      </div>
      <ul style={{ margin: 0, padding: 0, listStyle: 'none', fontSize: 13.5,
        color: 'var(--text-2)', lineHeight: 1.7 }}>
        {summary.sentences.map((s) => (
          <li key={s}>• {s}</li>
        ))}
      </ul>
    </div>
  );
}

/* ─── Gruppen-Header — jetzt mit zwei-stufiger Erklärung ───────────── */
export function PriorityGroupHeader({
  group, count
}: { group: UiGroup; count: number }) {
  const colorByGroup: Record<UiGroup, string> = {
    jetzt_wichtig:          'var(--petrol, #1B6CA8)',
    als_naechstes_sinnvoll: 'var(--text-2, #2C3E50)',
    spaeter_optimierbar:    'var(--text-3, #5D6D7E)'
  };
  return (
    <div style={{ margin: '20px 0 10px' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 4 }}>
        <span style={{
          fontSize: 14.5, fontWeight: 750, color: colorByGroup[group],
          letterSpacing: '-0.005em'
        }}>
          {UI_GROUP_LABELS[group]}
        </span>
        <span style={{
          fontSize: 11.5, fontWeight: 600, color: 'var(--text-3)',
          padding: '1px 8px', background: 'var(--off, #f7f9fc)',
          border: '1px solid var(--border, #d6e4f0)', borderRadius: 100
        }}>
          {count}
        </span>
      </div>
      <div style={{ fontSize: 12, color: 'var(--text-3)', lineHeight: 1.55 }}>
        {UI_GROUP_DESCRIPTIONS[group]}
      </div>
      <div style={{
        fontSize: 11.5, color: 'var(--text-3)', lineHeight: 1.55,
        marginTop: 4, fontStyle: 'italic'
      }}>
        {COPY.explainability.groupContext[group]}
      </div>
    </div>
  );
}

/* ─── Komplette Sektion mit Gruppen + leere-Gruppen-Verstecken ──────── */
export function PriorityGroupedMeasures({
  measures, refMap, ack, riskNamesBySlug
}: {
  measures: DerivedMeasure[];
  refMap: Map<string, RaLegalRef>;
  ack: Record<string, { confirmed: boolean }>;
  riskNamesBySlug?: Record<string, string>;
}) {
  const groups = sortMeasuresForUi(measures);
  return (
    <>
      {UI_GROUP_ORDER.map((g) => {
        const list = groups[g];
        if (list.length === 0) return null;
        return (
          <div key={g} style={{ marginBottom: 18 }}>
            <PriorityGroupHeader group={g} count={list.length} />
            <div className="preview-table" style={{ marginTop: 6 }}>
              <div className="preview-head">
                <span>Maßnahme</span>
                <span>TOP</span>
                <span>Bestätigt</span>
              </div>
              {list.map((d) => (
                <MeasureRow
                  key={d.measure.slug}
                  d={d}
                  refMap={refMap}
                  acknowledged={ack[d.measure.slug]?.confirmed ?? false}
                  riskNamesBySlug={riskNamesBySlug}
                />
              ))}
            </div>
          </div>
        );
      })}
    </>
  );
}

/* ─── Kleine Header-Übersicht (Risiken / Pflicht-Maßnahmen) ─────────── */
export function EngineSummary({ d }: { d: DerivationResult }) {
  return (
    <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
      <span className="conf-badge conf-medium">{d.summary.n_risks} Risiken</span>
      <span className="conf-badge conf-low">{d.summary.n_mandatory_measures} Pflicht-Maßnahmen</span>
      {d.summary.n_missing_controls > 0 ? (
        <span className="conf-badge conf-low">{d.summary.n_missing_controls} Punkte zur Prüfung</span>
      ) : (
        <span className="conf-badge conf-high">Pflicht-Punkte vollständig adressiert</span>
      )}
    </div>
  );
}
