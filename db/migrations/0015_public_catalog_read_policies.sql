-- =============================================================================
-- Migration 0015 — Catalog-Read-Policies öffentlich lesbar
-- =============================================================================
-- Catalog-Tabellen sind reine Referenzdaten:
--   * ra_bg_catalog       — DGUV-/Berufsgenossenschafts-Kennungen
--   * ra_risk_catalog     — kuratierte Risiken (öffentliche Norm-Bezüge)
--   * ra_measure_catalog  — kuratierte Maßnahmen (Norm-Texte)
--   * ra_legal_refs       — Gesetze, Verordnungen, technische Regeln
--   * ra_training_catalog — angebotene Unterweisungs-Module
--
-- Inhalte sind durch Migrations geseedet, enthalten KEIN PII, keine
-- mandantenspezifischen Daten. Sie sind im Wesentlichen identisch mit
-- öffentlich publizierten DGUV-/BG-/ASR-Texten.
--
-- Bisher: `for select to authenticated using (true)` — nur eingeloggte
-- Nutzer:innen konnten lesen.
--
-- Problem:  Next.js `unstable_cache`-Callbacks laufen ohne Request-Kontext.
--           Der dort genutzte Supabase-Server-Client kann nicht auf die
--           Auth-Cookies zugreifen → effektiv `anon`-Rolle → Policy
--           lieferte 0 Zeilen → leere Catalog-Listen wurden 10 Minuten
--           lang gecached, BG-Auswahl blieb leer.
--
-- Fix:      Read-Policies öffnen für `anon` + `authenticated`. Schreibrechte
--           bleiben unverändert (kein INSERT/UPDATE/DELETE über RLS — nur
--           Service-Role / Migrations).
--
-- Sicherheits-Audit:
--   * Keine personenbezogenen Daten betroffen.
--   * Kein Tenant-Isolation-Risiko (Catalogs sind tenant-übergreifend).
--   * Schreib-Endpoints sind nicht betroffen — anon kann weiterhin NICHTS
--     verändern.
-- =============================================================================

-- ra_bg_catalog
drop policy if exists ra_bg_catalog_read         on public.ra_bg_catalog;
drop policy if exists ra_bg_catalog_public_read  on public.ra_bg_catalog;
create policy ra_bg_catalog_public_read on public.ra_bg_catalog
  for select to anon, authenticated using (true);

-- ra_risk_catalog
drop policy if exists ra_risk_catalog_read         on public.ra_risk_catalog;
drop policy if exists ra_risk_catalog_public_read  on public.ra_risk_catalog;
create policy ra_risk_catalog_public_read on public.ra_risk_catalog
  for select to anon, authenticated using (true);

-- ra_measure_catalog
drop policy if exists ra_measure_catalog_read         on public.ra_measure_catalog;
drop policy if exists ra_measure_catalog_public_read  on public.ra_measure_catalog;
create policy ra_measure_catalog_public_read on public.ra_measure_catalog
  for select to anon, authenticated using (true);

-- ra_legal_refs
drop policy if exists ra_legal_refs_read         on public.ra_legal_refs;
drop policy if exists ra_legal_refs_public_read  on public.ra_legal_refs;
create policy ra_legal_refs_public_read on public.ra_legal_refs
  for select to anon, authenticated using (true);

-- ra_training_catalog
drop policy if exists ra_training_catalog_read         on public.ra_training_catalog;
drop policy if exists ra_training_catalog_public_read  on public.ra_training_catalog;
create policy ra_training_catalog_public_read on public.ra_training_catalog
  for select to anon, authenticated using (true);
