'use client';

import { useFormState } from 'react-dom';
import { useState } from 'react';
import { saveStep2 } from '@/app/actions/wizard';
import { WIZARD_INITIAL, type AuthState } from '@/lib/forms/states';
import { SubmitButton } from '@/components/auth/SubmitButton';
import { FormFeedback } from '@/components/auth/FormFeedback';
import type { RaBgCatalog, GermanState } from '@/lib/db/types';
import { GERMAN_STATES } from '@/lib/db/types';

/**
 * BG-Schritt — KEINE Empfehlung, nur Kandidatenliste mit
 * Multi-Select + Pflicht-Eigenklärung.
 *
 * Siehe Memory: bg-zustaendigkeit-doktrin.md
 */
export function Step2Form({
  assessmentId,
  bgCatalog,
  candidates,
  selected,
  state,
  unclear
}: {
  assessmentId: string;
  bgCatalog: RaBgCatalog[];
  candidates: RaBgCatalog[];           // typische Vorauswahl
  selected: string[];                   // bestätigte Kandidaten
  state: GermanState | null;            // Bundesland aus Profil
  unclear: boolean;                     // "noch unklar" toggle
}) {
  const [actionState, formAction] = useFormState(
    saveStep2.bind(null, assessmentId),
    WIZARD_INITIAL
  );
  const fbState: AuthState = { ok: actionState.ok, error: actionState.error };

  const [showAll, setShowAll] = useState(false);
  // 60-s-Doktrin: wenn noch keine Auswahl vorhanden, sind alle Kandidaten
  // vorausgewählt. User kann abwählen oder einfach Eigenklärung bestätigen.
  const effective = selected.length > 0 ? selected : candidates.map((c) => c.slug);
  const selSet = new Set(effective);
  const candidateSet = new Set(candidates.map((c) => c.slug));
  const others = bgCatalog.filter((bg) => !candidateSet.has(bg.slug));

  return (
    <form action={formAction}>
      <FormFeedback state={fbState} />

      {/* Doktrin-Hinweis */}
      <div className="alert-banner is-info" style={{ marginBottom: 16 }}>
        <span className="alert-banner-icon">ℹ️</span>
        <div className="alert-banner-text">
          <strong>Wichtig:</strong> Wir geben hier <strong>keine Empfehlung</strong>.
          Die Liste zeigt typische BG-Kandidaten für deine Branche. Die
          verbindliche Klärung der Zuständigkeit verantwortet immer der Betrieb —
          z. B. über die{' '}
          <a
            href="https://www.dguv.de/de/bg-uk-lv/bgen/index.jsp"
            target="_blank"
            rel="noopener"
            style={{ color: 'var(--petrol)', fontWeight: 600 }}
          >
            DGUV-BG-Übersicht
          </a>{' '}
          oder direkt bei der in Frage kommenden BG.
        </div>
      </div>

      {/* Bundesland */}
      <div className="field" style={{ marginBottom: 14 }}>
        <label>Bundesland (für regionale Aufsicht)</label>
        <select name="state" defaultValue={state ?? ''}>
          <option value="">— wählen —</option>
          {GERMAN_STATES.map((s) => (
            <option key={s.code} value={s.code}>
              {s.name}
            </option>
          ))}
        </select>
        <div className="field-hint">
          Ergänzend zur BG ist je nach Bundesland eine Landesaufsicht
          (z. B. Gewerbeaufsicht, LAGetSi) zuständig — verbindliche
          Klärung beim zuständigen Land.
        </div>
      </div>

      {/* Kandidatenliste */}
      <h3 style={{ fontSize: 14, fontWeight: 650, margin: '18px 0 8px' }}>
        Typische BG-Kandidaten für deine Branche
        <span className="conf-badge conf-low" style={{ marginLeft: 10 }}>
          unsicher · selbst prüfen
        </span>
      </h3>
      <p style={{ fontSize: 12.5, color: 'var(--text-3)', marginBottom: 10 }}>
        Mehrfach-Zuständigkeit ist bei Mischbetrieben Normalfall. Wähle alle
        BGs aus, die für dich in Frage kommen, oder markiere „noch zu klären".
      </p>

      {candidates.length === 0 ? (
        <div className="note">
          Keine typischen Kandidaten für deine Branche im kuratierten
          Mini-Katalog. Bitte Liste unten erweitern oder „noch zu klären".
        </div>
      ) : (
        <div className="risk-grid" style={{ marginBottom: 10 }}>
          {candidates.map((bg) => (
            <label
              key={bg.slug}
              className={`risk-btn ${selSet.has(bg.slug) ? 'active' : ''}`}
            >
              <input
                type="checkbox"
                name="confirmed_bg_slug"
                value={bg.slug}
                defaultChecked={selSet.has(bg.slug)}
              />
              <span>
                <strong style={{ display: 'block' }}>{bg.name}</strong>
                <span style={{ fontSize: 11, color: 'var(--text-3)' }}>
                  {bg.description}
                </span>
              </span>
            </label>
          ))}
        </div>
      )}

      {!showAll && (
        <button
          type="button"
          className="btn btn-ghost btn-sm"
          onClick={() => setShowAll(true)}
        >
          + Weitere BGs anzeigen (vollständige Liste)
        </button>
      )}
      {showAll && others.length > 0 && (
        <div className="risk-grid" style={{ marginTop: 10 }}>
          {others.map((bg) => (
            <label
              key={bg.slug}
              className={`risk-btn ${selSet.has(bg.slug) ? 'active' : ''}`}
            >
              <input
                type="checkbox"
                name="confirmed_bg_slug"
                value={bg.slug}
                defaultChecked={selSet.has(bg.slug)}
              />
              <span>
                <strong style={{ display: 'block' }}>{bg.name}</strong>
                <span style={{ fontSize: 11, color: 'var(--text-3)' }}>
                  {bg.description}
                </span>
              </span>
            </label>
          ))}
        </div>
      )}

      {/* Unklar-Toggle */}
      <div style={{ marginTop: 14 }}>
        <label
          style={{
            display: 'flex',
            gap: 8,
            alignItems: 'flex-start',
            fontSize: 13,
            color: 'var(--text-2)',
            cursor: 'pointer'
          }}
        >
          <input
            type="checkbox"
            name="unclear"
            defaultChecked={unclear}
            style={{ marginTop: 3 }}
          />
          <span>
            Zuständigkeit ist <strong>noch nicht abschließend geklärt</strong> —
            ich werde mich an die in Frage kommende(n) BG wenden.
          </span>
        </label>
      </div>

      {/* Pflicht-Eigenklärung */}
      <div className="confirm-box" style={{ marginTop: 16 }}>
        <label
          style={{
            display: 'flex',
            gap: 10,
            fontSize: 13.5,
            color: 'var(--text-2)',
            lineHeight: 1.45,
            cursor: 'pointer'
          }}
        >
          <input type="checkbox" name="self_verified" required style={{ marginTop: 3 }} />
          <span>
            <strong>Ich habe die BG-Zuständigkeit selbst geprüft</strong> bzw.
            werde sie verbindlich klären. Die Auswahl im System ist
            <em> kein Ersatz</em> für die direkte Abstimmung mit der BG.
          </span>
        </label>
      </div>

      <div style={{ marginTop: 18, display: 'flex', justifyContent: 'space-between' }}>
        <a className="btn btn-secondary" href={`/app/wizard/${assessmentId}/1`}>
          ‹ Zurück
        </a>
        <SubmitButton pendingLabel="Speichere …">Weiter ›</SubmitButton>
      </div>
    </form>
  );
}
