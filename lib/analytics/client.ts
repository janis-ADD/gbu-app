/**
 * Client-side Analytics-Helper.
 *
 * Strategie:
 *  - Consent Mode v2 (Google) — default DENIED, erst nach Cookie-Accept
 *    werden gtag/fbq aktiviert.
 *  - Standard-Events: page_view (auto via gtag) · sign_up · onboarding_complete
 *    · assessment_create · assessment_release · plan_change
 *  - Meta-Standard-Events: PageView (auto) · CompleteRegistration ·
 *    InitiateCheckout · Purchase (Plan-Wechsel als purchase)
 *
 * DSGVO: ohne Consent werden KEINE Pixel/Cookies gesetzt. Wir laden
 * die Scripts erst nach explizitem "Akzeptieren" im Banner.
 */

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
    fbq?: (...args: unknown[]) => void;
    dataLayer?: unknown[];
  }
}

export type AnalyticsEvent =
  | { name: 'sign_up'; method?: 'email' }
  | { name: 'onboarding_complete' }
  | { name: 'assessment_create' }
  | { name: 'assessment_release'; version: number }
  | { name: 'plan_view' }
  | { name: 'plan_change'; plan: 'free' | 'basic' | 'pro'; value?: number };

/**
 * Feuert ein Event auf alle aktiven Provider (gtag + fbq).
 * Silently noop wenn Consent nicht erteilt oder Provider nicht geladen.
 */
export function track(ev: AnalyticsEvent): void {
  if (typeof window === 'undefined') return;

  // Google Analytics 4
  if (window.gtag) {
    const params: Record<string, unknown> = {};
    if ('version' in ev) params.value = ev.version;
    if ('plan' in ev) params.plan = ev.plan;
    if ('value' in ev && ev.value) params.value = ev.value;
    if ('method' in ev) params.method = ev.method;
    window.gtag('event', ev.name, params);
  }

  // Meta Pixel — Mapping auf Standard-Events
  if (window.fbq) {
    if (ev.name === 'sign_up') {
      window.fbq('track', 'CompleteRegistration');
    } else if (ev.name === 'plan_view') {
      window.fbq('track', 'InitiateCheckout');
    } else if (ev.name === 'plan_change' && ev.plan !== 'free') {
      window.fbq('track', 'Purchase', {
        value: ev.value ?? 0,
        currency: 'EUR'
      });
    } else if (ev.name === 'assessment_release') {
      window.fbq('trackCustom', 'AssessmentRelease', { version: ev.version });
    } else if (ev.name === 'onboarding_complete') {
      window.fbq('trackCustom', 'OnboardingComplete');
    } else if (ev.name === 'assessment_create') {
      window.fbq('trackCustom', 'AssessmentCreate');
    }
  }
}

/**
 * Liefert true wenn Consent erteilt wurde (aus localStorage).
 */
export function hasConsent(): boolean {
  if (typeof window === 'undefined') return false;
  return window.localStorage.getItem('ra-consent') === 'granted';
}

export function setConsent(value: 'granted' | 'denied'): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem('ra-consent', value);
  // Google Consent Mode v2 Update
  if (window.gtag) {
    window.gtag('consent', 'update', {
      ad_storage:         value === 'granted' ? 'granted' : 'denied',
      ad_user_data:       value === 'granted' ? 'granted' : 'denied',
      ad_personalization: value === 'granted' ? 'granted' : 'denied',
      analytics_storage:  value === 'granted' ? 'granted' : 'denied'
    });
  }
  // Meta Pixel — kein direktes API, neu laden via location reload nach Accept
  // (siehe ConsentBanner).
}
