'use client';

import { useState } from 'react';
import { useFormState } from 'react-dom';
import { saveStep1 } from '@/app/actions/wizard';
import { WIZARD_INITIAL, type AuthState } from '@/lib/forms/states';
import { GERMAN_STATES } from '@/lib/db/types';
import { INDUSTRIES } from '@/lib/wizard/industries';
import { SubmitButton } from '@/components/auth/SubmitButton';
import { FormFeedback } from '@/components/auth/FormFeedback';

type Initial = {
  company_name?: string;
  industry?: string;
  street?: string;
  postal_code?: string;
  city?: string;
  employee_bucket?: string;
  role_in_company?: string;
  short_description?: string;
  state?: string;
};

/**
 * Step 1 — 60-Sekunden-Doktrin:
 *  - Firmenname + Branche aus Onboarding vorbefüllt
 *  - Mitarbeiterzahl default "2-5"
 *  - Rolle default "Geschäftsführung"
 *  - Bundesland Pflicht, aber sichtbarer Default-Hinweis
 *  - Adresse + Kurzbeschreibung in collapsible "Mehr Details"
 */
export function Step1Form({
  assessmentId,
  initial
}: {
  assessmentId: string;
  initial: Initial;
}) {
  const [state, formAction] = useFormState(
    saveStep1.bind(null, assessmentId),
    WIZARD_INITIAL
  );
  const fbState: AuthState = { ok: state.ok, error: state.error };
  const [detailsOpen, setDetailsOpen] = useState(
    !!(initial.street || initial.postal_code || initial.city || initial.short_description)
  );

  return (
    <form action={formAction}>
      <FormFeedback state={fbState} />

      <div
        className="alert-banner is-info"
        style={{ marginBottom: 16, marginTop: 0 }}
      >
        <span className="alert-banner-icon">⚡</span>
        <div className="alert-banner-text">
          <strong>Schnellstart aktiv:</strong> Wir haben sinnvolle Defaults
          vorausgewählt. Prüfe sie kurz und passe an, wo nötig — sonst
          einfach „Weiter" klicken.
        </div>
      </div>

      <div className="field-grid">
        <div className="field">
          <label>Firmenname <span className="req">*</span></label>
          <input name="company_name" required defaultValue={initial.company_name ?? ''} />
        </div>
        <div className="field">
          <label>Branche / Tätigkeit <span className="req">*</span></label>
          <select name="industry" required defaultValue={initial.industry ?? ''}>
            <option value="" disabled>— Branche wählen —</option>
            {INDUSTRIES.map((i) => (
              <option key={i.value} value={i.value}>{i.label}</option>
            ))}
          </select>
        </div>
        <div className="field">
          <label>Mitarbeitende <span className="req">*</span></label>
          <select name="employee_bucket" required defaultValue={initial.employee_bucket || '2-5'}>
            <option value="1">1 (Solo)</option>
            <option value="2-5">2 – 5</option>
            <option value="6-20">6 – 20</option>
            <option value="21-50">21 – 50</option>
            <option value="51-250">51 – 250</option>
            <option value="250+">über 250</option>
          </select>
          <div className="field-hint">Default „2–5" — anpassen falls nötig.</div>
        </div>
        <div className="field">
          <label>Bundesland <span className="req">*</span></label>
          <select name="state" required defaultValue={initial.state ?? ''}>
            <option value="" disabled>— wählen —</option>
            {GERMAN_STATES.map((s) => (
              <option key={s.code} value={s.code}>{s.name}</option>
            ))}
          </select>
          <div className="field-hint">Für regionale Aufsichtshinweise.</div>
        </div>
        <div className="field wide">
          <label>Verantwortliche Rolle <span className="req">*</span></label>
          <input
            name="role_in_company"
            required
            defaultValue={initial.role_in_company || 'Geschäftsführung'}
            placeholder="z. B. Geschäftsführung — keine Namen"
          />
          <div className="field-hint">DSGVO: nur Rolle, keine Personennamen.</div>
        </div>
      </div>

      {/* Collapsible: optionale Details */}
      <div style={{ marginTop: 18 }}>
        <button
          type="button"
          className="btn btn-ghost btn-sm"
          onClick={() => setDetailsOpen((o) => !o)}
        >
          {detailsOpen ? '▾' : '▸'} Mehr Details (optional)
        </button>

        {detailsOpen && (
          <div className="field-grid" style={{ marginTop: 12 }}>
            <div className="field">
              <label>Straße und Hausnummer</label>
              <input name="street" defaultValue={initial.street ?? ''} />
            </div>
            <div className="field">
              <label>PLZ</label>
              <input name="postal_code" defaultValue={initial.postal_code ?? ''} />
            </div>
            <div className="field">
              <label>Ort</label>
              <input name="city" defaultValue={initial.city ?? ''} />
            </div>
            <div className="field wide">
              <label>Kurzbeschreibung des Betriebs (optional)</label>
              <textarea
                name="short_description"
                defaultValue={initial.short_description ?? ''}
                placeholder="z. B. Malerbetrieb mit kleinem Büro, Lager, 4 Transportern und wechselnden Baustellen."
              />
              <div className="field-hint">
                Bitte keine Mitarbeiternamen, Gesundheits- oder Kontaktdaten.
              </div>
            </div>
          </div>
        )}
        {/* Hidden defaults wenn nicht aufgeklappt — Server-Action erwartet alle Felder */}
        {!detailsOpen && (
          <>
            <input type="hidden" name="street" value={initial.street ?? ''} />
            <input type="hidden" name="postal_code" value={initial.postal_code ?? ''} />
            <input type="hidden" name="city" value={initial.city ?? ''} />
            <input type="hidden" name="short_description" value={initial.short_description ?? ''} />
          </>
        )}
      </div>

      <div style={{ marginTop: 18, display: 'flex', justifyContent: 'flex-end' }}>
        <SubmitButton pendingLabel="Speichere …">Weiter ›</SubmitButton>
      </div>
    </form>
  );
}
