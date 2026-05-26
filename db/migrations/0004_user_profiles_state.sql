-- =============================================================================
-- Migration 0004 — Bundesland in ra_user_profiles
-- =============================================================================
-- Pflicht für Onboarding ab v2. Wird für Hinweise auf Landesaufsicht
-- in Wizard Step 2 (BG-Kandidaten) genutzt. Keine eigene Landesaufsichts-
-- Datenbank im MVP — wir zeigen nur einen kurzen Standard-Hinweis.
-- =============================================================================

alter table ra_user_profiles
  add column state text
  check (state in
    ('BW','BY','BE','BB','HB','HH','HE','MV','NI','NW','RP','SL','SN','ST','SH','TH'));
