import type { ReactNode } from 'react';

/**
 * Minimaler Public-Wrap für die 4 Auth-Pages.
 * Keine Marketing-Landingpage — die läuft später über bestehende
 * SU24-LP-/Funnel-Systeme. Hier nur: Logo + Footer + zentrierte Card.
 */
export function PublicShell({ children }: { children: ReactNode }) {
  return (
    <div className="public-shell">
      <header className="public-topbar">
        <span className="logo-badge">
          <span className="logo-icon">🛡️</span>
          <span>SU24 · Gefährdungsbeurteilung</span>
        </span>
      </header>

      <main className="public-main">{children}</main>

      <footer className="public-foot">© SU24 · Prototyp</footer>
    </div>
  );
}
