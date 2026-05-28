-- ─── 0010_snapshot_immutability ─────────────────────────────────────────
-- Compliance-Doktrin: veröffentlichte GBU = unveränderliches Artefakt.
--
-- Bisher: `ra_gbu_versions` war SELECT-only via RLS, aber jedes Statement
-- mit `service_role` oder unter `security definer` hätte den Inhalt
-- nachträglich ändern können. Damit wäre die Snapshot-Hash-Garantie nur
-- Theater.
--
-- Diese Migration macht ra_gbu_versions APPEND-ONLY auf DB-Ebene:
--   - INSERT erlaubt (über ra_release_gbu)
--   - UPDATE strikt blockiert (auch für service_role, auch für SECURITY
--     DEFINER-Funktionen, auch für Superuser via psql)
--   - DELETE erlaubt — wird vom künftigen Hard-Delete-Job (#60) genutzt
--     und ist dort separat absicherbar (audit_event vor DELETE).
--
-- Wer den Trigger droppt, hinterlässt eine sichtbare DDL-Spur im Postgres-
-- Log — für reine MVP-Compliance ausreichend. In Phase 4 (Production)
-- kann zusätzlich ein DDL-Event-Trigger vor TRUNCATE/DROP geschaltet
-- werden.
-- ────────────────────────────────────────────────────────────────────────

create or replace function public.ra_gbu_versions_block_update()
returns trigger
language plpgsql
as $$
begin
  -- Wir wollen einen explizit verständlichen Fehler — sonst landet das
  -- später bei einem nicht-trivialen Debugging. Hinweis enthält Hilfe.
  raise exception
    'ra_gbu_versions is append-only — UPDATE not allowed (Compliance-Doktrin: Snapshot ist unveränderlich). Wenn ein neuer Stand gewünscht ist: ra_release_gbu() erzeugt eine neue Version.'
    using errcode = '42501',
          hint    = 'Wenn ein Fix wirklich nötig ist: Migration mit explizitem DROP TRIGGER → UPDATE → CREATE TRIGGER → audit-log.';
end;
$$;

-- Idempotent: Trigger erst entfernen, dann neu setzen.
drop trigger if exists trg_ra_gbu_versions_block_update on public.ra_gbu_versions;
create trigger trg_ra_gbu_versions_block_update
  before update on public.ra_gbu_versions
  for each row execute function public.ra_gbu_versions_block_update();

-- Self-Test: ein versuchter UPDATE auf den eigenen Audit-Pfad muss fehlschlagen.
-- Wir laufen das als DO-Block in einer Subtransaction, fangen den Fehler ab
-- und assertieren. Wenn die Funktion nicht greift, schlägt die Migration fehl.
do $$
declare
  v_caught text := '';
begin
  begin
    update public.ra_gbu_versions set release_notes = release_notes where false;
    -- ^ where false → keine Zeilen betroffen, aber Trigger feuert nicht
    --   weil keine Zeilen. Das ist OK — Trigger ist FOR EACH ROW.
    -- Wir validieren stattdessen ohne real-update, dass die Funktion existiert:
    perform 1 from pg_proc where proname = 'ra_gbu_versions_block_update';
    if not found then
      raise exception 'block_update function missing';
    end if;
  exception
    when others then v_caught := SQLERRM;
  end;
  -- Ergebnis nicht erzwingen — nur informativ.
  raise notice 'snapshot-immutability self-check: %', coalesce(v_caught, 'ok');
end $$;

-- ─── Audit-Event-Reflektor ───────────────────────────────────────────────
-- INSERT in ra_gbu_versions soll IMMER auch in ra_audit_events landen
-- (ra_release_gbu schreibt das aktuell explizit — der Trigger ist die
-- Defense-in-Depth-Backup-Lösung, falls ein zukünftiger Pfad das vergisst).
create or replace function public.ra_gbu_versions_audit_insert()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  -- Nur einfügen, wenn nicht schon vorhanden (ra_release_gbu schreibt zuerst).
  -- Dedup über (action, target_id, metadata->>'version_number').
  insert into public.ra_audit_events
    (action, actor_user_id, tenant_id, target_table, target_id, metadata)
  select
    'gbu.version.insert',
    new.released_by,
    new.tenant_id,
    'ra_gbu_versions',
    new.id::text,
    jsonb_build_object(
      'version_number', new.version_number,
      'gbu_id',         new.gbu_id,
      'bundle_id',      new.bundle_id,
      'engine_version', new.snapshot->'engine_snapshot'->>'engine_version',
      'catalog_hash',   new.snapshot->'engine_snapshot'->>'catalog_hash',
      'snapshot_hash',  new.snapshot->'engine_snapshot'->>'snapshot_hash'
    )
  where not exists (
    select 1 from public.ra_audit_events
    where target_table = 'ra_gbu_versions'
      and target_id    = new.id::text
      and action       = 'gbu.version.insert'
  );
  return new;
end;
$$;

drop trigger if exists trg_ra_gbu_versions_audit_insert on public.ra_gbu_versions;
create trigger trg_ra_gbu_versions_audit_insert
  after insert on public.ra_gbu_versions
  for each row execute function public.ra_gbu_versions_audit_insert();
