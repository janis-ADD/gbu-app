-- =============================================================================
-- Migration 0003 — UPDATE-Policy für ra_subscriptions
-- =============================================================================
-- Ermöglicht User, ihren eigenen Plan zu wechseln (MVP-Stub).
-- In Phase 4 wird der Plan-Wechsel ausschließlich über Stripe-Webhook
-- mit Service-Role-Key passieren — dann kann diese Policy ggf. entfernt
-- werden (oder wir behalten sie für Downgrade-auf-Free durch User).
-- =============================================================================

create policy ra_subscriptions_update_self on ra_subscriptions
  for update
  using (tenant_id = auth.uid())
  with check (tenant_id = auth.uid());
