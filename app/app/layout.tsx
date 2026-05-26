import { redirect } from 'next/navigation';
import { Suspense } from 'react';
import { ShellChrome } from '@/components/shell/ShellChrome';
import { AccountPill } from '@/components/shell/AccountPill';
import { EventTrigger } from '@/components/analytics/EventTrigger';
import { getCurrentProfile, isOnboarded } from '@/lib/profile/server';

/**
 * Layout für alle eingeloggten Customer-Routen unter /app/*.
 *
 * Reihenfolge der Gates:
 *  1. Auth-Gate (Middleware) — anonyme Requests werden vorher umgeleitet
 *  2. Profil-Check (hier) — wenn User vorhanden, aber kein
 *     onboarding_completed_at gesetzt: → /onboarding
 *
 * Wenn keine Supabase-ENV gesetzt ist, fällt getCurrentProfile() auf null
 * zurück; in dem Fall vertrauen wir der Middleware und rendern die Shell.
 */
export default async function AppLayout({
  children
}: {
  children: React.ReactNode;
}) {
  const ctx = await getCurrentProfile();

  // Onboarding-Gate: nur wenn wir wirklich einen Profile-Datensatz haben,
  // der unvollständig ist. ctx === null = kein DB-Zugriff (siehe oben).
  if (ctx && ctx.profile && !isOnboarded(ctx.profile)) {
    redirect('/onboarding');
  }

  return (
    <ShellChrome title="Mein Bereich" accountPill={<AccountPill />}>
      <Suspense fallback={null}>
        <EventTrigger />
      </Suspense>
      {children}
    </ShellChrome>
  );
}
