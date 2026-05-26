'use client';

import { useState } from 'react';
import { useFormState } from 'react-dom';
import { saveStep5 } from '@/app/actions/wizard';
import { WIZARD_INITIAL, type AuthState } from '@/lib/forms/states';
import { SubmitButton } from '@/components/auth/SubmitButton';
import { FormFeedback } from '@/components/auth/FormFeedback';
import type { RaMeasureCatalog, RaLegalRef } from '@/lib/db/types';
import type { OpenItem } from '@/lib/wizard/derive';

export function Step5Form({
  assessmentId,
  measures,
  openItems,
  legalRefMap,
  acknowledged
}: {
  assessmentId: string;
  measures: RaMeasureCatalog[];
  openItems: OpenItem[];
  legalRefMap: Map<string, RaLegalRef>;
  acknowledged: Record<string, { confirmed: boolean }>;
}) {
  const [state, formAction] = useFormState(
    saveStep5.bind(null, assessmentId),
    WIZARD_INITIAL
  );
  const fbState: AuthState = { ok: state.ok, error: state.error };
  const [detailMode, setDetailMode] = useState(
    Object.keys(acknowledged).length > 0
  );

  return (
    <form action={formAction}>
      <FormFeedback state={fbState} />

      {!detailMode ? (
        // Schnellmodus: 1-Klick-Übernahme
        <>
          <div className="alert-banner is-success" style={{ marginBottom: 16, marginTop: 0 }}>
            <span className="alert-banner-icon">⚡</span>
            <div className="alert-banner-text">
              <strong>Schnellmodus aktiv:</strong> Wir übernehmen alle{' '}
              {measures.length} typischen Standardmaßnahmen als{' '}
              <strong>Entwurf</strong>. Du kannst sie später jederzeit
              bearbeiten oder jetzt im Detail-Modus prüfen.
            </div>
          </div>

          <div className="quality-box" style={{ marginBottom: 16 }}>
            <div className="qb-head">🔎 So entstand diese Liste</div>
            <div className="qb-body">
              Aus deinen Risiken in Schritt 4 → passende Maßnahmen aus dem
              kuratierten DGUV/BG-Quellenkatalog. Jede Maßnahme trägt
              Quellen-Belege. Du bestätigst zu einem späteren Zeitpunkt,
              welche tatsächlich umgesetzt sind.
            </div>
          </div>

          <div className="preview-table" style={{ marginBottom: 16 }}>
            <div className="preview-head">
              <span>Maßnahme</span>
              <span>Belege</span>
              <span></span>
            </div>
            {measures.slice(0, 5).map((m) => {
              const refs = m.source_ref_slugs
                .map((s) => legalRefMap.get(s))
                .filter((r): r is RaLegalRef => !!r);
              return (
                <div className="preview-row" key={m.slug}>
                  <div>
                    <div className="preview-name">{m.short_text}</div>
                  </div>
                  <div className="src-chip-row" style={{ marginTop: 0 }}>
                    {refs.slice(0, 2).map((r) => (
                      <span key={r.slug} className="src-chip" title={r.title}>
                        {r.citation}
                      </span>
                    ))}
                  </div>
                  <div>
                    <span className={`conf-badge conf-${m.confidence}`}>
                      {m.confidence === 'high' ? 'belegt' : 'plausibel'}
                    </span>
                  </div>
                </div>
              );
            })}
            {measures.length > 5 && (
              <div className="preview-row">
                <div style={{ color: 'var(--text-3)' }}>
                  + {measures.length - 5} weitere Maßnahmen werden übernommen …
                </div>
                <div></div>
                <div></div>
              </div>
            )}
          </div>

          {/* Hidden inputs: alle Maßnahmen werden übernommen */}
          {measures.map((m) => (
            <input
              key={m.slug}
              type="hidden"
              name={`measure_${m.slug}`}
              value="on"
            />
          ))}

          <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => setDetailMode(true)}
            >
              ⚙ Detail-Modus: jede Maßnahme einzeln prüfen
            </button>
          </div>

          {openItems.length > 0 && (
            <>
              <h3 style={{ fontSize: 14, fontWeight: 650, margin: '18px 0 10px' }}>
                Offene Prüfpunkte ({openItems.length})
              </h3>
              <div className="preview-table">
                {openItems.map((it) => (
                  <div className="preview-row" key={it.id}>
                    <div>
                      <div className="preview-name">{it.description}</div>
                    </div>
                    <div>
                      <span className={`badge ${it.priority === 'high' ? 'badge-amber' : 'badge-blue'}`}>
                        {it.priority}
                      </span>
                    </div>
                    <div></div>
                  </div>
                ))}
              </div>
              <div className="note" style={{ marginTop: 8 }}>
                Diese Punkte werden im PDF dokumentiert — Eigenklärung folgt nach Release.
              </div>
            </>
          )}
        </>
      ) : (
        // Detail-Modus: jede Maßnahme einzeln
        <>
          <div className="alert-banner is-info" style={{ marginBottom: 16, marginTop: 0 }}>
            <span className="alert-banner-icon">⚙</span>
            <div className="alert-banner-text">
              <strong>Detail-Modus:</strong> Bestätige je Maßnahme, ob sie
              bei dir bereits umgesetzt ist.{' '}
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                style={{ marginLeft: 8 }}
                onClick={() => setDetailMode(false)}
              >
                ‹ zurück zum Schnellmodus
              </button>
            </div>
          </div>

          <div className="preview-table" style={{ marginBottom: 24 }}>
            <div className="preview-head">
              <span>Maßnahme</span>
              <span>Einschätzung</span>
              <span>Umgesetzt?</span>
            </div>
            {measures.map((m) => {
              const refs = m.source_ref_slugs
                .map((s) => legalRefMap.get(s))
                .filter((r): r is RaLegalRef => !!r);
              const ack = acknowledged[m.slug]?.confirmed ?? true;
              return (
                <div className="preview-row" key={m.slug}>
                  <div>
                    <div className="preview-name">{m.short_text}</div>
                    <div style={{ fontSize: 12.5, color: 'var(--text-2)', marginTop: 4 }}>
                      {m.long_text}
                    </div>
                    <div className="src-chip-row">
                      {refs.map((r) => (
                        <span key={r.slug} className="src-chip" title={r.title}>
                          {r.citation}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div>
                    <span className={`conf-badge conf-${m.confidence}`}>
                      {m.confidence === 'high' ? 'belegt' : 'plausibel'}
                    </span>
                  </div>
                  <div>
                    <label style={{ display: 'flex', gap: 6, alignItems: 'center', fontSize: 13 }}>
                      <input
                        type="checkbox"
                        name={`measure_${m.slug}`}
                        defaultChecked={ack}
                      />
                      ja
                    </label>
                  </div>
                </div>
              );
            })}
          </div>

          {openItems.length > 0 && (
            <>
              <h3 style={{ fontSize: 14, fontWeight: 650, margin: '18px 0 10px' }}>
                Offene Prüfpunkte
              </h3>
              <div className="preview-table">
                {openItems.map((it) => (
                  <div className="preview-row" key={it.id}>
                    <div>
                      <div className="preview-name">{it.description}</div>
                    </div>
                    <div>
                      <span className={`badge ${it.priority === 'high' ? 'badge-amber' : 'badge-blue'}`}>
                        {it.priority}
                      </span>
                    </div>
                    <div>
                      <label style={{ display: 'flex', gap: 6, alignItems: 'center', fontSize: 13 }}>
                        <input type="checkbox" name={`open_${it.id}`} />
                        erledigt
                      </label>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </>
      )}

      <div style={{ marginTop: 18, display: 'flex', justifyContent: 'space-between' }}>
        <a className="btn btn-secondary" href={`/app/wizard/${assessmentId}/4`}>‹ Zurück</a>
        <SubmitButton pendingLabel="Speichere …">Weiter zur Auswertung ›</SubmitButton>
      </div>
    </form>
  );
}
