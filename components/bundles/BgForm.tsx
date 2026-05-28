'use client';

import { useState } from 'react';
import { useFormState } from 'react-dom';
import { saveBundleBg } from '@/app/actions/bundles';
import { BUNDLE_SETUP_INITIAL, type AuthState } from '@/lib/forms/states';
import { GERMAN_STATES, type GermanState } from '@/lib/db/types';
import { SubmitButton } from '@/components/auth/SubmitButton';
import { FormFeedback } from '@/components/auth/FormFeedback';
import type { BgCandidate } from '@/lib/wizard/derive';
import type { RaBgCatalog } from '@/lib/db/types';

export function BgForm({
  bundleId,
  candidates,
  bgCatalog,
  selected,
  state,
  unclear
}: {
  bundleId: string;
  candidates: BgCandidate[];
  bgCatalog: RaBgCatalog[];
  selected: string[];
  state: GermanState | null;
  unclear: boolean;
}) {
  const [actionState, formAction] = useFormState(
    saveBundleBg.bind(null, bundleId),
    BUNDLE_SETUP_INITIAL
  );
  const fb: AuthState = { ok: actionState.ok, error: actionState.error };

  const candidateSlugs = new Set(candidates.map((c) => c.bg.slug));
  const others = bgCatalog.filter((bg) => !candidateSlugs.has(bg.slug));
  const selSet = new Set(selected);

  // Wenn keine industriespezifischen Kandidaten gefunden wurden (z. B.
  // Branche „other" oder Nische außerhalb des Mini-Katalogs), klappen wir
  // die vollständige BG-Liste automatisch auf — sonst hätten Nutzer:innen
  // nur einen einzigen Button und keine sichtbare Auswahl. Der Nutzer kann
  // die Liste über den Toggle weiterhin zuklappen.
  const shouldDefaultOpen = candidates.length === 0 && others.length > 0;
  const [showAll, setShowAll] = useState(shouldDefaultOpen);

  return (
    <form action={formAction}>
      <FormFeedback state={fb} />

      <div className="alert-banner is-info" style={{ marginBottom: 16 }}>
        <span className="alert-banner-icon">ℹ️</span>
        <div className="alert-banner-text">
          <strong>Wichtig:</strong> Wir geben hier <strong>keine Empfehlung</strong>.
          Die Liste zeigt mögliche zuständige Berufsgenossenschaften mit
          qualitativer Einordnung. Die verbindliche Klärung verantwortet immer
          der Betrieb — z. B. über die{' '}
          <a
            href="https://www.dguv.de/de/bg-uk-lv/bgen/index.jsp"
            target="_blank" rel="noopener"
            style={{ color: 'var(--petrol)', fontWeight: 600 }}
          >
            DGUV-BG-Übersicht
          </a>.
        </div>
      </div>

      <div className="field" style={{ marginBottom: 14 }}>
        <label>Bundesland (regionale Aufsicht)</label>
        <select name="state" defaultValue={state ?? ''}>
          <option value="">— wählen —</option>
          {GERMAN_STATES.map((s) => <option key={s.code} value={s.code}>{s.name}</option>)}
        </select>
        <div className="field-hint">
          Ergänzend zur BG ist je nach Bundesland eine Landesaufsicht
          (z. B. Gewerbeaufsicht, LAGetSi) zuständig.
        </div>
      </div>

      <h3 style={{ fontSize: 14, fontWeight: 650, margin: '18px 0 8px' }}>
        Mögliche zuständige Berufsgenossenschaften
        <span className="conf-badge conf-low" style={{ marginLeft: 10 }}>
          unsicher · selbst prüfen
        </span>
      </h3>

      {candidates.length === 0 ? (
        <div className="note">
          Für Ihre Branche wurde kein direkter Kandidat erkannt. Wählen Sie
          unten die zuständige Berufsgenossenschaft aus der vollständigen
          Liste — oder markieren Sie „noch nicht geklärt", wenn Sie die
          Zuständigkeit erst mit der BG abstimmen.
        </div>
      ) : (
        <div className="risk-grid" style={{ marginBottom: 10 }}>
          {candidates.map((c) => (
            <label
              key={c.bg.slug}
              className={`risk-btn ${selSet.has(c.bg.slug) ? 'active' : ''}`}
            >
              <input
                type="checkbox" name="confirmed_bg_slug" value={c.bg.slug}
                defaultChecked={selSet.has(c.bg.slug)}
              />
              <span>
                <strong style={{ display: 'block' }}>
                  {c.bg.name}{' '}
                  <span className={`conf-badge ${c.likelihood === 'wahrscheinlich' ? 'conf-medium' : 'conf-low'}`}>
                    {c.likelihood}
                  </span>
                </strong>
                <span style={{ fontSize: 11, color: 'var(--text-3)', display: 'block', marginTop: 2 }}>
                  {c.bg.description}
                </span>
                <span style={{ fontSize: 11, color: 'var(--text-3)', display: 'block', marginTop: 2 }}>
                  Begründung: {c.reasons.join(' · ')}
                </span>
              </span>
            </label>
          ))}
        </div>
      )}

      {others.length > 0 && (
        <>
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={() => setShowAll((s) => !s)}
            aria-expanded={showAll}
            style={{ marginTop: showAll ? 0 : 6 }}
          >
            {showAll
              ? '− Vollständige BG-Liste ausblenden'
              : `+ Weitere BGs anzeigen (${others.length})`}
          </button>
          {showAll && (
            <div className="risk-grid" style={{ marginTop: 10 }}>
              {others.map((bg) => (
                <label key={bg.slug} className={`risk-btn ${selSet.has(bg.slug) ? 'active' : ''}`}>
                  <input type="checkbox" name="confirmed_bg_slug" value={bg.slug} defaultChecked={selSet.has(bg.slug)} />
                  <span>
                    <strong style={{ display: 'block' }}>{bg.name}</strong>
                    <span style={{ fontSize: 11, color: 'var(--text-3)' }}>{bg.description}</span>
                  </span>
                </label>
              ))}
            </div>
          )}
        </>
      )}

      <div style={{ marginTop: 14 }}>
        <label style={{ display: 'flex', gap: 8, alignItems: 'flex-start', fontSize: 13, color: 'var(--text-2)', cursor: 'pointer' }}>
          <input type="checkbox" name="unclear" defaultChecked={unclear} style={{ marginTop: 3 }} />
          <span>Zuständigkeit ist <strong>noch nicht geklärt</strong> — ich werde mich an die in Frage kommende(n) BG wenden.</span>
        </label>
      </div>

      <div className="confirm-box" style={{ marginTop: 16 }}>
        <label style={{ display: 'flex', gap: 10, fontSize: 13.5, color: 'var(--text-2)', lineHeight: 1.45, cursor: 'pointer' }}>
          <input type="checkbox" name="self_verified" required style={{ marginTop: 3 }} />
          <span>
            <strong>Ich habe die BG-Zuständigkeit selbst geprüft</strong> bzw.
            werde sie verbindlich klären. Die Auswahl im System ist
            <em> kein Ersatz</em> für die direkte Abstimmung mit der BG.
          </span>
        </label>
      </div>

      <div style={{ marginTop: 18, display: 'flex', justifyContent: 'space-between' }}>
        <a className="btn btn-secondary" href={`/app/bundles/${bundleId}/setup`}>‹ Zurück</a>
        <SubmitButton pendingLabel="Speichere …">Setup abschließen ›</SubmitButton>
      </div>
    </form>
  );
}
