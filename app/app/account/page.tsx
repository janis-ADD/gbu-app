import Link from 'next/link';
import { getCurrentProfile } from '@/lib/profile/server';
import { getCurrentQuota } from '@/lib/quota/server';
import { getMyAssessmentCounts } from '@/lib/assessments/server';

export default async function AccountPage() {
  const [ctx, quota, counts] = await Promise.all([
    getCurrentProfile(),
    getCurrentQuota(),
    getMyAssessmentCounts()
  ]);
  const profile = ctx?.profile;
  const email = ctx?.user.email ?? null;

  return (
    <main className="content">
      <div className="content-head">
        <div>
          <h1>Account &amp; Einstellungen</h1>
          <p>Dein Profil, Plan und Sicherheitsoptionen.</p>
        </div>
      </div>

      <section className="account-section">
        <h2>Profil</h2>
        <div className="section-sub">Wird im Onboarding erfasst — Änderungen folgen in Phase 4.</div>
        <div className="field-grid">
          <div className="field">
            <label>E-Mail</label>
            <input value={email ?? ''} disabled />
          </div>
          <div className="field">
            <label>Firma</label>
            <input value={profile?.company_name ?? ''} disabled />
          </div>
          <div className="field">
            <label>Branche</label>
            <input value={profile?.industry ?? ''} disabled />
          </div>
          <div className="field">
            <label>Mitarbeiterzahl</label>
            <input value={profile?.employee_bucket ?? ''} disabled />
          </div>
          <div className="field wide">
            <label>Verantwortliche Rolle</label>
            <input value={profile?.role_in_company ?? ''} disabled />
          </div>
        </div>
      </section>

      <section className="account-section">
        <h2>Plan &amp; Nutzung</h2>
        <div className="section-sub">Aktueller Plan und Quota-Status.</div>
        <div className="billing-summary">
          <div className="bs-card">
            <div className="bs-label">Aktueller Plan</div>
            <div className="bs-value">
              <span className={`plan-badge plan-badge--${quota?.plan_slug ?? 'free'}`}>
                {quota?.plan_name ?? 'Free'}
              </span>
            </div>
          </div>
          <div className="bs-card">
            <div className="bs-label">Releases verbraucht</div>
            <div className="bs-value">
              {quota?.is_unlimited ? `${quota.used} (unbegrenzt)` : `${quota?.used ?? 0} / ${quota?.max ?? 1}`}
            </div>
          </div>
          <div className="bs-card">
            <div className="bs-label">Beurteilungen gesamt</div>
            <div className="bs-value">{counts.total}</div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <Link href="/app/upgrade" className="btn btn-primary">
            Plan ansehen / wechseln
          </Link>
          <form action="/api/auth/logout" method="post" style={{ display: 'inline' }}>
            <button type="submit" className="btn btn-secondary">
              🚪 Abmelden
            </button>
          </form>
        </div>
      </section>

      <section className="account-section">
        <h2>Daten &amp; Datenschutz</h2>
        <div className="section-sub">Wo deine Daten leben.</div>
        <ul style={{ paddingLeft: 18, color: 'var(--text-2)', fontSize: 13.5, lineHeight: 1.7 }}>
          <li>Datenstandort: <strong>EU</strong> (Supabase Frankfurt)</li>
          <li>KI-Subprocessor: <strong>nicht aktiv im MVP</strong> (deterministische Catalog-Logik)</li>
          <li>E-Mail-Versand: <strong>Supabase Auth</strong> (Bestätigung/Reset) — produktive Mails über Resend in Phase 4</li>
          <li>Pflicht-Disclaimer auf jedem Dokument</li>
          <li>Audit-Trail für jede Generierung &amp; Freigabe (Phase 2 §8)</li>
        </ul>
      </section>

      <section className="account-section" style={{ borderColor: '#fecaca' }}>
        <h2 style={{ color: '#991b1b' }}>Account löschen</h2>
        <div className="section-sub">
          Soft-Delete sofort, Hard-Delete nach 30 Tagen (Lösch-Konzept §10).
        </div>
        <button className="btn btn-danger" disabled>
          Account dauerhaft löschen (folgt in Phase 4)
        </button>
      </section>
    </main>
  );
}
