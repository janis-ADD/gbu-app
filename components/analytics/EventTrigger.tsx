'use client';

import { useEffect } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { track } from '@/lib/analytics/client';

/**
 * Liest ?ev=... aus URL und feuert das entsprechende Tracking-Event.
 * Wird auf Ziel-Pages eingebettet, zu denen Server Actions redirecten.
 *
 * Bekannte Events:
 *   onboarding_complete · assessment_create · assessment_release ·
 *   plan_change · sign_up
 *
 * Nach Trigger: query wird sofort aus URL entfernt (history.replaceState).
 */
export function EventTrigger() {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const ev = params.get('ev');
    if (!ev) return;

    switch (ev) {
      case 'sign_up':
        track({ name: 'sign_up', method: 'email' });
        break;
      case 'onboarding_complete':
        track({ name: 'onboarding_complete' });
        break;
      case 'assessment_create':
        track({ name: 'assessment_create' });
        break;
      case 'assessment_release': {
        const v = parseInt(params.get('v') ?? '0', 10);
        track({ name: 'assessment_release', version: v || 1 });
        break;
      }
      case 'plan_change': {
        const plan = params.get('plan') as 'free' | 'basic' | 'pro' | null;
        const value = parseFloat(params.get('value') ?? '0');
        if (plan === 'free' || plan === 'basic' || plan === 'pro') {
          track({ name: 'plan_change', plan, value: value || undefined });
        }
        break;
      }
      case 'plan_view':
        track({ name: 'plan_view' });
        break;
    }

    // URL bereinigen (kein reload)
    const clean = new URLSearchParams(params);
    clean.delete('ev');
    clean.delete('v');
    clean.delete('plan');
    clean.delete('value');
    const qs = clean.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }, [params, router, pathname]);

  return null;
}
