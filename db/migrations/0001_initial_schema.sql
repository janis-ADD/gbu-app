-- =============================================================================
-- SU24 — GBU-App — Initial Schema (MVP)
-- =============================================================================
-- Beachtet:
--  - DSGVO-/MVP-Sicherheitskonzept (Memory: dsgvo-mvp-sicherheitskonzept.md)
--  - Single-Seat: tenant_id = auth.uid()
--  - Soft-Delete via deleted_at, Hard-Delete-Job kommt separat
--  - Append-only Tabellen ohne UPDATE/DELETE-Policies
--  - Tabellen-Präfix ra_*
-- =============================================================================

-- ─── Extensions ──────────────────────────────────────────────────────────────
create extension if not exists "pgcrypto";

-- =============================================================================
-- 1. STAMMDATEN (Read-only für alle authentifizierten User)
-- =============================================================================

-- ─── Berufsgenossenschaften ──────────────────────────────────────────────────
create table ra_bg_catalog (
  id            uuid primary key default gen_random_uuid(),
  slug          text unique not null,
  name          text not null,
  description   text,
  industries    text[] not null default '{}',
  data_source   text not null,
  is_complete   boolean not null default false,
  created_at    timestamptz not null default now()
);

-- ─── Quellen-Katalog (DGUV / BG / ASR / Gesetze) ─────────────────────────────
create table ra_legal_refs (
  id            uuid primary key default gen_random_uuid(),
  slug          text unique not null,
  kind          text not null check (kind in
                  ('dguv-vorschrift','dguv-regel','dguv-information',
                   'bg-schrift','asr','gesetz','verordnung','technische-regel')),
  citation      text not null,
  title         text not null,
  url           text,
  bg_slug       text references ra_bg_catalog(slug),
  valid_from    date,
  valid_until   date,
  reviewed_by   text not null,
  reviewed_at   timestamptz not null,
  data_source   text not null
);

-- ─── Risiko-Katalog (mit Quellen-Refs) ───────────────────────────────────────
create table ra_risk_catalog (
  id              uuid primary key default gen_random_uuid(),
  slug            text unique not null,
  name            text not null,
  category        text not null,
  typical_areas   text[] not null default '{}',
  source_ref_slugs text[] not null default '{}',
  data_source     text not null,
  created_at      timestamptz not null default now()
);

-- ─── Standard-Maßnahmen (mit Quellen-Refs) ───────────────────────────────────
create table ra_measure_catalog (
  id                uuid primary key default gen_random_uuid(),
  slug              text unique not null,
  short_text        text not null,
  long_text         text not null,
  category          text not null,                  -- technisch|organisatorisch|personenbezogen
  applies_to_risks  text[] not null default '{}',
  source_ref_slugs  text[] not null default '{}',
  confidence        text not null default 'high' check (confidence in ('high','medium')),
  data_source       text not null,
  created_at        timestamptz not null default now()
);

-- ─── Unterweisungs-Katalog (Slugs für SU24/Memberspot-Kopplung) ──────────────
create table ra_training_catalog (
  id              uuid primary key default gen_random_uuid(),
  slug            text unique not null,
  name            text not null,
  related_risks   text[] not null default '{}',
  memberspot_id   text,                              -- später gemappt
  data_source     text not null,
  created_at      timestamptz not null default now()
);

-- =============================================================================
-- 2. ACCOUNTS / PROFILES / PLANS / SUBSCRIPTIONS
-- =============================================================================

-- ─── User-Profile (1:1 zu auth.users; tenant_id = user_id im MVP) ────────────
create table ra_user_profiles (
  user_id                 uuid primary key references auth.users(id) on delete cascade,
  tenant_id               uuid not null,            -- MVP: = user_id
  display_name            text,
  company_name            text,
  industry                text,
  employee_bucket         text check (employee_bucket in ('1','2-5','6-20','21-50','51-250','250+')),
  role_in_company         text,
  accepted_terms_at       timestamptz not null,
  onboarding_completed_at timestamptz,
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now()
);

-- ─── Pläne (Stammdaten) ──────────────────────────────────────────────────────
create table ra_plans (
  slug          text primary key,
  name          text not null,
  tagline       text,
  max_releases  int,                                  -- null = unbegrenzt
  features      jsonb not null default '{}',
  monthly_eur   numeric(8,2),
  yearly_eur    numeric(8,2),
  is_public     boolean not null default true,
  sort_order    int not null default 0
);

