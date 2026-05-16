# SETUP-MANUAL-AUTH.md
# Configuração Manual — Sistema de Autenticação NatGlow

## Visão geral

O NatGlow usa dois fluxos de login para clientes:
1. **Magic link** — Supabase envia um email com link direto; clicar faz login instantâneo
2. **Código de 6 dígitos** — edge function `send-login-code` envia o código via Resend; cliente digita no app

Admins continuam usando o fluxo separado (email + senha → OTP) via `admin-auth-step1/step2`. Não alterar.

---

## PASSO 1 — Rodar migration SQL

No [Supabase Dashboard](https://supabase.com/dashboard) → seu projeto → **SQL Editor** → **New query**:

Cole e execute:

```sql
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

alter table public.auth_codes enable row level security;
```

Confirma que a tabela `auth_codes` aparece em **Table Editor**.

---

## PASSO 2 — Verificar Custom SMTP ativo

Supabase Dashboard → **Authentication** → **Email Settings** (ou **Auth** → **Settings** → **SMTP Settings**):

- **Enable Custom SMTP**: deve estar **ligado** (toggle ON)
- **SMTP Host**: `smtp.resend.com`
- **Port**: `465`
- **Username**: `resend`
- **Password**: sua `RESEND_API_KEY`
- **Sender name**: `NatGlow`
- **Sender email**: `hello@natglow.app`

Se estiver desligado, magic links do Supabase sairão sem branding NatGlow.

---

## PASSO 3 — Aumentar validade do magic link (recomendado)

Por padrão, magic links expiram em **1 hora**. Para o welcome email (cliente pode demorar a abrir), aumente para **24 horas**:

Supabase Dashboard → **Authentication** → **Email** → **Email link expiry** (ou **URL Configuration**):

- **Email link validity period**: `86400` segundos (= 24 horas)

Salvar.

---

## PASSO 4 — Customizar template de Magic Link no Supabase Auth

Supabase Dashboard → **Authentication** → **Email Templates** → selecione **Magic Link**:

**Subject:** `Your NatGlow login link`

**Body (HTML):** Cole o HTML abaixo:

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <title>NatGlow Login</title>
</head>
<body style="margin:0;padding:0;background:#fafaf9;font-family:system-ui,-apple-system,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#fafaf9;padding:32px 16px">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:480px">

        <!-- Header -->
        <tr><td style="background:linear-gradient(135deg,#FB45A9,#E03594);border-radius:16px 16px 0 0;padding:24px 32px;text-align:center">
          <p style="margin:0;font-size:22px;font-weight:800;color:#ffffff;letter-spacing:-0.3px">NatGlow</p>
        </td></tr>

        <!-- Card -->
        <tr><td style="background:#ffffff;border-radius:0 0 16px 16px;border:1px solid #e7e5e4;border-top:none;padding:36px 28px;text-align:center">
          <p style="margin:0 0 6px;font-size:18px;font-weight:800;color:#1c1917">Your login link</p>
          <p style="margin:0 0 28px;font-size:14px;color:#78716c;line-height:1.6">
            Click the button below to log in to NatGlow.<br/>
            This link expires in <strong>24 hours</strong> and can only be used once.
          </p>

          <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px">
            <tr><td align="center">
              <a href="{{ .ConfirmationURL }}"
                 style="display:inline-block;padding:16px 40px;background:linear-gradient(135deg,#FB45A9,#E03594);color:#ffffff;font-weight:800;font-size:15px;border-radius:9999px;text-decoration:none">
                Enter NatGlow →
              </a>
            </td></tr>
          </table>

          <p style="margin:0;font-size:12px;color:#a8a29e;line-height:1.6">
            If you didn't request this, you can safely ignore this email.<br/>
            Never share this link with anyone.
          </p>
        </td></tr>

        <!-- Footer -->
        <tr><td style="padding-top:20px;text-align:center">
          <p style="font-size:11px;color:#a8a29e;margin:0 0 6px">© 2025 NatGlow. All rights reserved.</p>
          <p style="font-size:11px;color:#a8a29e;margin:0">
            <a href="https://app.natglow.app/privacy" style="color:#a8a29e;text-decoration:none">Privacy</a>
            &nbsp;·&nbsp;
            <a href="https://app.natglow.app/contact" style="color:#a8a29e;text-decoration:none">Support</a>
          </p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>
```

Clique **Save**.

> **Nota sobre idioma:** O Supabase Auth não suporta templates multilíngues nativos. Este template é em inglês. Clientes em espanhol que usam magic link do Supabase receberão o email em inglês. O fluxo de código de 6 dígitos é totalmente bilíngue (EN/ES) porque usa o Resend diretamente.

---

## PASSO 5 — Configurar Site URL e Redirect URLs

Supabase Dashboard → **Authentication** → **URL Configuration**:

- **Site URL**: `https://app.natglow.app`
- **Redirect URLs** (adicionar se não existir):
  - `https://app.natglow.app/auth/callback`
  - `http://localhost:5173/auth/callback` (para desenvolvimento)

Salvar.

---

## PASSO 6 — Deploy das edge functions

No terminal, na raiz do projeto:

```bash
# Novas funções de autenticação
supabase functions deploy send-login-code --no-verify-jwt
supabase functions deploy verify-login-code --no-verify-jwt

# Atualização do webhook (magic link no welcome email)
supabase functions deploy stripe-webhook --no-verify-jwt

# Atualização do email transacional (template welcome atualizado)
supabase functions deploy send-transactional-email --no-verify-jwt
```

> `login-by-email` foi removido. Não fazer deploy dele.

---

## PASSO 7 — Checar Supabase Secrets

Supabase Dashboard → **Edge Functions** → **Secrets** — confirmar que existem:

| Chave | Valor |
|---|---|
| `SUPABASE_URL` | URL do projeto Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key |
| `RESEND_API_KEY` | Chave da API do Resend |
| `SITE_URL` | `https://app.natglow.app` |

Todos já devem estar configurados do setup anterior.

---

## Checklist de testes manuais

### Cenário 1 — Magic link (fluxo primário)
1. Ir para `/Login`
2. Digitar email de uma usuária ativa
3. Clicar "Send me a login link"
4. Verificar que aparece a tela de confirmação com o email
5. Abrir email recebido → deve ter branding NatGlow e botão "Enter NatGlow →"
6. Clicar no link → deve redirecionar para `/auth/callback` → `/HairDashboard`

### Cenário 2 — Código de 6 dígitos
1. Ir para `/Login`
2. Digitar email de uma usuária ativa
3. Clicar "Send me a 6-digit code"
4. Verificar que aparece tela com 6 inputs
5. Abrir email → verificar código de 6 dígitos com visual NatGlow
6. Digitar o código → deve logar e ir para `/HairDashboard`

### Cenário 3 — Código incorreto (rate limiting)
1. Solicitar código
2. Digitar código errado 5 vezes
3. Verificar mensagem de "too many attempts"
4. Solicitar novo código → deve funcionar normalmente

### Cenário 4 — Link expirado
1. Clicar em link de magic link expirado (ou modificar parâmetro na URL)
2. `/auth/callback` deve detectar o erro e redirecionar para `/Login?expired=true`
3. Verificar que banner amarelo aparece em `/Login`
4. Verificar que o botão "code" fica como primário (prioridade invertida)

### Cenário 5 — Link já usado
1. Clicar no mesmo magic link duas vezes
2. Segunda vez deve redirecionar para `/Login?used=true`
3. Verificar banner amarelo

### Cenário 6 — Email não cadastrado
1. Digitar email que não existe nas subscriptions
2. Solicitar magic link → tela de confirmação aparece normalmente (privacidade)
3. Solicitar código → tela de input aparece normalmente (privacidade)
4. Código não chega (email não cadastrado, mas usuária não sabe)

### Cenário 7 — /success após compra nova
1. Completar compra via Stripe (modo test)
2. Ser redirecionado para `/success?session_id=...`
3. Verificar que email é exibido
4. Verificar que magic link é enviado automaticamente
5. Abrir email → clicar no link → deve entrar no app

### Cenário 8 — Welcome email com magic link
1. Completar compra (nova usuária)
2. Verificar welcome email recebido
3. Botão "Go to NatGlow →" deve ter link de acesso direto (não genérico)
4. Clicar → deve entrar no app (válido por 1h por padrão, 24h se configurado no Passo 3)

### Cenário 9 — Usuária já logada acessando /Login
1. Logar normalmente
2. Acessar `/Login` diretamente
3. Deve redirecionar para `/HairDashboard` sem mostrar a tela de login

### Cenário 10 — Rate limiting de código
1. Solicitar código com o mesmo IP/email 3+ vezes em 1 hora
2. Após o limite, o código não chega mais (mas a resposta ainda é `{ success: true }` — privacidade)
3. Após 1 hora, volta a funcionar normalmente

---

## Pendências e limitações conhecidas

- **Magic link template bilíngue:** O Supabase Auth tem apenas um template por tipo de email. Clientes ES recebem o magic link em EN. O fluxo de código de 6 dígitos é totalmente bilíngue. Solução futura: implementar envio de magic link via Resend (bypassa template do Supabase Auth).

- **Magic link expiry global:** A configuração de validade em `/Authentication → Email link validity period` é global para todos os magic links do projeto (incluindo admin e outros usos). Recomendado: 24h (86400s) para melhorar UX do welcome email.

- **Supabase Auth POST /verify endpoint:** O `verify-login-code` chama `POST /auth/v1/verify` server-side para obter `access_token` + `refresh_token` diretamente, sem expor tokens no frontend ou URL. Isso depende do comportamento da API GoTrue do Supabase — se houver mudança de API, monitorar.

- **Google OAuth:** O botão Google foi removido do `/Login`. Usuárias que criaram conta via Google podem usar magic link com o mesmo email — o Supabase vincula automaticamente as contas. O provider Google continua ativo no Supabase Auth, não desativar.
