-- Contact messages table for support form submissions
create table public.contact_messages (
  id           uuid primary key default gen_random_uuid(),
  name         text not null,
  email        text not null,
  category     text not null,
  message      text not null,
  ip_address   text,
  user_agent   text,
  created_at   timestamptz not null default now(),
  responded_at timestamptz,
  notes        text
);

alter table public.contact_messages enable row level security;
-- Only accessible via service_role (admin); no user-facing RLS policy needed
