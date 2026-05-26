'use client';

import { useFormState } from 'react-dom';
import { requestPasswordResetAction } from '@/app/actions/auth';
import { AUTH_INITIAL } from '@/lib/forms/states';
import { SubmitButton } from './SubmitButton';
import { FormFeedback } from './FormFeedback';

export function ForgotForm() {
  const [state, formAction] = useFormState(
    requestPasswordResetAction,
    AUTH_INITIAL
  );

  return (
    <form action={formAction}>
      <FormFeedback state={state} />

      <div className="field">
        <label>
          E-Mail <span className="req">*</span>
        </label>
        <input
          type="email"
          name="email"
          required
          placeholder="dein@unternehmen.de"
          autoComplete="email"
        />
      </div>

      <SubmitButton pendingLabel="Wird gesendet …">
        Reset-Link anfordern
      </SubmitButton>
    </form>
  );
}
