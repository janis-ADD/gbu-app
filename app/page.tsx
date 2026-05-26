import Link from 'next/link';

/**
 * Phase-3 Schritt 1 — Placeholder-Landing.
 * Bestätigt visuell, dass Tokens + Fonts + Atome aus dem Mockup funktionieren.
 * Wird in Schritt 2 (Auth) durch echte Public-Landing ersetzt.
 */
export default function HomePage() {
  return (
    <div className="public-shell">
      <header className="public-topbar">
        <span className="logo-badge">
          <span className="logo-icon">🛡️</span>
          SU24 · Gefährdungsbeurteilung
        </span>
        <nav>
          <Link href="/" className="btn btn-secondary btn-sm">
            Mockup-Referenz
          </Link>
        </nav>
      </header>

      <main className="public-main">
        <div className="auth-card" style={{ maxWidth: 560 }}>
          <span
            className="plan-badge plan-badge--basic"
            style={{ marginBottom: 10 }}
          >
            Phase 3 · Schritt 1 / 8
          </span>
          <h1>Fundament steht.</h1>
          <p className="auth-sub">
            Next.js 14 App-Router · TypeScript strict · Tailwind mit
            Mockup-Tokens · DM&nbsp;Sans / DM&nbsp;Mono · globale Atome aus dem
            Phase-2.5-Mockup.
          </p>

          <div className="trust-banner" style={{ margin: '8px 0 16px' }}>
            <span className="trust-shield">🛡️</span>
            <div className="trust-banner-body">
              <div className="trust-banner-title">Vertrauens-Doktrin aktiv</div>
              <div className="trust-banner-text">
                Source-Chips, Confidence-Badges, Safety-Hints und
                Trust-Banner sind als wiederverwendbare CSS-Atome verfügbar
                — werden ab Schritt 4 (Wizard) verwendet.
                <span className="human-loop-note">
                  KI unterstützt — Mensch prüft
                </span>
              </div>
            </div>
          </div>

          <div className="trust-strip" style={{ marginBottom: 0 }}>
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
                <div className="pillar-sub">≥ 2 Belege</div>
              </div>
            </div>
            <div className="trust-pillar">
              <div className="pillar-ico">🔍</div>
              <div>
                <div className="pillar-label">Audit-Trail</div>
                <div className="pillar-sub">vollständig</div>
              </div>
            </div>
            <div className="trust-pillar">
              <div className="pillar-ico">🔒</div>
              <div>
                <div className="pillar-label">DSGVO-EU</div>
                <div className="pillar-sub">Frankfurt</div>
              </div>
            </div>
          </div>

          <div className="auth-foot">
            Nächster Schritt: Supabase-Auth-Setup + Customer-Shell.
          </div>
        </div>
      </main>

      <footer className="public-foot">
        © SU24 — Prototyp · keine produktive Nutzung
      </footer>
    </div>
  );
}
