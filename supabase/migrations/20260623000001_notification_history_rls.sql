-- Fix: Enable RLS on notification_history (admin-only table)
--
-- The original migration (20260507000001_notifications.sql) created this
-- table without RLS, assuming only the admin edge function (using
-- service_role) would access it. Supabase's Security Advisor flags this
-- because the table is in the `public` schema, which is exposed via the
-- PostgREST Data API — anyone with the anon key could query it.
--
-- Strategy: enable RLS with NO policies. With RLS on + zero policies:
--   - anon / authenticated roles get blocked (zero rows visible)
--   - service_role bypasses RLS (admin edge function keeps working)
--
-- The increment_notification_clicks RPC is SECURITY DEFINER so it also
-- continues to work (it runs as table owner, bypassing RLS).

alter table public.notification_history enable row level security;