-- ─── Subscriptions ───────────────────────────────────────────────────────────
create table ra_subscriptions (
  tenant_id              uuid primary key,
  plan_slug              text not null references ra_plans(slug),
  status                 text not null check (status in
                          ('active','past_due','canceled','trialing')),
  current_period_end     timestamptz,
  provider               text not null default 'stub',  -- 'stub' | 'stripe' (Phase 4)
  provider_customer_id   text,
  provider_subscription_id text,
  updated_at             timestamptz not null default now()
);

-- =============================================================================
-- 3. ASSESSMENTS (Kern-Entity)
-- =============================================================================

create table ra_assessments (
  id              uuid primary key default gen_random_uuid(),
  tenant_id       uuid not null,
  owner_user_id   uuid not null references auth.users(id),
  title           text not null,
  status          text not null default 'draft'
                  check (status in ('draft','in_review','released','archived')),
  current_step    smallint not null default 1 check (current_step between 1 and 6),
  current_version int not null default 0,
  -- Step-Daten als JSONB (Wizard speichert hier incrementell, kleines MVP-Schema)
  step1_company   jsonb not null default '{}',
  step2_bg        jsonb not null default '{}',
  step3_areas     jsonb not null default '{}',
  step4_hazards   jsonb not null default '{}',
  step5_measures  jsonb not null default '{}',
  step6_review    jsonb not null default '{}',
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  deleted_at      timestamptz
);
create index ra_assessments_tenant_status_idx
  on ra_assessments (tenant_id, status) where deleted_at is null;
create index ra_assessments_tenant_updated_idx
  on ra_assessments (tenant_id, updated_at desc) where deleted_at is null;

-- ─── Versionen (immutable Snapshots) ─────────────────────────────────────────
create table ra_assessment_versions (
  id                       uuid primary key default gen_random_uuid(),
  assessment_id            uuid not null references ra_assessments(id) on delete cascade,
  tenant_id                uuid not null,
  version_number           int not null,
  snapshot                 jsonb not null,         -- vollständig denormalisiert
  released_by              uuid not null references auth.users(id),
  released_at              timestamptz not null default now(),
  release_notes            text,
  disclaimer_acknowledged  boolean not null,
  source_refs              text[] not null default '{}',
  unique (assessment_id, version_number)
);
create index ra_versions_tenant_idx on ra_assessment_versions (tenant_id);

-- =============================================================================
-- 4. KI-GENERIERUNGEN (append-only, Payloads 90 Tage retention)
-- =============================================================================

