create table if not exists public.funnel_events (
  id          uuid        not null default gen_random_uuid() primary key,
  event_type  text        not null,
  session_id  text        not null,
  user_id     uuid        references auth.users(id) on delete set null,
  idioma      text,
  pais        text,
  metadata    jsonb,
  created_at  timestamptz not null default now()
);

create index if not exists funnel_events_session_idx
  on public.funnel_events (session_id);

create index if not exists funnel_events_type_created_idx
  on public.funnel_events (event_type, created_at desc);

create index if not exists funnel_events_user_idx
  on public.funnel_events (user_id)
  where user_id is not null;

alter table public.funnel_events enable row level security;

-- Anon and authenticated users can insert (tracking only — no read)
do $$ begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename  = 'funnel_events'
      and policyname = 'funnel_events_insert'
  ) then
    execute 'create policy "funnel_events_insert" on public.funnel_events
      for insert to anon, authenticated with check (true)';
  end if;
end $$;

-- No client-side reads — admin reads via service role (bypasses RLS)
