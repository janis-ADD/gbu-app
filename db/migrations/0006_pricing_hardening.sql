-- =============================================================================
-- Migration 0006 — Pricing-Hardening
-- =============================================================================
-- 1. Free-Limit auf 3 GBUs heben
-- 2. UPDATE-Policy für ra_subscriptions ENG: User darf nur auf "free"
--    downgraden (Plan-Wechsel auf basic/pro nur via Service-Role/Stripe).
-- =============================================================================

update ra_plans set max_releases = 3 where slug = 'free';

-- Falls Policy aus 0003 noch existiert → entfernen
drop policy if exists ra_subscriptions_update_self on ra_subscriptions;

-- Neue restriktive Policy: User darf nur sich selbst auf "free" setzen
create policy ra_subscriptions_self_downgrade_to_free on ra_subscriptions
  for update
  using (tenant_id = auth.uid())
  with check (tenant_id = auth.uid() and plan_slug = 'free');
