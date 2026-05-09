-- Fix 1: store author_name in feed_posts at insert time
-- (avoids cross-user RLS issues on subscriptions table)
alter table public.feed_posts
  add column if not exists author_name text;

-- Fix 2: daily post limit — max 20 posts per user per day
create or replace function public.check_feed_daily_limit()
returns trigger language plpgsql security definer as $$
begin
  if (
    select count(*)
    from public.feed_posts
    where user_id = NEW.user_id
      and created_at >= current_date::timestamptz
      and created_at <  (current_date + interval '1 day')::timestamptz
  ) >= 20 then
    raise exception 'daily_post_limit_exceeded';
  end if;
  return NEW;
end;
$$;

create trigger trg_feed_daily_limit
  before insert on public.feed_posts
  for each row
  when (NEW.user_id is not null and NEW.is_admin = false)
  execute function public.check_feed_daily_limit();
