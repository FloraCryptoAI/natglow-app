-- Feed admin engagement: allow admin-injected fake comments + reactions on posts
--
-- The original schema required every comment + reaction to be tied to a real
-- auth.users row. That's correct for organic engagement but blocks the admin
-- from seeding posts (their own or "fake user" posts) with realistic comments
-- and reaction counts before real users start engaging.
--
-- Changes:
--  - feed_comments.user_id becomes nullable (admin fakes have user_id = null)
--  - feed_comments gets author_name + author_avatar_url for the fake identity
--  - Reactions are set directly on feed_posts.reactions JSONB by the admin
--    edge function; no schema change needed for that (the JSONB column already
--    exists). Skipping feed_reactions table inserts for fakes is intentional —
--    those rows require a real user_id and have a composite PK, and reading
--    the count comes from the JSONB anyway.

alter table public.feed_comments
  alter column user_id drop not null;

alter table public.feed_comments
  add column if not exists author_name text,
  add column if not exists author_avatar_url text;
