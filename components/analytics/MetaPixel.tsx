'use client';

import Script from 'next/script';
import { useEffect, useState } from 'react';

/**
 * Meta Pixel — wird NUR nach Consent geladen.
 * ENV: NEXT_PUBLIC_META_PIXEL_ID — fehlt → kein Render.
 */
export function MetaPixel() {
  const id = process.env.NEXT_PUBLIC_META_PIXEL_ID;
  const [consent, setConsent] = useState(false);

  useEffect(() => {
    try {
      setConsent(window.localStorage.getItem('ra-consent') === 'granted');
    } catch {
      /* ignore */
    }
    // Listen for storage events (Consent in anderem Tab geändert)
    const handler = () => {
      try {
        setConsent(window.localStorage.getItem('ra-consent') === 'granted');
      } catch {
        /* ignore */
      }
    };
    window.addEventListener('storage', handler);
    return () => window.removeEventListener('storage', handler);
  }, []);

  if (!id || !consent) return null;

  return (
    <>
      <Script id="meta-pixel" strategy="afterInteractive">
        {`
          !function(f,b,e,v,n,t,s)
          {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
          n.callMethod.apply(n,arguments):n.queue.push(arguments)};
          if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
          n.queue=[];t=b.createElement(e);t.async=!0;
          t.src=v;s=b.getElementsByTagName(e)[0];
          s.parentNode.insertBefore(t,s)}(window, document,'script',
          'https://connect.facebook.net/en_US/fbevents.js');
          fbq('init', '${id}');
          fbq('track', 'PageView');
        `}
      </Script>
      <noscript>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          height="1"
          width="1"
          style={{ display: 'none' }}
          src={`https://www.facebook.com/tr?id=${id}&ev=PageView&noscript=1`}
          alt=""
        />
      </noscript>
    </>
  );
}
