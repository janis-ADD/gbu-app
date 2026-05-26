import { listPublicPlans } from '@/lib/plans/server';
import { getCurrentQuota } from '@/lib/quota/server';
import { PricingGrid } from '@/components/billing/PricingGrid';

export default async function UpgradePage() {
  const [plans, quota] = await Promise.all([listPublicPlans(), getCurrentQuota()]);

  return (
    <main className="content">
      <div className="content-head">
        <div>
          <h1>Plan wählen</h1>
          <p>Du startest immer kostenlos. Upgrade jederzeit — monatlich kündbar.</p>
        </div>
      </div>

      <div className="alert-banner is-info" style={{ maxWidth: 1040 }}>
        <span className="alert-banner-icon">ℹ️</span>
        <div className="alert-banner-text">
          <strong>Stub-Billing aktiv.</strong> Plan-Wechsel ist im MVP über
          eine einfache Server Action umgesetzt. Stripe-Anbindung folgt in
          Phase 4 — Schema (<code>stripe_customer_id</code>,{' '}
          <code>stripe_subscription_id</code>) ist vorbereitet.
        </div>
      </div>

      <PricingGrid plans={plans} currentPlan={quota?.plan_slug ?? 'free'} />
    </main>
  );
}
