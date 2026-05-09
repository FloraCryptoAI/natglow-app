-- Feed v2: feelings, dual images, avatars

ALTER TABLE public.feed_posts
  ADD COLUMN IF NOT EXISTS feeling text
    CHECK (feeling IN (
      'happy_results','sad_hair','surprised_recipes',
      'loving_journey','excited_progress','motivated','hopeful'
    )),
  ADD COLUMN IF NOT EXISTS image_url_2 text,
  ADD COLUMN IF NOT EXISTS author_avatar_url text;

ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS avatar_url text;
