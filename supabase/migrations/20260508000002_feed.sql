-- Feed: posts, reactions, comments
-- display_name column on subscriptions for community posts

alter table public.subscriptions
  add column if not exists display_name text
  check (char_length(display_name) between 3 and 30);

-- ── feed_posts ────────────────────────────────────────────────────────────────
create table public.feed_posts (
  id               uuid        primary key default gen_random_uuid(),
  user_id          uuid        references auth.users(id) on delete cascade,
  is_admin         boolean     not null default false,
  content          text        not null check (char_length(content) between 1 and 1000),
  image_url        text,
  status           text        not null default 'pending'
                               check (status in ('pending','approved','rejected')),
  rejection_reason text,
  reactions        jsonb       not null default '{"heart":0,"love":0,"clap":0,"wow":0}'::jsonb,
  comments_count   int         not null default 0,
  created_at       timestamptz not null default now(),
  approved_at      timestamptz
);

alter table public.feed_posts enable row level security;

-- authenticated users see approved posts OR their own
create policy "feed_posts_select" on public.feed_posts
  for select using (status = 'approved' or auth.uid() = user_id);

-- users may insert their own non-admin posts (status defaults to 'pending')
create policy "feed_posts_insert" on public.feed_posts
  for insert with check (auth.uid() = user_id and is_admin = false);

-- users may delete only their own pending posts
create policy "feed_posts_delete_own_pending" on public.feed_posts
  for delete using (auth.uid() = user_id and status = 'pending');

-- ── feed_reactions ────────────────────────────────────────────────────────────
create table public.feed_reactions (
  post_id    uuid  not null references public.feed_posts(id) on delete cascade,
  user_id    uuid  not null references auth.users(id) on delete cascade,
  reaction   text  not null check (reaction in ('heart','love','clap','wow')),
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);

alter table public.feed_reactions enable row level security;

create policy "feed_reactions_select" on public.feed_reactions
  for select using (true);

create policy "feed_reactions_manage" on public.feed_reactions
  for all using (auth.uid() = user_id);

-- ── feed_comments ─────────────────────────────────────────────────────────────
create table public.feed_comments (
  id         uuid        primary key default gen_random_uuid(),
  post_id    uuid        not null references public.feed_posts(id) on delete cascade,
  user_id    uuid        not null references auth.users(id) on delete cascade,
  parent_id  uuid        references public.feed_comments(id) on delete cascade,
  content    text        not null check (char_length(content) between 1 and 500),
  created_at timestamptz not null default now()
);

alter table public.feed_comments enable row level security;

create policy "feed_comments_select" on public.feed_comments
  for select using (true);

create policy "feed_comments_insert" on public.feed_comments
  for insert with check (auth.uid() = user_id);

create policy "feed_comments_delete_own" on public.feed_comments
  for delete using (auth.uid() = user_id);

-- ── comments_count trigger ────────────────────────────────────────────────────
create or replace function public.update_feed_comments_count()
returns trigger language plpgsql security definer as $$
begin
  if TG_OP = 'INSERT' then
    update public.feed_posts
      set comments_count = comments_count + 1
      where id = NEW.post_id;
  elsif TG_OP = 'DELETE' then
    update public.feed_posts
      set comments_count = greatest(comments_count - 1, 0)
      where id = OLD.post_id;
  end if;
  return null;
end;
$$;

create trigger trg_feed_comments_count
  after insert or delete on public.feed_comments
  for each row execute function public.update_feed_comments_count();

-- ── toggle_feed_reaction RPC ──────────────────────────────────────────────────
-- Atomically adds or removes a reaction (and swaps if different type selected).
-- Returns { action: 'added'|'removed'|'swapped', reaction: <type> }
create or replace function public.toggle_feed_reaction(p_post_id uuid, p_reaction text)
returns jsonb language plpgsql security definer as $$
declare
  v_uid          uuid := auth.uid();
  v_old_reaction text;
begin
  -- Check for existing reaction by this user on this post
  select reaction into v_old_reaction
    from public.feed_reactions
    where post_id = p_post_id and user_id = v_uid;

  if v_old_reaction is not null then
    -- Always remove the old reaction first
    delete from public.feed_reactions
      where post_id = p_post_id and user_id = v_uid;
    update public.feed_posts
      set reactions = jsonb_set(
        reactions,
        array[v_old_reaction],
        to_jsonb(greatest((reactions->>v_old_reaction)::int - 1, 0))
      )
      where id = p_post_id;

    -- If same reaction → just removed
    if v_old_reaction = p_reaction then
      return jsonb_build_object('action', 'removed', 'reaction', p_reaction);
    end if;
  end if;

  -- Add the new reaction
  insert into public.feed_reactions(post_id, user_id, reaction)
    values (p_post_id, v_uid, p_reaction);
  update public.feed_posts
    set reactions = jsonb_set(
      reactions,
      array[p_reaction],
      to_jsonb((reactions->>p_reaction)::int + 1)
    )
    where id = p_post_id;

  return jsonb_build_object(
    'action',   case when v_old_reaction is not null then 'swapped' else 'added' end,
    'reaction', p_reaction
  );
end;
$$;
