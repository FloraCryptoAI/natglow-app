-- Templates for automated notifications (admin-configurable)
create table public.notification_templates (
  id           uuid primary key default gen_random_uuid(),
  type         text not null unique,
  enabled      boolean not null default true,
  title_en     text not null default '',
  title_es     text not null default '',
  body_en      text not null default '',
  body_es      text not null default '',
  url          text not null default '/HairDashboard',
  icon_url     text,
  interval_days int not null default 7,
  updated_at   timestamptz not null default now()
);

-- Track last auto notification sent per user per type (for cooldown)
create table public.auto_notif_sent (
  user_id  uuid not null references auth.users(id) on delete cascade,
  type     text not null,
  sent_at  timestamptz not null default now(),
  primary key (user_id, type)
);
create index on public.auto_notif_sent(type, sent_at);

-- Seed default templates
insert into public.notification_templates
  (type, title_en, title_es, body_en, body_es, url, interval_days)
values
  ('routine_reminder',
   'Time for your hair treatment! 🌿',
   '¡Es hora de tu tratamiento! 🌿',
   'You haven''t logged your weekly treatment yet. Open the app to continue your routine.',
   'Aún no registraste tu tratamiento semanal. Abre la app para continuar tu rutina.',
   '/HairPlan', 7),

  ('daily_tip',
   'Hair care tip of the day 💧',
   'Consejo del día 💧',
   'Remember: avoid hot water when rinsing. Lukewarm water seals the cuticle and reduces frizz.',
   'Recuerda: evita el agua caliente. El agua tibia cierra la cutícula y reduce el frizz.',
   '/HairDashboard', 2),

  ('reactivation_7',
   'We miss you! 🌿',
   '¡Te extrañamos! 🌿',
   'Your hair routine is waiting. Come back and keep your progress going!',
   'Tu rutina capilar te espera. ¡Vuelve y sigue con tu progreso!',
   '/HairDashboard', 7),

  ('reactivation_14',
   'Your hair deserves attention 💆',
   'Tu cabello merece atención 💆',
   'It''s been 2 weeks. A small step is all it takes — open the app and get back on track.',
   'Han pasado 2 semanas. Un pequeño paso es todo lo que necesitas — abre la app.',
   '/HairDashboard', 14),

  ('reactivation_30',
   'Still here for you 💪',
   'Aquí seguimos para ti 💪',
   'It''s been a month! Your plan is still active. Let''s start fresh — your hair will thank you.',
   '¡Ha pasado un mes! Tu plan sigue activo. Empecemos de nuevo — tu cabello te lo agradecerá.',
   '/HairDashboard', 30);

-- RPC: get eligible user_ids + lang for a given auto notification type
-- Returns each user only once (latest subscription endpoint's lang if multiple devices)
create or replace function public.get_auto_notif_users(p_type text, p_interval_days int)
returns table(user_id uuid, lang text)
language plpgsql security definer
as $$
declare
  v_cutoff timestamptz := now() - (p_interval_days || ' days')::interval;
begin
  if p_type = 'routine_reminder' then
    -- Users who haven't updated their plan in p_interval_days AND have a push subscription
    return query
      select distinct on (ns.user_id) ns.user_id, coalesce(ns.lang, 'en')
      from public.notification_subscriptions ns
      join public.hair_plan_state hps on hps.user_id = ns.user_id
      where hps.updated_at < v_cutoff
        and not exists (
          select 1 from public.auto_notif_sent ans
          where ans.user_id = ns.user_id and ans.type = p_type and ans.sent_at > v_cutoff
        )
      order by ns.user_id, ns.last_used_at desc nulls last;

  elsif p_type = 'daily_tip' then
    -- All users with push subscriptions (respects interval cooldown)
    return query
      select distinct on (ns.user_id) ns.user_id, coalesce(ns.lang, 'en')
      from public.notification_subscriptions ns
      where not exists (
          select 1 from public.auto_notif_sent ans
          where ans.user_id = ns.user_id and ans.type = p_type and ans.sent_at > v_cutoff
        )
      order by ns.user_id, ns.last_used_at desc nulls last;

  elsif p_type like 'reactivation_%' then
    -- Inactive users (last_access older than interval) with push subscriptions
    return query
      select distinct on (ns.user_id) ns.user_id, coalesce(ns.lang, 'en')
      from public.notification_subscriptions ns
      join public.subscriptions s on s.user_id = ns.user_id
      where s.last_access < v_cutoff
        and s.status = 'active'
        and not exists (
          select 1 from public.auto_notif_sent ans
          where ans.user_id = ns.user_id and ans.type = p_type and ans.sent_at > v_cutoff
        )
      order by ns.user_id, ns.last_used_at desc nulls last;
  end if;
end;
$$;
