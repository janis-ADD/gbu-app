-- =============================================================================
-- Migration 0005 — Bundle/GBU-Architektur-Refactor
-- =============================================================================
-- Behebt fundamentalen Fachfehler: bisher 1 Betrieb = 1 GBU.
-- Korrekt: 1 Betrieb = 1 Bundle mit N tätigkeitsbezogenen GBUs (ArbSchG §5/§6).
--
-- Vorgehen:
--   1. Alte Tabellen droppen (Test-Daten — Beta noch nicht live)
--   2. Neue Tabellen ra_bundles + ra_gbus + ra_gbu_versions anlegen
--   3. RLS-Policies neu
--   4. ra_release_gbu() Function mit Quota-Limit (zählt freigegebene GBUs)
--
-- Migrationen 0001-0004 müssen vorher gelaufen sein.
-- =============================================================================

-- ─── 1. Alte Strukturen entfernen (cascade nimmt FKs mit) ──────────────
drop function if exists ra_release_version(uuid, boolean, text);
drop table if exists ra_documents cascade;
drop table if exists ra_ai_generations cascade;
drop table if exists ra_assessment_versions cascade;
drop table if exists ra_assessments cascade;

-- ─── 2. ra_bundles (1 pro Betrieb-Snapshot) ─────────────────────────────
create table ra_bundles (
  id              uuid primary key default gen_random_uuid(),
  tenant_id       uuid not null,
  owner_user_id   uuid not null references auth.users(id),
  title           text not null,
  status          text not null default 'in_setup'
                  check (status in ('in_setup','active','archived')),
  -- Unternehmens-Snapshot (gilt für alle GBUs dieses Bundles)
  company_profile jsonb not null default '{}'::jsonb,
  -- BG-Zuständigkeit (Multi, eigenklärung erforderlich)
  bg_assignment   jsonb not null default '{}'::jsonb,
  -- Wenn company_profile/bg_assignment geändert werden, müssen GBUs als stale markiert werden
  setup_completed_at timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  deleted_at      timestamptz
);
create index ra_bundles_tenant_idx on ra_bundles (tenant_id) where deleted_at is null;
create index ra_bundles_status_idx on ra_bundles (tenant_id, status) where deleted_at is null;

-- ─── 3. ra_gbus (N pro Bundle, tätigkeitsbezogen) ───────────────────────
create table ra_gbus (
  id                uuid primary key default gen_random_uuid(),
  bundle_id         uuid not null references ra_bundles(id) on delete cascade,
  tenant_id         uuid not null,
  -- Tätigkeits-Scope (Area-Slug oder Custom)
  scope_slug        text not null,           -- 'buero', 'lager', 'leitern-tritte', …
  title             text not null,
  -- Wizard-Daten pro GBU
  activities        jsonb not null default '{}'::jsonb,  -- konkrete Tätigkeiten
  hazards           jsonb not null default '{}'::jsonb,  -- ausgewählte risk_slugs + custom
  measures          jsonb not null default '{}'::jsonb,  -- gewählte measure_slugs + acknowledgements
  open_items        jsonb not null default '[]'::jsonb,  -- offene Prüfpunkte
  -- ArbSchG §6 Pflichtfelder
  responsible_role  text,
  review_due_date   date,
  -- Status + Versionierung pro GBU
  status            text not null default 'draft'
                    check (status in ('draft','in_review','released','stale')),
  current_step      smallint not null default 1 check (current_step between 1 and 5),
  current_version   int not null default 0,
  -- Wenn Bundle-Setup geändert wird → stale=true
  is_stale          boolean not null default false,
  stale_reason      text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  deleted_at        timestamptz
);
create index ra_gbus_bundle_idx on ra_gbus (bundle_id) where deleted_at is null;
create index ra_gbus_tenant_status_idx on ra_gbus (tenant_id, status) where deleted_at is null;
create unique index ra_gbus_bundle_scope_unique on ra_gbus (bundle_id, scope_slug)
  where deleted_at is null;

-- ─── 4. ra_gbu_versions (immutable Snapshots pro GBU) ───────────────────
create table ra_gbu_versions (
  id                       uuid primary key default gen_random_uuid(),
  gbu_id                   uuid not null references ra_gbus(id) on delete cascade,
  bundle_id                uuid not null references ra_bundles(id) on delete cascade,
  tenant_id                uuid not null,
  version_number           int not null,
  snapshot                 jsonb not null,
  released_by              uuid not null references auth.users(id),
  released_at              timestamptz not null default now(),
  release_notes            text,
  disclaimer_acknowledged  boolean not null,
  source_refs              text[] not null default '{}',
  unique (gbu_id, version_number)
);
create index ra_gbu_versions_tenant_idx on ra_gbu_versions (tenant_id);
create index ra_gbu_versions_bundle_idx on ra_gbu_versions (bundle_id);

-- ─── 5. ra_documents wieder anlegen (jetzt mit gbu_version_id) ──────────
create table ra_documents (
  id              uuid primary key default gen_random_uuid(),
  gbu_id          uuid references ra_gbus(id) on delete cascade,
  bundle_id       uuid not null references ra_bundles(id) on delete cascade,
  tenant_id       uuid not null,
  gbu_version_id  uuid references ra_gbu_versions(id) on delete cascade,
  kind            text not null check (kind in ('pdf','html-snapshot','bundle-pdf')),
  storage_path    text,
  byte_size       int,
  sha256          text,
  generated_at    timestamptz not null default now(),
  generator       text,
  expires_at      timestamptz
);
create index ra_documents_bundle_idx on ra_documents (bundle_id);

