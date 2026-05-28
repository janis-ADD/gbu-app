import { BundleList } from '@/components/bundles/BundleList';
import { listMyBundles, getMyBundleCounts } from '@/lib/bundles/server';
import { getCurrentProfile } from '@/lib/profile/server';
import { createBundleAction } from '@/app/actions/bundles';

export default async function DashboardPage() {
  const [ctx, counts, bundles] = await Promise.all([
    getCurrentProfile(),
    getMyBundleCounts(),
    listMyBundles()
  ]);

  const firstName = ctx?.profile?.company_name?.split(/\s+/)[0] ?? 'gut';

  return (
    <main className="content">
      <div className="alert-banner">
        <span className="alert-banner-icon">⚠️</span>
        <div className="alert-banner-text">
          <strong>Hinweis:</strong> Diese App erzeugt <strong>strukturierte
          Entwürfe</strong> für tätigkeitsbezogene Gefährdungsbeurteilungen
          (ArbSchG §5 &amp; §6). Fachliche Prüfung und Freigabe verbleiben beim
          Arbeitgeber bzw. der verantwortlichen Person.
        </div>
      </div>

      <div className="content-head">
        <div>
          <h1>Hallo, {firstName}!</h1>
          <p>Deine Compliance-Mappen — eine pro Betrieb-Snapshot.</p>
        </div>
        <form action={createBundleAction}>
          <button type="submit" className="btn btn-primary btn-lg">
            ＋ Neue Compliance-Mappe
          </button>
        </form>
      </div>

      <section className="trust-strip" aria-label="Vertrauenssäulen">
        <div className="trust-pillar"><div className="pillar-ico">🛡️</div><div><div className="pillar-label">BG-orientiert</div><div className="pillar-sub">DGUV / BG / ASR</div></div></div>
        <div className="trust-pillar"><div className="pillar-ico">📚</div><div><div className="pillar-label">Quellenbasiert</div><div className="pillar-sub">≥ 2 Belege pro Maßnahme</div></div></div>
        <div className="trust-pillar"><div className="pillar-ico">🔍</div><div><div className="pillar-label">Audit-Trail</div><div className="pillar-sub">Modell · Prompt · Hashes</div></div></div>
        <div className="trust-pillar"><div className="pillar-ico">🔒</div><div><div className="pillar-label">DSGVO-EU</div><div className="pillar-sub">Hosting Frankfurt</div></div></div>
      </section>

      <section className="kpi-grid">
        <div className="kpi-card k-blue">
          <div className="kpi-label">Compliance-Mappen</div>
          <div className="kpi-value">{counts.total}</div>
          <div className="kpi-sub">in deinem Account</div>
          <div className="kpi-icon">🧠</div>
        </div>
        <div className="kpi-card k-amber">
          <div className="kpi-label">Im Setup</div>
          <div className="kpi-value">{counts.in_setup}</div>
          <div className="kpi-sub">noch nicht konfiguriert</div>
          <div className="kpi-icon">⚙️</div>
        </div>
        <div className="kpi-card k-green">
          <div className="kpi-label">Aktive Mappen</div>
          <div className="kpi-value">{counts.active}</div>
          <div className="kpi-sub">mit GBUs</div>
          <div className="kpi-icon">✅</div>
        </div>
        <div className="kpi-card k-red">
          <div className="kpi-label">Archiviert</div>
          <div className="kpi-value">{counts.archived}</div>
          <div className="kpi-sub">Verlauf</div>
          <div className="kpi-icon">🗄️</div>
        </div>
      </section>

      <section className="list-card" style={{ marginBottom: '1.5rem' }}>
        <div className="list-head">
          <span>Mappe</span>
          <span>Status</span>
          <span />
          <span>Geändert</span>
          <span />
        </div>
        <BundleList
          items={bundles.slice(0, 5)}
          emptyAction={
            <form action={createBundleAction}>
              <button type="submit" className="btn btn-primary btn-lg">
                ＋ Erste Mappe anlegen
              </button>
            </form>
          }
        />
      </section>
    </main>
  );
}
