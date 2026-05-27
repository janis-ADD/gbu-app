-- ─── 0009_engine_snapshot_freeze ────────────────────────────────────────
-- Compliance-Doktrin: veröffentlichte GBU = unveränderliches Artefakt.
--
-- Erweitert ra_release_gbu() um den deterministisch gebauten Engine-Snapshot.
-- Der Snapshot wird vom Server in TypeScript erzeugt (lib/wizard/engine.ts:
-- buildEngineSnapshot) und als JSONB an die RPC übergeben. Die RPC bettet
-- ihn unter Key `engine_snapshot` in ra_gbu_versions.snapshot ein. Damit
-- ist eine Version reproduzierbar OHNE die Engine erneut auszuführen.
--
-- p_engine_snapshot ist OPTIONAL (default null) für Rückwärtskompatibilität,
-- aber die Server-Action ruft die RPC immer mit einem Snapshot auf.
-- Wenn null: Snapshot enthält ein Marker-Objekt, das die UI als Alt-Version
-- erkennt und Best-Effort-Re-Derivation mit Disclaimer zeigt.
-- ───────────────────────────────────────────────────────────────────────

create or replace function ra_release_gbu(
  p_gbu_id uuid,
  p_disclaimer_ack boolean,
  p_release_notes text default null,
  p_engine_snapshot jsonb default null
)
returns uuid
language plpgsql security definer set search_path = ''
as $$
declare
  v_user_id    uuid := auth.uid();
  v_tenant     uuid;
  v_bundle     uuid;
  v_plan       text;
  v_max        int;
  v_used       int;
  v_next_v     int;
  v_snapshot   jsonb;
  v_id         uuid;
  v_is_stale   boolean;
begin
  if v_user_id is null then
    raise exception 'auth_required' using errcode = '42501';
  end if;
  if not p_disclaimer_ack then
    raise exception 'disclaimer_not_acknowledged' using errcode = '22023';
  end if;

  -- GBU + Bundle laden, Tenant-Check
  select g.tenant_id, g.bundle_id, g.is_stale
    into v_tenant, v_bundle, v_is_stale
    from public.ra_gbus g
    where g.id = p_gbu_id and g.deleted_at is null
    for update;
  if v_tenant is null then
    raise exception 'gbu_not_found' using errcode = '02000';
  end if;
  if v_tenant <> v_user_id then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if v_is_stale then
    raise exception 'gbu_is_stale' using errcode = '22023';
  end if;

  -- Plan + Quota (zählt freigegebene GBUs, NICHT Bundles)
  select s.plan_slug, p.max_releases
    into v_plan, v_max
    from public.ra_subscriptions s
    join public.ra_plans p on p.slug = s.plan_slug
    where s.tenant_id = v_tenant;
  if v_plan is null then
    raise exception 'subscription_missing' using errcode = '02000';
  end if;

  select count(distinct gbu_id) into v_used
    from public.ra_gbu_versions
    where tenant_id = v_tenant;

  if not exists (
    select 1 from public.ra_gbu_versions where gbu_id = p_gbu_id
  ) and v_max is not null and v_used >= v_max then
    raise exception 'quota_exhausted' using errcode = '53400';
  end if;

  select coalesce(max(version_number),0) + 1
    into v_next_v
    from public.ra_gbu_versions
    where gbu_id = p_gbu_id;

  -- Snapshot zusammenbauen: Bundle + GBU + Engine-Snapshot (vom Server)
  select jsonb_build_object(
    'bundle',          jsonb_build_object(
                          'company',  b.company_profile,
                          'bg',       b.bg_assignment,
                          'title',    b.title
                       ),
    'gbu',             jsonb_build_object(
                          'scope_slug',       g.scope_slug,
                          'title',            g.title,
                          'activities',       g.activities,
                          'hazards',          g.hazards,
                          'measures',         g.measures,
                          'open_items',       g.open_items,
                          'responsible_role', g.responsible_role,
                          'review_due_date',  g.review_due_date
                       ),
    'engine_snapshot', coalesce(p_engine_snapshot, jsonb_build_object(
                          'schema_version', 0,
                          'note',           'legacy_release_no_engine_snapshot'
                       )),
    'released_at',     now(),
    'plan',            v_plan
  )
    into v_snapshot
    from public.ra_gbus g
    join public.ra_bundles b on b.id = g.bundle_id
    where g.id = p_gbu_id;

  insert into public.ra_gbu_versions
    (gbu_id, bundle_id, tenant_id, version_number, snapshot,
     released_by, release_notes, disclaimer_acknowledged)
    values
    (p_gbu_id, v_bundle, v_tenant, v_next_v, v_snapshot,
     v_user_id, p_release_notes, true)
    returning id into v_id;

  update public.ra_gbus
    set status = 'released',
        current_version = v_next_v,
        updated_at = now()
    where id = p_gbu_id;

  insert into public.ra_audit_events
    (action, actor_user_id, tenant_id, target_table, target_id, metadata)
    values
    ('gbu.release', v_user_id, v_tenant, 'ra_gbus',
     p_gbu_id::text, jsonb_build_object(
       'version_number',  v_next_v,
       'engine_version',  coalesce(p_engine_snapshot->>'engine_version', 'legacy'),
       'catalog_hash',    coalesce(p_engine_snapshot->>'catalog_hash',   'legacy'),
       'schema_version',  coalesce((p_engine_snapshot->>'schema_version')::int, 0)
     ));

  return v_id;
end$$;
