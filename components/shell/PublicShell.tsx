import type { ReactNode } from 'react';
import Link from 'next/link';
import { BrandMark } from '@/components/brand/BrandMark';

/**
 * Minimaler Public-Wrap für Auth- und Onboarding-Pages.
 * Echtes Wort-Bild-Logo im Header, ruhiger Footer.
 */
export function PublicShell({ children }: { children: ReactNode }) {
  return (
    <div className="public-shell">
      <header className="public-topbar">
        <Link href="/" aria-label="Zur Startseite" style={{ textDecoration: 'none', display: 'inline-flex' }}>
          <BrandMark variant="wordmark" size="md" priority />
        </Link>
      </header>

      <main className="public-main">{children}</main>

      <footer className="public-foot">
        © {new Date().getFullYear()} sicherheitsunterweisung24.de · Gefährdungsbeurteilung nach ArbSchG §5 / §6
      </footer>
    </div>
  );
}
