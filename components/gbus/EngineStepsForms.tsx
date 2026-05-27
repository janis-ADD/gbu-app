'use client';

import { useFormState } from 'react-dom';
import {
  saveGbuStep2, saveGbuStep3, saveGbuStep4, releaseGbuAction
} from '@/app/actions/gbus';
import { WIZARD_INITIAL, RELEASE_INITIAL, type AuthState } from '@/lib/forms/states';
import { SubmitButton } from '@/components/auth/SubmitButton';
import { FormFeedback } from '@/components/auth/FormFeedback';
import {
  UiMeasureSummaryBlock,
  PriorityGroupedMeasures
} from './EngineOutputs';
import { COPY } from '@/lib/copy/microcopy';
import type { RaRiskCatalog, RaLegalRef, ReviewIntervalMonths, ReviewTriggerEvent } from '@/lib/db/types';
import { REVIEW_TRIGGER_EVENTS } from '@/lib/db/types';
import type { DerivedMeasure, MissingControl } from '@/lib/wizard/engine';

/* ─── Step 2 Form: Risiko-Auswahl (Engine-pre-checked) ───────────── */
export function GbuStep2RisksForm({
  bundleId, gbuId, risks, preselected
}: {
  bundleId: string; gbuId: string;
  risks: RaRiskCatalog[];
  preselected: string[];
}) {
  const [state, action] = useFormState(
    saveGbuStep2.bind(null, bundleId, gbuId), WIZARD_INITIAL
  );
  const fb: AuthState = { ok: state.ok, error: state.error };
  const set = new Set(preselected);

  return (
    <form action={action}>
      <FormFeedback state={fb} />
      <details style={{ marginBottom: 14 }}>
        <summary style={{ cursor: 'pointer', fontSize: 13, color: 'var(--text-3)' }}>
          Risiken einzeln an- oder abwählen (alle vorausgewählt)
        </summary>
        <div className="risk-grid" style={{ marginTop: 10 }}>
          {risks.map((r) => (
            <label key={r.slug} className={`risk-btn ${set.has(r.slug) ? 'active' : ''}`}>
              <input type="checkbox" name="risk_slug" value={r.slug} defaultChecked={set.has(r.slug)} />
              <span>{r.name}</span>
            </label>
          ))}
        </div>
      </details>
      <div style={{ marginTop: 18, display: 'flex', justifyContent: 'space-between' }}>
        <a className="btn btn-secondary" href={`/app/bundles/${bundleId}/gbu/${gbuId}/1`}>‹ Zurück</a>
        <SubmitButton pendingLabel="Speichere …">Weiter zu Maßnahmen ›</SubmitButton>
      </div>
    </form>
  );
}

/* ─── Step 3 Form: Maßnahmen in UI-Priority-Gruppen ──────────────── */
export function GbuStep3MeasuresForm({
  bundleId, gbuId, measures, refMap, ack, riskNamesBySlug
}: {
  bundleId: string; gbuId: string;
  measures: DerivedMeasure[];
  refMap: Map<string, RaLegalRef>;
  ack: Record<string, { confirmed: boolean }>;
  riskNamesBySlug?: Record<string, string>;
}) {
  const [state, action] = useFormState(
    saveGbuStep3.bind(null, bundleId, gbuId), WIZARD_INITIAL
  );
  const fb: AuthState = { ok: state.ok, error: state.error };

  return (
    <form action={action}>
      <FormFeedback state={fb} />

      <div className="safety-hint">
        <span className="safety-ico" aria-hidden="true">🛡️</span>
        <div>
          <strong>{COPY.safetyHints.step3.strong}</strong>{' '}
          {COPY.safetyHints.step3.body}
        </div>
      </div>

      {measures.length === 0 ? (
        <div className="note">{COPY.empty.measures}</div>
      ) : (
        <>
          <UiMeasureSummaryBlock measures={measures} />
          <PriorityGroupedMeasures
            measures={measures}
            refMap={refMap}
            ack={ack}
            riskNamesBySlug={riskNamesBySlug}
          />
        </>
      )}

      <div style={{
        marginTop: 12, padding: '8px 0', fontSize: 11.5,
        color: 'var(--text-3)', lineHeight: 1.55
      }}>
        {COPY.trust.derivationBasis} {COPY.trust.finalResponsibility}
      </div>

      <div style={{ marginTop: 18, display: 'flex', justifyContent: 'space-between' }}>
        <a className="btn btn-secondary" href={`/app/bundles/${bundleId}/gbu/${gbuId}/2`}>‹ Zurück</a>
        <SubmitButton pendingLabel="Speichere …">Weiter zur Verantwortung ›</SubmitButton>
      </div>
    </form>
  );
}

