import Link from 'next/link';
import { QuotaCard } from '@/components/dashboard/QuotaCard';
import { AssessmentList } from '@/components/dashboard/AssessmentList';
import { getCurrentQuota } from '@/lib/quota/server';
import { getMyAssessmentCounts, listMyAssessments } from '@/lib/assessments/server';
import { getCurrentProfile } from '@/lib/profile/server';

export default async function DashboardPage() {
  const [ctx, quota, counts, items] = await Promise.all([
    getCurrentProfile(),
    getCurrentQuota(),
    getMyAssessmentCounts(),
    listMyAssessments()
  ]);

  const firstName = ctx?.profile?.company_name?.split(/\s+/)[0] ?? 'gut';

  return (
    <main className="content">
      <div className="alert-banner">
        <span className="alert-banner-icon">⚠️</span>
        <div className="alert-banner-text">
          <strong>Hinweis:</strong> Die KI-Gefährdungsbeurteilung erzeugt{' '}
          <strong>strukturierte Entwürfe</strong> auf Basis geprüfter DGUV- und
          BG-Quellen. Fachliche Prüfung und finale Freigabe verbleiben beim
          Arbeitgeber bzw. der verantwortlichen Person.
        </div>
      </div>

      <div className="content-head">
        <div>
          <h1>Hallo, {firstName}!</h1>
          <p>Hier ist der Stand deiner Gefährdungsbeurteilungen.</p>
        </div>
        <Link href="/app/assessments/new" className="btn btn-primary btn-lg">
          ＋ Neue Beurteilung starten
        </Link>
      </div>

      <QuotaCard quota={quota} />

      <section className="trust-strip" aria-label="Vertrauenssäulen">
        <div className="trust-pillar">
          <div className="pillar-ico">🛡️</div>
          <div>
            <div className="pillar-label">BG-orientiert</div>
            <div className="pillar-sub">DGUV / BG / ASR</div>
          </div>
        </div>
        <div className="trust-pillar">
          <div className="pillar-ico">📚</div>
          <div>
            <div className="pillar-label">Quellenbasiert</div>
            <div className="pillar-sub">≥ 2 Belege pro Maßnahme</div>
          </div>
        </div>
        <div className="trust-pillar">
          <div className="pillar-ico">🔍</div>
          <div>
            <div className="pillar-label">Audit-Trail</div>
            <div className="pillar-sub">Modell · Prompt · Hashes</div>
          </div>
        </div>
        <div className="trust-pillar">
          <div className="pillar-ico">🔒</div>
          <div>
            <div className="pillar-label">DSGVO-EU</div>
            <div className="pillar-sub">Hosting Frankfurt</div>
          </div>
        </div>
      </section>

      <section className="kpi-grid">
        <div className="kpi-card k-blue">
          <div className="kpi-label">Beurteilungen gesamt</div>
          <div className="kpi-value">{counts.total}</div>
          <div className="kpi-sub">in deinem Account</div>
          <div className="kpi-icon">🧠</div>
        </div>
        <div className="kpi-card k-amber">
          <div className="kpi-label">In Bearbeitung</div>
          <div className="kpi-value">{counts.draft + counts.in_review}</div>
          <div className="kpi-sub">Schritte ausstehend</div>
          <div className="kpi-icon">⏱️</div>
        </div>
        <div className="kpi-card k-green">
          <div className="kpi-label">Freigegeben</div>
          <div className="kpi-value">{counts.released}</div>
          <div className="kpi-sub">aktive Versionen</div>
          <div className="kpi-icon">✅</div>
        </div>
        <div className="kpi-card k-red">
          <div className="kpi-label">Archiviert</div>
          <div className="kpi-value">{counts.archived}</div>
          <div className="kpi-sub">in deinem Verlauf</div>
          <div className="kpi-icon">🗄️</div>
        </div>
      </section>

      <section className="list-card" style={{ marginBottom: '1.5rem' }}>
        <div className="list-head">
          <span>Deine Beurteilungen</span>
          <span>Status</span>
          <span>Version</span>
          <span>Geändert</span>
          <span />
        </div>
        <AssessmentList
          items={items.slice(0, 5)}
          emptyAction={
            <Link href="/app/assessments/new" className="btn btn-primary btn-lg">
              ＋ Erste Beurteilung starten
            </Link>
          }
        />
      </section>
    </main>
  );
}
