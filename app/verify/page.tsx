import Link from 'next/link';
import { PublicShell } from '@/components/shell/PublicShell';

/**
 * Verify-Page mit drei Zuständen (rein visuell, Server Component):
 *   /verify              → Pending (Mail wurde gesendet)
 *   /verify?token=demo   → Confirmed (Bestätigung erfolgreich)
 *   /verify?token=*      → Failed (Token ungültig)
 *
 * Echte Token-Verifizierung folgt in 2B.4 (Supabase exchangeCodeForSession +
 * ggf. jose für eigene signierte Token-Flows).
 */
export default function VerifyPage({
  searchParams
}: {
  searchParams: { token?: string; error?: string };
}) {
  const state = searchParams.error
    ? 'failed'
    : !searchParams.token
    ? 'pending'
    : searchParams.token === 'demo'
    ? 'confirmed'
    : 'failed';

  return (
    <PublicShell>
      <div className="auth-card" style={{ textAlign: 'center' }}>
        {state === 'pending' && (
          <>
            <h1>Bestätige deine E-Mail</h1>
            <p className="auth-sub" style={{ marginBottom: 20 }}>
              Wir haben einen Bestätigungs-Link an deine Adresse gesendet.
              Klicke auf den Link, um deinen Account zu aktivieren.
            </p>
            <Link
              href="/verify?token=demo"
              className="btn btn-primary btn-block btn-lg"
            >
              🔗 Demo-Bestätigungslink öffnen
            </Link>
            <div className="auth-foot">
              Falsche E-Mail? <Link href="/register">Erneut registrieren</Link>
            </div>
          </>
        )}

        {state === 'confirmed' && (
          <>
            <h1>Account bestätigt</h1>
            <p className="auth-sub" style={{ marginBottom: 20 }}>
              Dein Account ist aktiv. Im nächsten Schritt erfassen wir dein
              Unternehmensprofil (4 Felder, &lt; 30 Sekunden).
            </p>
            <Link
              href="/app/dashboard"
              className="btn btn-primary btn-block btn-lg"
            >
              Weiter →
            </Link>
            <div className="note" style={{ marginTop: 12 }}>
              Schritt 2B.3 — Onboarding-Flow folgt in Schritt 2B.5.
            </div>
          </>
        )}

        {state === 'failed' && (
          <>
            <h1>Link ungültig oder abgelaufen</h1>
            <p className="auth-sub" style={{ marginBottom: 20 }}>
              Der Bestätigungs-Link wurde nicht gefunden oder ist abgelaufen.
              Bitte fordere eine neue Bestätigungs-Mail an.
            </p>
            <Link
              href="/register"
              className="btn btn-primary btn-block btn-lg"
            >
              Erneut registrieren
            </Link>
          </>
        )}
      </div>
    </PublicShell>
  );
}