/* ─── Step 4: Verantwortlichkeit, Wirksamkeitsprüfung, Erinnerungen ─── */
export function GbuStep4ResponsibilityForm({
  bundleId, gbuId, defaultRole, defaultDate,
  defaultIntervalMonths, defaultTriggers
}: {
  bundleId: string; gbuId: string;
  defaultRole: string; defaultDate: string;
  defaultIntervalMonths: ReviewIntervalMonths | null;
  defaultTriggers: ReviewTriggerEvent[];
}) {
  const [state, action] = useFormState(
    saveGbuStep4.bind(null, bundleId, gbuId), WIZARD_INITIAL
  );
  const fb: AuthState = { ok: state.ok, error: state.error };
  const inOneYear = new Date();
  inOneYear.setFullYear(inOneYear.getFullYear() + 1);
  const defaultIso = defaultDate || inOneYear.toISOString().slice(0, 10);
  const intervalStr = defaultIntervalMonths ? String(defaultIntervalMonths) : '';
  const triggerSet = new Set(defaultTriggers);

  return (
    <form action={action}>
      <FormFeedback state={fb} />
      <div className="safety-hint">
        <span className="safety-ico" aria-hidden="true">🛡️</span>
        <div>
          <strong>{COPY.safetyHints.step4.strong}</strong>{' '}
          {COPY.safetyHints.step4.body}
        </div>
      </div>
      <div className="field-grid">
        <div className="field">
          <label>Verantwortliche Rolle <span className="req">*</span></label>
          <input name="responsible_role" required defaultValue={defaultRole}
                 placeholder="z. B. Geschäftsführung, Sicherheitsbeauftragte:r" />
        </div>
        <div className="field">
          <label>Wirksamkeitsprüfung bis <span className="req">*</span></label>
          <input type="date" name="review_due_date" required defaultValue={defaultIso} />
        </div>
      </div>

      {/* Standard-Intervall — angenehme Voreinstellung statt nur Datum */}
      <div className="field" style={{ marginTop: 18 }}>
        <label>Wiederholungsintervall (empfohlen)</label>
        <div className="interval-pills">
          {[
            { v: '',   label: 'Kein festes Intervall',   sub: 'Nur das Datum oben gilt.' },
            { v: '6',  label: 'Alle 6 Monate',           sub: 'Hohes Risiko, häufige Änderungen.' },
            { v: '12', label: 'Alle 12 Monate',          sub: 'Standard für die meisten Tätigkeiten.' },
            { v: '24', label: 'Alle 24 Monate',          sub: 'Stabile Tätigkeiten, geringes Risiko.' }
          ].map((opt) => (
            <label key={opt.v || 'none'} className={`interval-pill ${intervalStr === opt.v ? 'is-active' : ''}`}>
              <input type="radio" name="review_interval_months" value={opt.v}
                     defaultChecked={intervalStr === opt.v} />
              <div className="interval-pill-label">{opt.label}</div>
              <div className="interval-pill-sub">{opt.sub}</div>
            </label>
          ))}
        </div>
      </div>

      {/* Anlass-basierte Trigger (ArbSchG §3) */}
      <div className="field" style={{ marginTop: 18 }}>
        <label>Außerplanmäßige Aktualisierung — bei welchen Anlässen?</label>
        <div className="field-hint" style={{ marginBottom: 8 }}>
          ArbSchG §3 verlangt eine Aktualisierung, sobald sich die Bedingungen
          ändern. Diese Anlässe werden in der Beurteilung dokumentiert und im
          PDF als Hinweis aufgeführt.
        </div>
        <div className="trigger-grid">
          {REVIEW_TRIGGER_EVENTS.map((t) => (
            <label key={t.value} className={`trigger-card ${triggerSet.has(t.value) ? 'is-active' : ''}`}>
              <input type="checkbox" name="review_trigger_events" value={t.value}
                     defaultChecked={triggerSet.has(t.value)} />
              <div className="trigger-card-label">{t.label}</div>
              <div className="trigger-card-sub">{t.description}</div>
            </label>
          ))}
        </div>
      </div>

      <div style={{ marginTop: 22, display: 'flex', justifyContent: 'space-between' }}>
        <a className="btn btn-secondary" href={`/app/bundles/${bundleId}/gbu/${gbuId}/3`}>‹ Zurück</a>
        <SubmitButton pendingLabel="Speichere …">Weiter zur Freigabe ›</SubmitButton>
      </div>
    </form>
  );
}

