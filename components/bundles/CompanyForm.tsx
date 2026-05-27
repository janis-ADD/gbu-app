'use client';

import { useFormState } from 'react-dom';
import { saveBundleCompany } from '@/app/actions/bundles';
import { BUNDLE_SETUP_INITIAL, type AuthState } from '@/lib/forms/states';
import { GERMAN_STATES, type CompanyProfile } from '@/lib/db/types';
import { INDUSTRIES } from '@/lib/wizard/industries';
import { SubmitButton } from '@/components/auth/SubmitButton';
import { FormFeedback } from '@/components/auth/FormFeedback';

export function CompanyForm({
  bundleId,
  initial
}: {
  bundleId: string;
  initial: CompanyProfile;
}) {
  const [state, formAction] = useFormState(
    saveBundleCompany.bind(null, bundleId),
    BUNDLE_SETUP_INITIAL
  );
  const fb: AuthState = { ok: state.ok, error: state.error };

  return (
    <form action={formAction}>
      <FormFeedback state={fb} />
      <div className="field-grid">
        <div className="field">
          <label>Firmenname <span className="req">*</span></label>
          <input name="company_name" required defaultValue={initial.company_name ?? ''} />
        </div>
        <div className="field">
          <label>Branche <span className="req">*</span></label>
          <select name="industry" required defaultValue={initial.industry ?? ''}>
            <option value="" disabled>— wählen —</option>
            {INDUSTRIES.map((i) => <option key={i.value} value={i.value}>{i.label}</option>)}
          </select>
        </div>
        <div className="field">
          <label>Mitarbeitende <span className="req">*</span></label>
          <select name="employee_bucket" required defaultValue={initial.employee_bucket ?? ''}>
            <option value="" disabled>— wählen —</option>
            <option value="1">1 (Solo)</option>
            <option value="2-5">2 – 5</option>
            <option value="6-20">6 – 20</option>
            <option value="21-50">21 – 50</option>
            <option value="51-250">51 – 250</option>
            <option value="250+">über 250</option>
          </select>
        </div>
        <div className="field">
          <label>Bundesland <span className="req">*</span></label>
          <select name="state" required defaultValue={initial.state ?? ''}>
            <option value="" disabled>— wählen —</option>
            {GERMAN_STATES.map((s) => <option key={s.code} value={s.code}>{s.name}</option>)}
          </select>
        </div>
        <div className="field wide">
          <label>Deine Rolle <span className="req">*</span></label>
          <input
            name="role_in_company"
            required
            defaultValue={initial.role_in_company ?? ''}
            placeholder="z. B. Geschäftsführung — keine Namen"
          />
          <div className="field-hint">DSGVO: nur Rolle, keine Personennamen.</div>
        </div>
        <div className="field"><label>Straße</label><input name="street" defaultValue={initial.street ?? ''} /></div>
        <div className="field"><label>PLZ</label><input name="postal_code" defaultValue={initial.postal_code ?? ''} /></div>
        <div className="field wide"><label>Ort</label><input name="city" defaultValue={initial.city ?? ''} /></div>
        <div className="field wide">
          <label>Kurzbeschreibung des Betriebs (optional)</label>
          <textarea
            name="short_description"
            defaultValue={initial.short_description ?? ''}
            placeholder="z. B. Malerbetrieb mit kleinem Büro, Lager und 4 Transportern. Keine Personennamen."
          />
        </div>
      </div>
      <div style={{ marginTop: 18, display: 'flex', justifyContent: 'flex-end' }}>
        <SubmitButton pendingLabel="Speichere …">Weiter zur BG ›</SubmitButton>
      </div>
    </form>
  );
}
