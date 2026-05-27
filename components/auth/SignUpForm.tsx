'use client';

import Link from 'next/link';
import { useFormState } from 'react-dom';
import { signUpAction } from '@/app/actions/auth';
import { AUTH_INITIAL } from '@/lib/forms/states';
import { SubmitButton } from './SubmitButton';
import { FormFeedback } from './FormFeedback';

export function SignUpForm() {
  const [state, formAction] = useFormState(signUpAction, AUTH_INITIAL);

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
      <div className="field">
        <label>
          Passwort <span className="req">*</span>
        </label>
        <input
          type="password"
          name="password"
          required
          minLength={10}
          placeholder="mindestens 10 Zeichen"
          autoComplete="new-password"
        />
        <div className="field-hint">
          Mindestens 10 Zeichen, idealerweise mit Zahlen und Sonderzeichen.
        </div>
      </div>
      <div className="field">
        <label
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: 8,
            fontWeight: 500,
            color: 'var(--text-2)',
            fontSize: 13,
            lineHeight: 1.45,
            cursor: 'pointer'
          }}
        >
          <input
            type="checkbox"
            name="accept_terms"
            required
            style={{ marginTop: 3 }}
          />
          <span>
            Ich akzeptiere die{' '}
            <Link href="/" style={{ color: 'var(--petrol)', fontWeight: 600 }}>
              AGB
            </Link>{' '}
            und die{' '}
            <Link href="/" style={{ color: 'var(--petrol)', fontWeight: 600 }}>
              Datenschutzerklärung
            </Link>
            . Mir ist bekannt, dass das System strukturierte Entwürfe auf Basis
            kuratierter Quellen erzeugt und keine Fachkraft für Arbeitssicherheit
            ersetzt.
          </span>
        </label>
      </div>

      <SubmitButton pendingLabel="Account wird erstellt …">
        Account erstellen
      </SubmitButton>
    </form>
  );
}
