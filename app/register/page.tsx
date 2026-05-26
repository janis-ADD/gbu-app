import Link from 'next/link';
import { PublicShell } from '@/components/shell/PublicShell';
import { SignUpForm } from '@/components/auth/SignUpForm';

export default function RegisterPage() {
  return (
    <PublicShell>
      <div className="auth-card">
        <h1>Account erstellen</h1>
        <p className="auth-sub">Kostenlos starten — keine Kreditkarte erforderlich.</p>

        <SignUpForm />

        <div className="auth-foot">
          Du hast bereits einen Account? <Link href="/login">Anmelden</Link>
        </div>
      </div>
    </PublicShell>
  );
}
