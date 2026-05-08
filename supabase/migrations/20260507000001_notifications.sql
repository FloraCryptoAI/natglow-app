-- ─────────────────────────────────────────────────────────────────────────────
-- Migration: PWA push notifications + in-app notification bell
-- ─────────────────────────────────────────────────────────────────────────────

-- In-app notifications (lidas pelo usuário no sino)
create table if not exists public.notifications (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references auth.users(id) on delete cascade,
  title_en          text not null,
  title_es          text not null,
  body_en           text not null,
  body_es           text not null,
  url               text,
  icon_url          text,
  type              text not null default 'manual'
                      check (type in ('manual', 'automatic', 'system')),
  read_at           timestamptz,
  sent_via_push     boolean not null default false,
  created_at        timestamptz not null default now()
);

alter table public.notifications enable row level security;

create policy "users read own notifications"
  on public.notifications for select
  using (auth.uid() = user_id);

create policy "users update own notifications"
  on public.notifications for update
  using (auth.uid() = user_id);

create index if not exists notifications_user_id_idx
  on public.notifications (user_id);

create index if not exists notifications_unread_idx
  on public.notifications (user_id, created_at desc)
  where read_at is null;


-- Push subscriptions (endpoints VAPID de cada dispositivo)
create table if not exists public.notification_subscriptions (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  endpoint      text not null unique,
  keys          jsonb not null,  -- { p256dh, auth }
  user_agent    text,
  created_at    timestamptz not null default now(),
  last_used_at  timestamptz not null default now()
);

alter table public.notification_subscriptions enable row level security;

create policy "users manage own subscriptions"
  on public.notification_subscriptions for all
  using (auth.uid() = user_id);

create index if not exists notification_subscriptions_user_id_idx
  on public.notification_subscriptions (user_id);


-- Histórico de disparos (admin) — sem RLS, acesso via service role
create table if not exists public.notification_history (
  id             uuid primary key default gen_random_uuid(),
  sent_at        timestamptz not null default now(),
  segmentation   jsonb,
  title_en       text not null,
  title_es       text not null,
  body_en        text not null,
  body_es        text not null,
  url            text,
  channels       text[] not null,
  total_sent     int not null default 0,
  total_failed   int not null default 0,
  total_clicked  int not null default 0,
  sent_by        uuid references auth.users(id)
);

-- RPC para incrementar total_clicked sem race condition
create or replace function public.increment_notification_clicks(row_id uuid)
returns void
language sql
security definer
as $$
  update public.notification_history
  set total_clicked = total_clicked + 1
  where id = row_id;
$$;


-- Preferências de notificação da usuária (persiste entre dispositivos)
alter table public.subscriptions
  add column if not exists notification_preferences jsonb
  not null default '{"promotions": true, "newsletter": true}'::jsonb;
