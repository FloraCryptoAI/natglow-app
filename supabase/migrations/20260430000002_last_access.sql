alter table public.subscriptions
  add column if not exists last_access  timestamptz,
  add column if not exists canceled_at  timestamptz;

create index if not exists subscriptions_last_access_idx
  on public.subscriptions (last_access)
  where last_access is not null;

create index if not exists subscriptions_canceled_at_idx
  on public.subscriptions (canceled_at)
  where canceled_at is not null;
