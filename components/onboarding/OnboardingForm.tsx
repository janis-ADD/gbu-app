'use client';

import { useFormState } from 'react-dom';
import { completeOnboardingAction } from '@/app/actions/onboarding';
import { ONBOARDING_INITIAL } from '@/lib/forms/states';
import { INDUSTRIES } from '@/lib/wizard/industries';
import { SubmitButton } from '@/components/auth/SubmitButton';
import { FormFeedback } from '@/components/auth/FormFeedback';

export function OnboardingForm() {
  const [state, formAction] = useFormState(
    completeOnboardingAction,
    ONBOARDING_INITIAL
  );

  return (
    <form action={formAction}>
      <FormFeedback state={state} />

      <div className="field">
        <label>
          Firmenname <span className="req">*</span>
        </label>
        <input
          name="company_name"
          required
          autoFocus
          placeholder="z. B. Muster Malermeister GmbH"
        />
      </div>

      <div className="field">
        <label>
          Branche <span className="req">*</span>
        </label>
        <select name="industry" required defaultValue="">
          <option value="" disabled>— Branche wählen —</option>
          {INDUSTRIES.map((i) => (
            <option key={i.value} value={i.value}>
              {i.label}
            </option>
          ))}
        </select>
        <div className="field-hint">
          Auf dieser Basis schlagen wir BG-Kandidaten und typische Arbeitsbereiche vor.
        </div>
      </div>

      <div style={{ marginTop: 12 }}>
        <SubmitButton pendingLabel="Wird gespeichert …">
          Loslegen →
        </SubmitButton>
      </div>

      <div className="note" style={{ marginTop: 14, fontSize: 12 }}>
        💡 Weitere Angaben (Bundesland, Mitarbeiterzahl, Rolle) fragen wir
        direkt im Wizard ab — mit sinnvollen Defaults.
      </div>
    </form>
  );
}
