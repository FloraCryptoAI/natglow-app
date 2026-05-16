-- Tabela de códigos de autenticação para login de clientes
create table public.auth_codes (
  id         uuid primary key default gen_random_uuid(),
  email      text not null,
  code       text not null,
  expires_at timestamptz not null,
  used_at    timestamptz,
  attempts   int not null default 0,
  ip_address text,
  created_at timestamptz not null default now()
);

create index on public.auth_codes (email, expires_at);
create index on public.auth_codes (expires_at) where used_at is null;

-- Sem políticas de acesso de linha — apenas service role acessa via edge functions
alter table public.auth_codes enable row level security;
