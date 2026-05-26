import Link from 'next/link';
import { PublicShell } from '@/components/shell/PublicShell';
import { SignInForm } from '@/components/auth/SignInForm';

export default function LoginPage() {
  return (
    <PublicShell>
      <div className="auth-card">
        <h1>Willkommen zurück</h1>
        <p className="auth-sub">
          Melde dich an, um deine Gefährdungsbeurteilungen fortzusetzen.
        </p>

        <SignInForm />

        <div className="auth-foot">
          Noch kein Account? <Link href="/register">Jetzt registrieren</Link>
        </div>
      </div>
    </PublicShell>
  );
}
