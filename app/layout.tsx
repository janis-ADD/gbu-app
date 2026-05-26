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
  title: 'SU24 — KI-Gefährdungsbeurteilung in 60 Sekunden',
  description:
    'Konservativ, BG-/DGUV-orientiert, quellenbasiert. Strukturierte ' +
    'Entwürfe, die der Arbeitgeber fachlich freigibt — in einer Minute fertig.',
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
