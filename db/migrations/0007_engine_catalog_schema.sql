-- =============================================================================
-- Migration 0007 — Risk/Measure-Katalog für Ableitungs-Engine erweitern
-- =============================================================================

alter table ra_risk_catalog
  add column trigger_conditions jsonb not null default '{}'::jsonb,
  add column severity_default smallint check (severity_default between 1 and 5),
  add column likelihood_default smallint check (likelihood_default between 1 and 5),
  add column requires_betriebsanweisung boolean not null default false,
  add column requires_psa boolean not null default false,
  add column requires_unterweisung boolean not null default false;

alter table ra_measure_catalog
  add column is_mandatory_when jsonb not null default '{}'::jsonb;
