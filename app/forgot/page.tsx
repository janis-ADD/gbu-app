import Link from 'next/link';
import { PublicShell } from '@/components/shell/PublicShell';
import { ForgotForm } from '@/components/auth/ForgotForm';

export default function ForgotPage() {
  return (
    <PublicShell>
      <div className="auth-card">
        <h1>Passwort vergessen?</h1>
        <p className="auth-sub">
          Gib deine E-Mail-Adresse ein. Wir senden dir einen Link zum
          Zurücksetzen.
        </p>

        <ForgotForm />

        <div className="auth-foot">
          Doch wieder eingefallen? <Link href="/login">Zur Anmeldung</Link>
        </div>
      </div>
    </PublicShell>
  );
}
