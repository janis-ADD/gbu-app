'use client';

import { useFormState } from 'react-dom';
import { saveStep3 } from '@/app/actions/wizard';
import { WIZARD_INITIAL, type AuthState } from '@/lib/forms/states';
import { SubmitButton } from '@/components/auth/SubmitButton';
import { FormFeedback } from '@/components/auth/FormFeedback';
import { WORK_AREAS } from '@/lib/wizard/areas';

export function Step3Form({
  assessmentId,
  selected,
  preselectedFromIndustry,
  industryLabel
}: {
  assessmentId: string;
  selected: string[];                  // bereits gespeicherte Auswahl
  preselectedFromIndustry: string[];   // automatische Vorauswahl
  industryLabel: string;
}) {
  const [state, formAction] = useFormState(
    saveStep3.bind(null, assessmentId),
    WIZARD_INITIAL
  );
  const fbState: AuthState = { ok: state.ok, error: state.error };

  // Bereits gespeicherte Auswahl gewinnt, sonst preselect
  const effective = selected.length > 0 ? selected : preselectedFromIndustry;
  const selSet = new Set(effective);
  const isPreselected = (slug: string) => preselectedFromIndustry.includes(slug);

  return (
    <form action={formAction}>
      <FormFeedback state={fbState} />

      {preselectedFromIndustry.length > 0 && (
        <div
          className="alert-banner is-info"
          style={{ marginBottom: 16, marginTop: 0 }}
        >
          <span className="alert-banner-icon">✨</span>
          <div className="alert-banner-text">
            <strong>Vorauswahl:</strong>{' '}
            Basierend auf deiner Branche „{industryLabel}" haben wir{' '}
            <strong>{preselectedFromIndustry.length} typische Bereiche</strong>{' '}
            vorausgewählt. Behalte sie oder klicke welche ab/an.
          </div>
        </div>
      )}

      <div className="area-grid">
        {WORK_AREAS.map((a) => {
          const isSel = selSet.has(a.slug);
          const isPre = isPreselected(a.slug);
          return (
            <label
              key={a.slug}
              className={`area-card ${isSel ? 'active' : ''}`}
            >
              <input
                type="checkbox"
                name="area_slug"
                value={a.slug}
                defaultChecked={isSel}
              />
              <div className="area-top">
                <div className="area-ico">{a.icon}</div>
                {isPre && (
                  <span className="conf-badge conf-medium" style={{ fontSize: 9 }}>
                    branchentypisch
                  </span>
                )}
              </div>
              <div className="area-title">{a.name}</div>
              <div className="area-text">{a.hint}</div>
            </label>
          );
        })}
      </div>

      <div style={{ marginTop: 18, display: 'flex', justifyContent: 'space-between' }}>
        <a className="btn btn-secondary" href={`/app/wizard/${assessmentId}/2`}>‹ Zurück</a>
        <SubmitButton pendingLabel="Speichere …">Weiter ›</SubmitButton>
      </div>
    </form>
  );
}
