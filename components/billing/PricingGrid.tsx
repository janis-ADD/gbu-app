'use client';

import { useEffect, useRef } from 'react';
import { useFormState } from 'react-dom';
import { setPlanAction } from '@/app/actions/billing';
import { BILLING_INITIAL, type AuthState } from '@/lib/forms/states';
import { SubmitButton } from '@/components/auth/SubmitButton';
import { FormFeedback } from '@/components/auth/FormFeedback';
import { track } from '@/lib/analytics/client';
import type { RaPlan } from '@/lib/db/types';

const FEATURE_LISTS: Record<string, Array<{ txt: string; included: boolean }>> = {
  free: [
    { txt: 'Vollständiger 6-Step-Wizard', included: true },
    { txt: 'BG-/DGUV-orientierte Vorschläge', included: true },
    { txt: '1 freigegebene Beurteilung', included: true },
    { txt: 'PDF (mit Wasserzeichen)', included: true },
    { txt: 'Versionsverlauf', included: false },
    { txt: 'Unterweisungs-Aktivierung (Memberspot)', included: false }
  ],
  basic: [
    { txt: 'Alles aus Free', included: true },
    { txt: 'Unbegrenzte Beurteilungen', included: true },
    { txt: 'PDF ohne Wasserzeichen', included: true },
    { txt: 'Versionsverlauf & Snapshots', included: true },
    { txt: 'Audit-Trail einsehbar', included: true },
    { txt: 'Unterweisungs-Aktivierung (Memberspot)', included: false }
  ],
  pro: [
    { txt: 'Alles aus Basic', included: true },
    { txt: 'Unterweisungs-Aktivierung (Memberspot)', included: true },
    { txt: 'Mehrere Standorte', included: true },
    { txt: 'Compliance-Reports', included: true },
    { txt: 'Vorrangiger Support', included: true },
    { txt: 'Team-Seats (geplant)', included: false }
  ]
};

export function PricingGrid({
  plans,
  currentPlan
}: {
  plans: RaPlan[];
  currentPlan: string | null;
}) {
  const [state, formAction] = useFormState(setPlanAction, BILLING_INITIAL);
  const fbState: AuthState = { ok: state.ok, error: state.error };

  // 1) plan_view beim Mount (Conversion-Funnel-Start)
  const planViewFired = useRef(false);
  useEffect(() => {
    if (!planViewFired.current) {
      planViewFired.current = true;
      track({ name: 'plan_view' });
    }
  }, []);

  // 2) plan_change nach erfolgreichem Wechsel
  const lastPlanRef = useRef(currentPlan);
  useEffect(() => {
    if (state.ok && state.info) {
      // info enthält Plan-Name in Upper Case ("BASIC"/"PRO"/"FREE")
      const planMatch = state.info.match(/(FREE|BASIC|PRO)/);
      if (planMatch) {
        const plan = planMatch[1].toLowerCase() as 'free' | 'basic' | 'pro';
        if (plan !== lastPlanRef.current) {
          const planMeta = plans.find((p) => p.slug === plan);
          track({
            name: 'plan_change',
            plan,
            value: Number(planMeta?.monthly_eur ?? 0)
          });
          lastPlanRef.current = plan;
        }
      }
    }
  }, [state, plans]);

  return (
    <>
      <FormFeedback state={fbState} />
      {state.info ? (
        <div className="alert-banner is-success" style={{ marginBottom: 14 }}>
          <span className="alert-banner-icon">✅</span>
          <div className="alert-banner-text">{state.info}</div>
        </div>
      ) : null}

      <div className="pricing-grid">
        {plans.map((p) => {
          const isCurrent = p.slug === currentPlan;
          const isFeatured = (p.features as Record<string, unknown>).featured === true && !isCurrent;
          const features = FEATURE_LISTS[p.slug] ?? [];
          const price = p.monthly_eur ? `${p.monthly_eur} €` : '0 €';

          return (
            <div
              key={p.slug}
              className={`pricing-card ${isFeatured ? 'is-featured' : ''} ${isCurrent ? 'current' : ''}`}
            >
              {isFeatured ? <span className="featured-tag">Empfohlen</span> : null}
              {isCurrent ? <span className="current-tag">Dein Plan</span> : null}
              <div className="plan-name">{p.name}</div>
              <div className="plan-price">
                {price}<small>/Monat</small>
              </div>
              <div className="plan-tagline">{p.tagline ?? ''}</div>
              <ul>
                {features.map((f, i) => (
                  <li key={i} className={f.included ? '' : 'is-missing'}>
                    {f.txt}
                  </li>
                ))}
              </ul>
              {isCurrent ? (
                <button className="btn btn-secondary btn-block" disabled>
                  Aktiver Plan
                </button>
              ) : (
                <form action={formAction}>
                  <input type="hidden" name="plan" value={p.slug} />
                  <SubmitButton
                    pendingLabel="Wechsle …"
                  >
                    {p.monthly_eur === 0 ? 'Auf Free wechseln' : `Auf ${p.name} upgraden`}
                  </SubmitButton>
                </form>
              )}
            </div>
          );
        })}
      </div>
    </>
  );
}
