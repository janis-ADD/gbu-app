-- ─── 0011_review_intervals ──────────────────────────────────────────────
-- UX-Baustein: Aktualität der GBU sicherstellen.
--
-- Pro GBU optional:
--   review_interval_months    — 6 | 12 | 24 | NULL (custom = nur review_due_date)
--   review_trigger_events     — jsonb-Array mit Trigger-Codes, bei denen
--                               die GBU bewusst überprüft werden soll:
--                               'unfall', 'neue-maschine', 'neuer-gefahrstoff',
--                               'neue-taetigkeit', 'gesetzesaenderung'
--
-- `review_due_date` (bereits in 0005) bleibt die kanonische Fälligkeit.
-- `review_interval_months` ist der vorgeschlagene Standard, aus dem das
-- nächste Fälligkeitsdatum nach einer Freigabe berechnet wird (Server-Action).
-- ────────────────────────────────────────────────────────────────────────

alter table public.ra_gbus
  add column if not exists review_interval_months smallint
    check (review_interval_months is null or review_interval_months in (6, 12, 24));

alter table public.ra_gbus
  add column if not exists review_trigger_events jsonb not null default '[]'::jsonb;

-- Index für künftige Dashboard-Queries („was läuft ab in 30 Tagen?")
create index if not exists ra_gbus_review_due_date_idx
  on public.ra_gbus (review_due_date)
  where deleted_at is null and review_due_date is not null;

comment on column public.ra_gbus.review_interval_months is
  'Vorgeschlagenes Wiederholungsintervall in Monaten. NULL = nur explizites Datum.';
comment on column public.ra_gbus.review_trigger_events is
  'Array von Anlässen, bei denen eine Aktualisierung gefordert ist: unfall, neue-maschine, neuer-gefahrstoff, neue-taetigkeit, gesetzesaenderung.';