/* ─── Step 5: Release mit Mindestprüfung (entschärft) ──────────────
 * Phase „Real User Validation Sprint, Fix 2 + 3":
 *   - Statt drei separater Warn-Banner gibt es EINE kombinierte
 *     „Vor der Freigabe bitte kurz prüfen"-Box mit Checkliste.
 *   - Bei letzter freier Freigabe im Free-Plan ein ruhiger Hinweis
 *     als zusätzlicher Listenpunkt (ohne Upsell-Sprache).
 */
export function GbuStep5ReleaseForm({
  bundleId, gbuId, alreadyReleased, currentVersion,
  unfulfilledMandatory, missingControls,
  freePlanLastRelease = false
}: {
  bundleId: string; gbuId: string;
  alreadyReleased: boolean; currentVersion: number;
  unfulfilledMandatory: Array<{ slug: string; short_text: string; reason: string | null }>;
  missingControls: MissingControl[];
  /** True, wenn der Nutzer im Free-Plan ist und exakt noch eine freie
   *  Freigabe übrig hat (remaining === 1). */
  freePlanLastRelease?: boolean;
}) {
  const [state, action] = useFormState(
    releaseGbuAction.bind(null, bundleId, gbuId), RELEASE_INITIAL
  );

  if (alreadyReleased && state.kind !== 'success') {
    return (
      <div className="alert-banner is-success">
        <span className="alert-banner-icon" aria-hidden="true">✅</span>
        <div className="alert-banner-text">
          <strong>{COPY.release.alreadyReleasedTitle} (v{currentVersion}).</strong>{' '}
          <a href={`/app/bundles/${bundleId}/gbu/${gbuId}/v/${currentVersion}`}
             style={{ color: 'var(--green)', fontWeight: 650, textDecoration: 'underline' }}>
            {COPY.release.alreadyReleasedOpenLink}
          </a>
        </div>
      </div>
    );
  }

  return (
    <form action={action}>
      {state.kind === 'error' && (
        <div className="alert-banner is-error">
          <span className="alert-banner-icon" aria-hidden="true">●</span>
          <div className="alert-banner-text">{state.message}</div>
        </div>
      )}
      {state.kind === 'paywall' && (
        <div className="alert-banner" style={{ marginBottom: 16, borderLeft: '3px solid var(--petrol, #1B6CA8)' }}>
          <span className="alert-banner-icon" aria-hidden="true">🔒</span>
          <div className="alert-banner-text">
            <strong>Plan-Grenze erreicht.</strong>{' '}
            Im aktuellen Plan sind 3 Beurteilungen enthalten. Mit einem Upgrade können
            Sie weitere anlegen — die hier eingegebenen Daten bleiben erhalten.
            <a className="btn btn-primary btn-sm" style={{ marginLeft: 12 }} href="/app/upgrade">
              Pläne ansehen
            </a>
          </div>
        </div>
      )}
      {state.kind === 'success' && (
        <div className="alert-banner is-success">
          <span className="alert-banner-icon" aria-hidden="true">✅</span>
          <div className="alert-banner-text">
            <strong>{COPY.confirm.released(state.versionNumber)}</strong>{' '}
            <a href={`/app/bundles/${bundleId}/gbu/${gbuId}/v/${state.versionNumber}?ev=gbu_release`}
               style={{ color: 'var(--green)', fontWeight: 650, textDecoration: 'underline' }}>
              {COPY.release.alreadyReleasedOpenLink}
            </a>
          </div>
        </div>
      )}

      {(() => {
        const hasMandatory = unfulfilledMandatory.length > 0;
        const hasMissing = missingControls.length > 0;
        const showCheck = hasMandatory || hasMissing || freePlanLastRelease;
        if (!showCheck) return null;
        return (
          <div className="alert-banner" style={{ marginBottom: 16, borderLeft: '3px solid var(--petrol, #1B6CA8)' }}>
            <span className="alert-banner-icon" aria-hidden="true">📋</span>
            <div className="alert-banner-text" style={{ flex: 1 }}>
              <strong>{COPY.panels.preReleaseCheck.title}</strong>
              <ul style={{ paddingLeft: 18, margin: '8px 0 0', listStyle: 'none' }}>
                {hasMandatory && (
                  <li style={{ marginBottom: 6, lineHeight: 1.55 }}>
                    <span style={{ marginRight: 8, color: 'var(--text-3)' }}>•</span>
                    {COPY.panels.preReleaseCheck.itemMandatory(unfulfilledMandatory.length)}
                    <details style={{ marginTop: 4 }}>
                      <summary style={{ fontSize: 12, color: 'var(--text-3)', cursor: 'pointer' }}>
                        Welche genau?
                      </summary>
                      <ul style={{ paddingLeft: 18, margin: '4px 0 0', fontSize: 12.5 }}>
                        {unfulfilledMandatory.map((u) => (
                          <li key={u.slug}>
                            {u.short_text}
                            {u.reason ? <em style={{ color: 'var(--text-3)' }}> · {u.reason}</em> : null}
                          </li>
                        ))}
                      </ul>
                    </details>
                  </li>
                )}
                {hasMissing && (
                  <li style={{ marginBottom: 6, lineHeight: 1.55 }}>
                    <span style={{ marginRight: 8, color: 'var(--text-3)' }}>•</span>
                    {COPY.panels.preReleaseCheck.itemMissing(missingControls.length)}
                    <span style={{ color: 'var(--text-3)', fontSize: 12.5 }}>
                      {' '}— Details siehe Schritt 3.
                    </span>
                  </li>
                )}
                {freePlanLastRelease && (
                  <li style={{ marginBottom: 6, lineHeight: 1.55 }}>
                    <span style={{ marginRight: 8, color: 'var(--text-3)' }}>•</span>
                    {COPY.panels.preReleaseCheck.itemFreePlanLast}
                  </li>
                )}
              </ul>
              <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 8, lineHeight: 1.5 }}>
                {COPY.panels.preReleaseCheck.intro}
              </div>
            </div>
          </div>
        );
      })()}

      <div className="confirm-box">
        <label style={{ display: 'flex', gap: 10, fontSize: 13.5, color: 'var(--text-2)', lineHeight: 1.45, cursor: 'pointer' }}>
          <input type="checkbox" name="disclaimer_ack" required />
          <span>{COPY.release.disclaimer}</span>
        </label>
        <div style={{ marginTop: 16, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <SubmitButton pendingLabel={COPY.release.submitPending}>
            ✅ {COPY.release.submitLabel}
          </SubmitButton>
          <a className="btn btn-secondary" href={`/app/bundles/${bundleId}/gbu/${gbuId}/4`}>
            ‹ Zurück
          </a>
        </div>
        <div style={{ marginTop: 10, fontSize: 11.5, color: 'var(--text-3)', lineHeight: 1.5 }}>
          {COPY.trust.snapshotImmutable}
        </div>
      </div>
    </form>
  );
}
