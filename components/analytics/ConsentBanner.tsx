'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { setConsent } from '@/lib/analytics/client';

/**
 * Schlanker Cookie-Banner — slide-up unten, NICHT modal.
 * 60-Sekunden-Doktrin: darf den ersten Eindruck nicht killen.
 *
 * Default = denied. Bei Accept: Consent-Update + Page-Reload (damit
 * Meta-Pixel nachgeladen wird; GA aktualisiert sich via gtag).
 */
export function ConsentBanner() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem('ra-consent');
      setShow(stored !== 'granted' && stored !== 'denied');
    } catch {
      setShow(true);
    }
  }, []);

  if (!show) return null;

  const accept = () => {
    setConsent('granted');
    setShow(false);
    // Reload damit Meta-Pixel-Component die Consent-Änderung sieht
    setTimeout(() => window.location.reload(), 100);
  };
  const reject = () => {
    setConsent('denied');
    setShow(false);
  };

  return (
    <div
      role="dialog"
      aria-label="Cookie-Einstellungen"
      style={{
        position: 'fixed',
        bottom: 16,
        left: 16,
        right: 16,
        maxWidth: 720,
        margin: '0 auto',
        background: '#fff',
        border: '1px solid var(--border)',
        borderRadius: 'var(--r-lg)',
        boxShadow: 'var(--shadow-3)',
        padding: '14px 18px',
        zIndex: 100,
        display: 'flex',
        gap: 14,
        alignItems: 'center',
        flexWrap: 'wrap',
        fontSize: 13.5,
        color: 'var(--text-2)',
        lineHeight: 1.45
      }}
    >
      <span style={{ fontSize: 20 }}>🍪</span>
      <div style={{ flex: 1, minWidth: 240 }}>
        <strong style={{ color: 'var(--text-1)' }}>Cookies &amp; Tracking.</strong>{' '}
        Wir nutzen Google Analytics &amp; Meta Pixel, um die App zu verbessern
        und passende Anzeigen auszuspielen. Du kannst frei wählen.{' '}
        <Link href="/datenschutz" style={{ color: 'var(--petrol)', fontWeight: 600 }}>
          Mehr erfahren
        </Link>
      </div>
      <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
        <button
          type="button"
          className="btn btn-ghost btn-sm"
          onClick={reject}
        >
          Nur notwendige
        </button>
        <button
          type="button"
          className="btn btn-primary btn-sm"
          onClick={accept}
        >
          Akzeptieren
        </button>
      </div>
    </div>
  );
}
