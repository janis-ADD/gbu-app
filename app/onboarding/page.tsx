import { redirect } from 'next/navigation';
import { Suspense } from 'react';
import { PublicShell } from '@/components/shell/PublicShell';
import { OnboardingForm } from '@/components/onboarding/OnboardingForm';
import { EventTrigger } from '@/components/analytics/EventTrigger';
import { getCurrentProfile, isOnboarded } from '@/lib/profile/server';

export default async function OnboardingPage() {
  const ctx = await getCurrentProfile();
  if (!ctx) redirect('/login');
  if (isOnboarded(ctx.profile)) redirect('/app/dashboard');

  return (
    <PublicShell>
      <Suspense fallback={null}>
        <EventTrigger />
      </Suspense>
      <div
        className="auth-card"
        style={{ maxWidth: 540 }}
      >
        <span
          className="plan-badge plan-badge--basic"
          style={{ marginBottom: 8, display: 'inline-block' }}
        >
          Schritt 1 von 1 · &lt; 30 Sekunden
        </span>
        <h1>Willkommen bei SU24!</h1>
        <p className="auth-sub" style={{ marginBottom: 16 }}>
          Damit die KI deine Gefährdungsbeurteilung passend vorbereiten kann,
          brauchen wir vier kurze Angaben zu deinem Unternehmen.
        </p>

        <div className="alert-banner is-info" style={{ marginBottom: 16 }}>
          <span className="alert-banner-icon">ℹ️</span>
          <div className="alert-banner-text" style={{ fontSize: 13 }}>
            Bitte <strong>keine Personennamen</strong> eintragen — nur die
            Rolle (z. B. „Geschäftsführung"). Detailangaben zu Standort,
            Bereichen und Tätigkeiten folgen im Wizard.
          </div>
        </div>

        <OnboardingForm />
      </div>
    </PublicShell>
  );
}
