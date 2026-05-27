import type { Metadata } from 'next';
import { DM_Sans, DM_Mono } from 'next/font/google';
import { Suspense } from 'react';
import './globals.css';
import { GoogleAnalytics } from '@/components/analytics/GoogleAnalytics';
import { MetaPixel } from '@/components/analytics/MetaPixel';
import { ConsentBanner } from '@/components/analytics/ConsentBanner';

const dmSans = DM_Sans({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-sans',
  display: 'swap'
});

const dmMono = DM_Mono({
  subsets: ['latin'],
  weight: ['400', '500'],
  variable: '--font-mono',
  display: 'swap'
});

export const metadata: Metadata = {
  title: {
    default: 'SU24 — Strukturierte Gefährdungsbeurteilung',
    template: '%s · SU24'
  },
  description:
    'Revisionssichere Gefährdungsbeurteilung nach ArbSchG §5 & §6. ' +
    'Strukturierte Ableitung aus dokumentierten Tätigkeiten gegen einen ' +
    'geprüften DGUV-/BG-/ASR-Quellenkatalog. Reproduzierbar, auditierbar, ' +
    'kryptografisch eingefroren.',
  applicationName: 'sicherheitsunterweisung24.de',
  icons: {
    icon: '/favicon.png',
    apple: '/favicon.png'
  },
  robots: { index: false, follow: false }
};

export default function RootLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="de" className={`${dmSans.variable} ${dmMono.variable}`}>
      <head>
        <GoogleAnalytics />
      </head>
      <body>
        {children}
        <Suspense fallback={null}>
          <MetaPixel />
        </Suspense>
        <ConsentBanner />
      </body>
    </html>
  );
}