-- ─── 6. ra_ai_generations (jetzt mit bundle_id / gbu_id) ────────────────
create table ra_ai_generations (
  id                   uuid primary key default gen_random_uuid(),
  bundle_id            uuid not null references ra_bundles(id) on delete cascade,
  gbu_id               uuid references ra_gbus(id) on delete cascade,
  tenant_id            uuid not null,
  stage                text not null,
  prompt_template      text not null,
  prompt_version       text not null,
  provider             text not null,
  model_id             text not null,
  input_hash           text not null,
  output_hash          text not null,
  input_payload        jsonb,
  output_payload       jsonb,
  source_refs          text[] not null default '{}',
  confidence_level     text not null default 'medium'
                       check (confidence_level in ('high','medium','low','insufficient_data')),
  token_input          int,
  token_output         int,
  latency_ms           int,
  status               text not null
                       check (status in
                         ('success','validation_failed','provider_error','blocked_by_filter','low_confidence_warn')),
  error_details        jsonb,
  created_at           timestamptz not null default now()
);
create index ra_ai_gen_bundle_idx on ra_ai_generations (bundle_id, stage, created_at desc);
create index ra_ai_gen_gbu_idx on ra_ai_generations (gbu_id) where gbu_id is not null;

-- ─── 7. Touch-Updated-At-Trigger ────────────────────────────────────────
create trigger trg_ra_bundles_updated
  before update on ra_bundles
  for each row execute procedure ra_touch_updated_at();

create trigger trg_ra_gbus_updated
  before update on ra_gbus
  for each row execute procedure ra_touch_updated_at();

-- ─── 8. RLS ─────────────────────────────────────────────────────────────
alter table ra_bundles enable row level security;
create policy ra_bundles_select on ra_bundles for select
  using (tenant_id = auth.uid() and deleted_at is null);
create policy ra_bundles_insert on ra_bundles for insert
  with check (tenant_id = auth.uid() and owner_user_id = auth.uid());
create policy ra_bundles_update on ra_bundles for update
  using (tenant_id = auth.uid());

alter table ra_gbus enable row level security;
create policy ra_gbus_select on ra_gbus for select
  using (tenant_id = auth.uid() and deleted_at is null);
create policy ra_gbus_insert on ra_gbus for insert
  with check (tenant_id = auth.uid());
create policy ra_gbus_update on ra_gbus for update
  using (tenant_id = auth.uid());

alter table ra_gbu_versions enable row level security;
create policy ra_gbu_versions_select on ra_gbu_versions for select
  using (tenant_id = auth.uid());
-- Insert nur via ra_release_gbu() (security definer)

alter table ra_documents enable row level security;
create policy ra_documents_select on ra_documents for select
  using (tenant_id = auth.uid());
create policy ra_documents_insert on ra_documents for insert
  with check (tenant_id = auth.uid());

alter table ra_ai_generations enable row level security;
create policy ra_ai_gen_select on ra_ai_generations for select
  using (tenant_id = auth.uid());
create policy ra_ai_gen_insert on ra_ai_generations for insert
  with check (tenant_id = auth.uid());

-- ─── 9. Subscriptions: UPDATE-Policy entfernen (kein User-Self-Wechsel) ─
-- Plan-Wechsel ausschließlich via Service-Role (Stripe-Webhook).
drop policy if exists ra_subscriptions_update_self on ra_subscriptions;

-- ─── 10. ra_release_gbu — Release einer einzelnen GBU mit Quota-Check ──
create or replace function ra_release_gbu(
  p_gbu_id uuid,
  p_disclaimer_ack boolean,
  p_release_notes text default null
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

  -- Anzahl bisher freigegebener GBUs (distinct gbu_id) für diesen Tenant
  select count(distinct gbu_id) into v_used
    from public.ra_gbu_versions
    where tenant_id = v_tenant;

  -- Beim Release derselben GBU (Version-Bump) zählt sie NICHT erneut
  if not exists (
    select 1 from public.ra_gbu_versions where gbu_id = p_gbu_id
  ) and v_max is not null and v_used >= v_max then
    raise exception 'quota_exhausted' using errcode = '53400';
  end if;

  -- Snapshot zusammenbauen (Bundle + GBU)
  select coalesce(max(version_number),0) + 1
    into v_next_v
    from public.ra_gbu_versions
    where gbu_id = p_gbu_id;

  select jsonb_build_object(
    'bundle',     jsonb_build_object(
                     'company',  b.company_profile,
                     'bg',       b.bg_assignment,
                     'title',    b.title
                  ),
    'gbu',        jsonb_build_object(
                     'scope_slug',       g.scope_slug,
                     'title',            g.title,
                     'activities',       g.activities,
                     'hazards',          g.hazards,
                     'measures',         g.measures,
                     'open_items',       g.open_items,
                     'responsible_role', g.responsible_role,
                     'review_due_date',  g.review_due_date
                  ),
    'released_at',now(),
    'plan',       v_plan
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
     p_gbu_id::text, jsonb_build_object('version_number', v_next_v));

  return v_id;
end$$;

-- ─── 11. Helper: Stale-Markierung bei Bundle-Setup-Änderung ────────────
create or replace function ra_mark_gbus_stale(p_bundle_id uuid, p_reason text)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_tenant  uuid;
begin
  if v_user_id is null then
    raise exception 'auth_required' using errcode = '42501';
  end if;
  select tenant_id into v_tenant from public.ra_bundles
    where id = p_bundle_id;
  if v_tenant is null or v_tenant <> v_user_id then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  update public.ra_gbus
    set is_stale = true, stale_reason = p_reason
    where bundle_id = p_bundle_id and status <> 'released';
end$$;
