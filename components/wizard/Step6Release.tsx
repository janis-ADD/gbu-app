'use client';

import { useFormState } from 'react-dom';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { releaseAssessmentAction } from '@/app/actions/wizard';
import { RELEASE_INITIAL } from '@/lib/forms/states';
import { SubmitButton } from '@/components/auth/SubmitButton';

export function Step6Release({
  assessmentId,
  alreadyReleased,
  currentVersion
}: {
  assessmentId: string;
  alreadyReleased: boolean;
  currentVersion: number;
}) {
  const router = useRouter();
  const [state, formAction] = useFormState(
    releaseAssessmentAction.bind(null, assessmentId),
    RELEASE_INITIAL
  );

  useEffect(() => {
    if (state.kind === 'success') {
      router.push(
        `/app/version/${assessmentId}/${state.versionNumber}?ev=assessment_release&v=${state.versionNumber}`
      );
    }
  }, [state, router, assessmentId]);

  if (alreadyReleased) {
    return (
      <div className="alert-banner is-success">
        <span className="alert-banner-icon">✅</span>
        <div className="alert-banner-text">
          <strong>Diese Beurteilung wurde bereits freigegeben (v{currentVersion}).</strong>{' '}
          <a
            href={`/app/version/${assessmentId}/${currentVersion}`}
            style={{ color: 'var(--green)', fontWeight: 650, textDecoration: 'underline' }}
          >
            Version öffnen →
          </a>
        </div>
      </div>
    );
  }

  return (
    <form action={formAction}>
      {state.kind === 'error' && (
        <div className="alert-banner is-error">
          <span className="alert-banner-icon">⛔</span>
          <div className="alert-banner-text">{state.message}</div>
        </div>
      )}

      {state.kind === 'paywall' && (
        <div className="alert-banner is-error" style={{ marginBottom: 16 }}>
          <span className="alert-banner-icon">🔒</span>
          <div className="alert-banner-text">
            <strong>Dein Free-Limit ist erreicht.</strong> Im Free-Plan ist
            1 freigegebene Beurteilung enthalten. Für weitere Releases ist ein
            Upgrade nötig.
            <a className="btn btn-primary btn-sm" style={{ marginLeft: 12 }} href="/app/upgrade">
              Jetzt upgraden
            </a>
          </div>
        </div>
      )}

      <div className="confirm-box">
        <label>
          <input type="checkbox" name="disclaimer_ack" required />
          <span>
            Ich bestätige, dass die Angaben nach bestem Wissen geprüft wurden
            und die Gefährdungsbeurteilung vor Verwendung intern fachlich
            freigegeben wird. Die KI-/Catalog-Vorschläge sind ein{' '}
            <strong>Entwurf</strong> und ersetzen keine Fachkraft für
            Arbeitssicherheit.
          </span>
        </label>
        <div style={{ marginTop: 16, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <SubmitButton pendingLabel="Wird freigegeben …">
            ✅ Version freigeben &amp; Snapshot erzeugen
          </SubmitButton>
          <a className="btn btn-secondary" href={`/app/wizard/${assessmentId}/5`}>
            ‹ Zurück
          </a>
        </div>
      </div>
    </form>
  );
}
