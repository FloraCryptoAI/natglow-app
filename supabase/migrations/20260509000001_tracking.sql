-- ─────────────────────────────────────────────────────────────────────────────
-- Tracking & Marketing infrastructure
-- ─────────────────────────────────────────────────────────────────────────────

-- Public app configuration (pixel IDs, enabled flags)
create table if not exists public.app_config (
  key        text primary key,
  value      jsonb not null,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id)
);

-- Secrets (CAPI tokens, Access tokens) — no RLS policies = only service_role
create table if not exists public.app_config_secrets (
  key        text primary key,
  value      text not null,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id)
);
alter table public.app_config_secrets enable row level security;

-- Tracking events log (server-side CAPI/Events API outcomes)
-- No public RLS — only accessible by service_role
create table if not exists public.tracking_events_log (
  id         uuid primary key default gen_random_uuid(),
  platform   text not null,   -- 'facebook' | 'tiktok'
  event_name text not null,
  event_id   text not null,
  source     text not null default 'server',  -- 'browser' | 'server'
  success    boolean not null default false,
  response   jsonb,
  created_at timestamptz not null default now()
);
alter table public.tracking_events_log enable row level security;

create index if not exists tracking_events_log_platform_created
  on public.tracking_events_log(platform, created_at desc);

create index if not exists tracking_events_log_event_id
  on public.tracking_events_log(event_id);

-- Attribution column on subscriptions
alter table public.subscriptions
  add column if not exists attribution jsonb;

-- Seed default config values
insert into public.app_config (key, value) values
  ('tracking.facebook.pixel_id',       '""'),
  ('tracking.facebook.enabled',        'false'),
  ('tracking.facebook.test_event_code','""'),
  ('tracking.tiktok.pixel_id',         '""'),
  ('tracking.tiktok.enabled',          'false'),
  ('tracking.consent.required',        'true')
on conflict (key) do nothing;
