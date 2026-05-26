'use client';

import Link from 'next/link';
import { useFormState } from 'react-dom';
import { signInAction } from '@/app/actions/auth';
import { AUTH_INITIAL } from '@/lib/forms/states';
import { SubmitButton } from './SubmitButton';
import { FormFeedback } from './FormFeedback';

export function SignInForm() {
  const [state, formAction] = useFormState(signInAction, AUTH_INITIAL);

  return (
    <form action={formAction}>
      <FormFeedback state={state} />

      <div className="field">
        <label>E-Mail</label>
        <input
          type="email"
          name="email"
          required
          placeholder="dein@unternehmen.de"
          autoComplete="email"
        />
      </div>
      <div className="field">
        <label>Passwort</label>
        <input
          type="password"
          name="password"
          required
          placeholder="••••••••"
          autoComplete="current-password"
        />
      </div>

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          margin: '6px 0 12px',
          fontSize: 13
        }}
      >
        <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <input type="checkbox" name="remember" defaultChecked />
          Eingeloggt bleiben
        </label>
        <Link
          href="/forgot"
          style={{ color: 'var(--petrol)', fontWeight: 600 }}
        >
          Passwort vergessen?
        </Link>
      </div>

      <SubmitButton pendingLabel="Anmelden …">Anmelden</SubmitButton>
    </form>
  );
}