create table ra_ai_generations (
  id                   uuid primary key default gen_random_uuid(),
  assessment_id        uuid not null references ra_assessments(id) on delete cascade,
  tenant_id            uuid not null,
  stage                text not null,             -- bg_suggest|hazards|measures|gaps|final
  prompt_template      text not null,
  prompt_version       text not null,
  provider             text not null,
  model_id             text not null,
  input_hash           text not null,
  output_hash          text not null,
  input_payload        jsonb,                     -- nach 90 Tagen null
  output_payload       jsonb,                     -- nach 90 Tagen null
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
create index ra_ai_gen_assessment_idx on ra_ai_generations (assessment_id, stage, created_at desc);
create index ra_ai_gen_input_hash_idx on ra_ai_generations (input_hash);

-- =============================================================================
-- 5. DOCUMENTS (PDF on-demand, kein Dauer-Storage)
-- =============================================================================

create table ra_documents (
  id              uuid primary key default gen_random_uuid(),
  assessment_id   uuid not null references ra_assessments(id) on delete cascade,
  tenant_id       uuid not null,
  version_id      uuid not null references ra_assessment_versions(id) on delete cascade,
  kind            text not null check (kind in ('pdf','html-snapshot')),
  storage_path    text,                            -- nullable: PDF kann fehlen (regenerierbar)
  byte_size       int,
  sha256          text,
  generated_at    timestamptz not null default now(),
  generator       text,
  expires_at      timestamptz                      -- für Cache-Cleanup
);
create index ra_documents_assessment_idx on ra_documents (assessment_id);

-- =============================================================================
-- 6. AUDIT-EVENTS (append-only, schlankes Schema, KEIN Inhalt)
-- =============================================================================

create table ra_audit_events (
  id              bigserial primary key,
  action          text not null,
  created_at      timestamptz not null default now(),
  actor_user_id   uuid,
  tenant_id       uuid not null,
  target_table    text,
  target_id       text,
  before_hash     text,
  after_hash      text,
  request_id      text,
  metadata        jsonb not null default '{}'
);
create index ra_audit_tenant_created_idx on ra_audit_events (tenant_id, created_at desc);
create index ra_audit_assessment_idx on ra_audit_events (target_table, target_id) where target_table = 'ra_assessments';

-- =============================================================================
-- 7. TRIGGER: updated_at automatisch pflegen
-- =============================================================================

create or replace function ra_touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end$$;

create trigger trg_ra_user_profiles_updated
  before update on ra_user_profiles
  for each row execute procedure ra_touch_updated_at();

create trigger trg_ra_assessments_updated
  before update on ra_assessments
  for each row execute procedure ra_touch_updated_at();

create trigger trg_ra_subscriptions_updated
  before update on ra_subscriptions
  for each row execute procedure ra_touch_updated_at();

-- =============================================================================
-- 8. AUTO-CREATE PROFILE BEI USER-SIGNUP
-- =============================================================================
-- Erstellt einen leeren Profileintrag, sobald ein User in auth.users entsteht.
-- AGB-Akzeptanz wird in der Server-Action (signUpAction) vor signUp geprüft,
-- accepted_terms_at wird dann per UPDATE gesetzt. Onboarding läuft separat.

create or replace function ra_handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.ra_user_profiles (user_id, tenant_id, accepted_terms_at)
  values (new.id, new.id, now())
  on conflict (user_id) do nothing;

  -- Free-Plan als Default-Subscription anlegen
  insert into public.ra_subscriptions (tenant_id, plan_slug, status, provider)
  values (new.id, 'free', 'active', 'stub')
  on conflict (tenant_id) do nothing;

  return new;
end$$;

create trigger trg_auth_user_created
  after insert on auth.users
  for each row execute procedure ra_handle_new_user();

-- =============================================================================
-- 9. RELEASE-VERSION FUNCTION (Quota-Check + Snapshot + Audit)
-- =============================================================================

create or replace function ra_release_version(
  p_assessment_id uuid,
  p_disclaimer_ack boolean,
  p_release_notes text default null
)
returns uuid
language plpgsql security definer set search_path = ''
as $$
declare
  v_user_id  uuid := auth.uid();
  v_tenant   uuid;
  v_plan     text;
  v_max      int;
  v_used     int;
  v_next_v   int;
  v_snapshot jsonb;
  v_id       uuid;
begin
  if v_user_id is null then
    raise exception 'auth_required' using errcode = '42501';
  end if;
  if not p_disclaimer_ack then
    raise exception 'disclaimer_not_acknowledged' using errcode = '22023';
  end if;

  -- Assessment laden + Tenant-Check via RLS implizit
  select tenant_id into v_tenant
    from public.ra_assessments
    where id = p_assessment_id and deleted_at is null
    for update;
  if v_tenant is null then
    raise exception 'assessment_not_found' using errcode = '02000';
  end if;
  if v_tenant <> v_user_id then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  -- Plan + Quota
  select s.plan_slug, p.max_releases
    into v_plan, v_max
    from public.ra_subscriptions s
    join public.ra_plans p on p.slug = s.plan_slug
    where s.tenant_id = v_tenant;
  if v_plan is null then
    raise exception 'subscription_missing' using errcode = '02000';
  end if;

  -- Aktuelle Release-Anzahl (für Free-Limit-Check)
  select count(*) into v_used
    from public.ra_assessment_versions
    where tenant_id = v_tenant;

  if v_max is not null and v_used >= v_max then
    raise exception 'quota_exhausted' using errcode = '53400';
  end if;

  -- Snapshot
  select coalesce(max(version_number),0) + 1
    into v_next_v
    from public.ra_assessment_versions
    where assessment_id = p_assessment_id;

  select jsonb_build_object(
    'company',      step1_company,
    'bg',           step2_bg,
    'areas',        step3_areas,
    'hazards',      step4_hazards,
    'measures',     step5_measures,
    'review',       step6_review,
    'released_at',  now(),
    'plan',         v_plan
  )
    into v_snapshot
    from public.ra_assessments
    where id = p_assessment_id;

  insert into public.ra_assessment_versions
    (assessment_id, tenant_id, version_number, snapshot, released_by,
     release_notes, disclaimer_acknowledged)
    values
    (p_assessment_id, v_tenant, v_next_v, v_snapshot, v_user_id,
     p_release_notes, true)
    returning id into v_id;

  update public.ra_assessments
    set status = 'released', current_version = v_next_v, updated_at = now()
    where id = p_assessment_id;

  insert into public.ra_audit_events
    (action, actor_user_id, tenant_id, target_table, target_id, metadata)
    values
    ('assessment.release', v_user_id, v_tenant, 'ra_assessments',
     p_assessment_id::text, jsonb_build_object('version_number', v_next_v));

  return v_id;
end$$;

-- =============================================================================
-- 10. ROW LEVEL SECURITY
-- =============================================================================

-- Tenant-skopierte Tabellen: tenant_id = auth.uid()

alter table ra_user_profiles enable row level security;
create policy ra_user_profiles_select on ra_user_profiles
  for select using (user_id = auth.uid());
create policy ra_user_profiles_insert on ra_user_profiles
  for insert with check (user_id = auth.uid());
create policy ra_user_profiles_update on ra_user_profiles
  for update using (user_id = auth.uid());

alter table ra_subscriptions enable row level security;
create policy ra_subscriptions_select on ra_subscriptions
  for select using (tenant_id = auth.uid());
-- Update/Insert nur durch Server-Code (service-role); keine User-Policy

alter table ra_assessments enable row level security;
create policy ra_assessments_select on ra_assessments
  for select using (tenant_id = auth.uid() and deleted_at is null);
create policy ra_assessments_insert on ra_assessments
  for insert with check (tenant_id = auth.uid() and owner_user_id = auth.uid());
create policy ra_assessments_update on ra_assessments
  for update using (tenant_id = auth.uid());
-- Hard-Delete nur via service-role (Retention-Job)

alter table ra_assessment_versions enable row level security;
create policy ra_versions_select on ra_assessment_versions
  for select using (tenant_id = auth.uid());
-- Insert ausschließlich via ra_release_version() (security definer)

alter table ra_ai_generations enable row level security;
create policy ra_ai_gen_select on ra_ai_generations
  for select using (tenant_id = auth.uid());
create policy ra_ai_gen_insert on ra_ai_generations
  for insert with check (tenant_id = auth.uid());

alter table ra_documents enable row level security;
create policy ra_documents_select on ra_documents
  for select using (tenant_id = auth.uid());
create policy ra_documents_insert on ra_documents
  for insert with check (tenant_id = auth.uid());

alter table ra_audit_events enable row level security;
create policy ra_audit_select on ra_audit_events
  for select using (tenant_id = auth.uid());
create policy ra_audit_insert on ra_audit_events
  for insert with check (tenant_id = auth.uid());

-- ─── Stammdaten: alle authentifizierten User dürfen lesen ────────────────────
alter table ra_bg_catalog       enable row level security;
alter table ra_risk_catalog     enable row level security;
alter table ra_measure_catalog  enable row level security;
alter table ra_training_catalog enable row level security;
alter table ra_legal_refs       enable row level security;
alter table ra_plans            enable row level security;

create policy ra_bg_catalog_read       on ra_bg_catalog       for select to authenticated using (true);
create policy ra_risk_catalog_read     on ra_risk_catalog     for select to authenticated using (true);
create policy ra_measure_catalog_read  on ra_measure_catalog  for select to authenticated using (true);
create policy ra_training_catalog_read on ra_training_catalog for select to authenticated using (true);
create policy ra_legal_refs_read       on ra_legal_refs       for select to authenticated using (true);
create policy ra_plans_read            on ra_plans            for select to authenticated using (true);
-- Schreiben aller Stammdaten nur via service-role/Migration

-- =============================================================================
-- 11. STORAGE BUCKET für PDFs (privat, Owner-Prefix-Policy)
-- =============================================================================

insert into storage.buckets (id, name, public)
  values ('ra-documents', 'ra-documents', false)
  on conflict (id) do nothing;

create policy ra_storage_select on storage.objects
  for select to authenticated
  using (bucket_id = 'ra-documents' and (storage.foldername(name))[1] = auth.uid()::text);

create policy ra_storage_insert on storage.objects
  for insert to authenticated
  with check (bucket_id = 'ra-documents' and (storage.foldername(name))[1] = auth.uid()::text);

create policy ra_storage_delete on storage.objects
  for delete to authenticated
  using (bucket_id = 'ra-documents' and (storage.foldername(name))[1] = auth.uid()::text);
