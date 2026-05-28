import Link from 'next/link';
import { BrandMark } from '@/components/brand/BrandMark';

/**
 * Public-Landingpage — minimaler Vertrauens-Anker bis die Marketing-LP
 * über sicherheitsunterweisung24.de eingebunden wird.
 */
export default function HomePage() {
  return (
    <div className="public-shell">
      <header className="public-topbar">
        <Link href="/" aria-label="Zur Startseite" style={{ textDecoration: 'none', display: 'inline-flex' }}>
          <BrandMark variant="wordmark" size="md" priority />
        </Link>
        <nav>
          <Link href="/login" className="btn btn-secondary btn-sm">Anmelden</Link>
          <Link href="/register" className="btn btn-primary btn-sm" style={{ marginLeft: 8 }}>
            Konto anlegen
          </Link>
        </nav>
      </header>

      <main className="public-main">
        <div className="auth-card" style={{ maxWidth: 560 }}>
          <h1 style={{ marginBottom: 8 }}>Gefährdungsbeurteilung. Strukturiert.</h1>
          <p className="auth-sub">
            Erstellen Sie revisionssichere, fachlich nachvollziehbare Gefährdungsbeurteilungen
            nach ArbSchG §5 &amp; §6 — auf Basis kuratierter DGUV-, BG- und ASR-Quellen.
            Jede Freigabe wird kryptografisch eingefroren und ist für Audit-Zwecke
            uneingeschränkt reproduzierbar.
          </p>

          <div className="trust-banner" style={{ margin: '8px 0 16px' }}>
            <span className="trust-shield">🛡️</span>
            <div className="trust-banner-body">
              <div className="trust-banner-title">Reproduzierbar &amp; auditierbar</div>
              <div className="trust-banner-text">
                Strukturierte Ableitung aus dokumentierten Tätigkeitsangaben gegen einen
                geprüften Quellenkatalog. Keine Blackbox — jede Empfehlung ist sichtbar
                begründet.
              </div>
            </div>
          </div>

          <div className="trust-strip" style={{ marginBottom: 0 }}>
            <div className="trust-pillar">
              <div className="pillar-ico">🛡️</div>
              <div>
                <div className="pillar-label">BG-orientiert</div>
                <div className="pillar-sub">DGUV · BG · ASR</div>
              </div>
            </div>
            <div className="trust-pillar">
              <div className="pillar-ico">📚</div>
              <div>
                <div className="pillar-label">Quellenbasiert</div>
                <div className="pillar-sub">≥ 2 Belege je Maßnahme</div>
              </div>
            </div>
            <div className="trust-pillar">
              <div className="pillar-ico">🔍</div>
              <div>
                <div className="pillar-label">Audit-Trail</div>
                <div className="pillar-sub">vollständig &amp; unveränderlich</div>
              </div>
            </div>
            <div className="trust-pillar">
              <div className="pillar-ico">🔒</div>
              <div>
                <div className="pillar-label">DSGVO · EU</div>
                <div className="pillar-sub">Hosting Frankfurt</div>
              </div>
            </div>
          </div>

          <div className="auth-foot">
            Bereits Konto vorhanden? <Link href="/login">Anmelden</Link>
          </div>
        </div>
      </main>

      <footer className="public-foot">
        © {new Date().getFullYear()} sicherheitsunterweisung24.de · Gefährdungsbeurteilung nach ArbSchG §5 / §6
      </footer>
    </div>
  );
}
