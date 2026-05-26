import Script from 'next/script';

/**
 * Lädt Google Analytics 4 mit Consent Mode v2 (default DENIED).
 * Wird IMMER eingebunden — Consent-Update passiert clientseitig via
 * lib/analytics/client.ts setConsent().
 *
 * ENV: NEXT_PUBLIC_GA_ID (z.B. "G-XXXXXXXXXX") — fehlt → kein Render.
 */
export function GoogleAnalytics() {
  const id = process.env.NEXT_PUBLIC_GA_ID;
  if (!id) return null;

  return (
    <>
      {/* Consent Mode v2 — DEFAULT DENIED */}
      <Script id="ga-consent-default" strategy="beforeInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          window.gtag = gtag;
          gtag('consent', 'default', {
            ad_storage: 'denied',
            ad_user_data: 'denied',
            ad_personalization: 'denied',
            analytics_storage: 'denied',
            wait_for_update: 500
          });
          try {
            if (window.localStorage.getItem('ra-consent') === 'granted') {
              gtag('consent', 'update', {
                ad_storage: 'granted',
                ad_user_data: 'granted',
                ad_personalization: 'granted',
                analytics_storage: 'granted'
              });
            }
          } catch (e) { /* ignore */ }
        `}
      </Script>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${id}`}
        strategy="afterInteractive"
      />
      <Script id="ga-init" strategy="afterInteractive">
        {`
          gtag('js', new Date());
          gtag('config', '${id}', {
            anonymize_ip: true,
            send_page_view: true
          });
        `}
      </Script>
    </>
  );
}
