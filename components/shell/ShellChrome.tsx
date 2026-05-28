'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, type ReactNode } from 'react';
import { BrandMark } from '@/components/brand/BrandMark';

/**
 * Customer-Shell-Chrome (Sidebar + Topbar + Mobile-Toggle).
 * Bewusst EINE Client-Komponente — vermeidet Context/Store für
 * den geteilten Mobile-Toggle-State zwischen Sidebar und Topbar-Burger.
 *
 * Nav-Items sind statisch (kein konfigurierbares Nav-System).
 * Active-Markierung via usePathname (Pfad-Präfix-Match).
 * AccountPill wird als Slot übergeben — kann eine Server Component sein.
 */
type NavItem = { href: string; label: string; icon: string; badge?: string };

const NAV_PRIMARY: NavItem[] = [
  { href: '/app/dashboard', label: 'Dashboard',         icon: '📊' },
  { href: '/app/bundles',   label: 'Compliance-Mappen', icon: '📁' }
];

const NAV_ACCOUNT: NavItem[] = [
  { href: '/app/account', label: 'Account',       icon: '👤' },
  { href: '/app/upgrade', label: 'Plan upgraden', icon: '⭐' }
];

export function ShellChrome({
  children,
  accountPill,
  title
}: {
  children: ReactNode;
  accountPill: ReactNode;
  title: string;
}) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(href + '/');

  return (
    <div className="layout">
      <nav className={`sidebar ${menuOpen ? 'is-open' : ''}`}>
        <Link href="/app/dashboard" className="sidebar-logo" aria-label="Zum Dashboard">
          <div className="sidebar-logo-row">
            <BrandMark variant="mark" size="md" priority />
            <div className="sidebar-logo-text">
              <div className="sidebar-logo-name">SU24</div>
              <div className="sidebar-logo-sub">Gefährdungsbeurteilung</div>
            </div>
          </div>
        </Link>

        <div className="sidebar-nav">
          <div className="nav-section">Mein Bereich</div>
          {NAV_PRIMARY.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`nav-item ${isActive(item.href) ? 'active' : ''}`}
              onClick={() => setMenuOpen(false)}
            >
              <span className="nav-icon">{item.icon}</span>
              <span>{item.label}</span>
              {item.badge ? <span className="nav-badge">{item.badge}</span> : null}
            </Link>
          ))}

          <div className="nav-section">Konto</div>
          {NAV_ACCOUNT.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`nav-item ${isActive(item.href) ? 'active' : ''}`}
              onClick={() => setMenuOpen(false)}
            >
              <span className="nav-icon">{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          ))}

          <div className="nav-section">Sitzung</div>
          <form action="/api/auth/logout" method="post">
            <button type="submit" className="nav-item">
              <span className="nav-icon">🚪</span>
              <span>Abmelden</span>
            </button>
          </form>
        </div>

        <div className="sidebar-footer">{accountPill}</div>
      </nav>

      {menuOpen ? (
        <div className="mobile-backdrop" onClick={() => setMenuOpen(false)} />
      ) : null}

      <div className="main">
        <header className="topbar">
          <div className="topbar-left">
            <button
              className="menu-toggle"
              onClick={() => setMenuOpen((o) => !o)}
              aria-label="Menü"
            >
              ☰
            </button>
            <div className="topbar-title">{title}</div>
          </div>
          <div className="topbar-right">
            <span className="last-sync">
              <span className="status-dot" />
              Eingeloggt
            </span>
          </div>
        </header>

        {children}
      </div>
    </div>
  );
}
