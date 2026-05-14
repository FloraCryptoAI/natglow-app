# Setup Manual — Email Transacional NatGlow

> **Aviso legal da IA:** Este documento foi elaborado com auxílio de IA. Verifique os valores exatos de DNS na interface do Resend após criar sua conta — os registros DKIM gerados são únicos para cada domínio.

---

## Visão Geral

O sistema de email do NatGlow usa duas camadas:

| Camada | Finalidade | Serviço |
|---|---|---|
| Emails transacionais | Boas-vindas, confirmação de pagamento, falha, cancelamento, contato | **Resend** |
| Magic links de login | Auth links enviados após checkout | **Resend via Supabase Custom SMTP** |

Ambos exigem verificação de domínio no Resend.

---

## PARTE 1 — Criar Conta no Resend

1. Acesse **https://resend.com** e crie uma conta gratuita
   - Plano Free: 3.000 emails/mês, 100/dia — suficiente para operar em produção inicial
2. Confirme seu email pessoal no Resend

---

## PARTE 2 — Verificar Domínio natglow.app no Namecheap

### O que você vai adicionar

O Resend precisa de 3 registros DNS para verificar que você é dono do domínio e autorizar o envio de emails em nome de `@natglow.app`:

| Tipo | Finalidade |
|---|---|
| TXT (SPF) | Autoriza o Resend a enviar emails pelo seu domínio |
| TXT (DKIM) | Assina criptograficamente os emails para evitar spoofing |
| TXT (DMARC) | Instrui servidores receptores sobre o que fazer com emails não autorizados |

### Passo a passo no Namecheap

#### 1. Acessar o painel DNS

```
namecheap.com → Login → Account → Domain List
→ Ao lado de "natglow.app" clique em [Manage]
→ Aba "Advanced DNS"
```

Visualmente:
```
┌─────────────────────────────────────────┐
│  Domain List                            │
│  natglow.app        [Manage ▸]          │
└─────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────┐
│  Details  Sharing  Redirect  Advanced DNS│
│            (clique aqui) ──────────────^│
└─────────────────────────────────────────┘
```

#### 2. Pegar os registros no Resend

No Resend: **Settings → Domains → Add Domain**
- Digite: `natglow.app`
- Clique em **Add**
- O Resend vai exibir os 3 registros DNS que você precisa adicionar

Os valores serão parecidos com estes (os seus serão diferentes — use os valores exatos do Resend):

**Registro 1 — SPF (TXT)**
```
Host:  @  (ou deixe em branco)
Value: v=spf1 include:amazonses.com ~all
TTL:   Automatic
```

**Registro 2 — DKIM (TXT)**
```
Host:  resend._domainkey
Value: p=MIGfMA0GCSqGSIb3D... (chave longa gerada pelo Resend — copie inteira)
TTL:   Automatic
```

**Registro 3 — DMARC (TXT)**
```
Host:  _dmarc
Value: v=DMARC1; p=none;
TTL:   Automatic
```

#### 3. Adicionar cada registro no Namecheap

Na aba **Advanced DNS**, role até a seção **"Host Records"** e clique em **"Add New Record"** para cada registro:

```
┌──────────────────────────────────────────────────────────┐
│  HOST RECORDS                              [Add New Record]│
│                                                           │
│  Type    Host              Value              TTL        │
│  ─────────────────────────────────────────────────────   │
│  TXT     @                 v=spf1 incl...    Auto        │  ← Registro 1
│  TXT     resend._domainkey p=MIGfMA0G...     Auto        │  ← Registro 2
│  TXT     _dmarc            v=DMARC1;p=none   Auto        │  ← Registro 3
└──────────────────────────────────────────────────────────┘
```

**Dica importante:** No campo "Host" do Namecheap, você NÃO digita o domínio completo. O Namecheap adiciona `.natglow.app` automaticamente. Então:
- Para `@` → deixe como `@`
- Para `resend._domainkey` → digite apenas `resend._domainkey`
- Para `_dmarc` → digite apenas `_dmarc`

#### 4. Verificar propagação

Após salvar os registros, volte ao Resend e clique em **"Verify DNS Records"**.

Para checar a propagação independentemente:
1. Acesse **https://www.whatsmydns.net/**
2. Em "Search Term", cole o host completo: `resend._domainkey.natglow.app`
3. Selecione tipo **TXT**
4. Clique em **Search**
5. Quando a maioria dos servidores mostrar ✅ verde, a propagação aconteceu

**Tempo médio no Namecheap:** 15 minutos a 2 horas. Raramente passa de 24h.

---

## PARTE 3 — Gerar API Key no Resend

1. No Resend: **API Keys → Create API Key**
   - Name: `natglow-production`
   - Permission: **Full access**
   - Domain: `natglow.app` (restringir ao seu domínio verificado)
2. Copie a chave gerada — ela começa com `re_...`
   - **Atenção:** ela só é exibida uma vez

---

## PARTE 4 — Adicionar Secrets no Supabase

### Via Dashboard Supabase

1. Acesse **Supabase Dashboard → seu projeto → Edge Functions → Secrets (Manage secrets)**
2. Adicione o seguinte secret:

| Key | Value |
|---|---|
| `RESEND_API_KEY` | `re_xxxxxxxxxxxxxxxxxxxx` (sua chave do Resend) |

### Via CLI (alternativa)

```bash
supabase secrets set RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxx
```

---

## PARTE 5 — Configurar Supabase Auth para usar Resend como SMTP

Isso faz com que os magic links de login saiam com identidade NatGlow em vez do email genérico do Supabase.

### Obter credenciais SMTP do Resend

No Resend: **Settings → SMTP → Credentials**

Você verá:
```
Host:     smtp.resend.com
Port:     465  (SSL) ou 587 (TLS)
Username: resend
Password: sua API Key (re_...)
```

### Configurar no Supabase

1. Acesse **Supabase Dashboard → Authentication → Providers → Email**
2. Role até a seção **"SMTP Settings"** e habilite **"Custom SMTP"**
3. Preencha:

| Campo | Valor |
|---|---|
| SMTP Host | `smtp.resend.com` |
| SMTP Port | `465` |
| SMTP User | `resend` |
| SMTP Password | `re_xxxxxxxxxxxxxxxxxxxx` (sua API Key) |
| Sender Name | `NatGlow` |
| Sender Email | `hello@natglow.app` |

4. Clique em **Save**

### Customizar o template do magic link (opcional mas recomendado)

1. Em **Authentication → Email Templates → Magic Link**
2. Substitua o conteúdo pelo HTML abaixo:

```html
<h2>Acesse sua conta NatGlow</h2>
<p>Clique no link abaixo para entrar. O link expira em 1 hora.</p>
<p><a href="{{ .ConfirmationURL }}" style="display:inline-block;padding:12px 24px;background:linear-gradient(135deg,#FB45A9,#E03594);color:#fff;font-weight:700;border-radius:9999px;text-decoration:none">Acessar NatGlow →</a></p>
<p style="color:#a8a29e;font-size:12px">Se você não solicitou este link, ignore este email.</p>
```

---

## PARTE 6 — Criar email support@natglow.app

Você tem duas opções gratuitas:

### Opção A — Namecheap Email Forwarding (mais simples)

O Namecheap oferece redirecionamento de email gratuito para domínios registrados com eles.

1. No Namecheap: **Domain List → natglow.app → Manage → Email Forwarding**
2. Clique em **"Add Forwarder"**:
   - Forward From: `support`
   - Forward To: `seu-email-pessoal@gmail.com` (ou qualquer caixa que você monitore)
3. Salve
4. Agora emails enviados para `support@natglow.app` chegam na sua caixa pessoal
5. Para **responder como** `support@natglow.app` no Gmail: Settings → Accounts → "Add another email address" → use SMTP do Resend

### Opção B — Cloudflare Email Routing (se migrar DNS para Cloudflare)

Se você usar o Cloudflare como nameserver do `natglow.app`:
1. Cloudflare Dashboard → Email → Email Routing → Addresses
2. Adicione `support@natglow.app` → encaminha para seu Gmail
3. É gratuito e ilimitado

**Recomendação:** A Opção A (Namecheap forwarding) é mais rápida se você não quiser migrar nameservers agora.

---

## PARTE 7 — Fazer Deploy das Edge Functions

Após configurar tudo, faça o deploy das novas funções:

```bash
supabase functions deploy send-transactional-email
supabase functions deploy send-contact-message
```

E reimplante o webhook (se modificou):
```bash
supabase functions deploy stripe-webhook
```

---

## PARTE 8 — Testar Envio de Email

### Testar manualmente via curl (depois de deploy)

Substitua `<SUPABASE_URL>` e `<ANON_KEY>` pelos valores do seu projeto:

```bash
# Testar template welcome
curl -X POST https://<SUPABASE_URL>/functions/v1/send-transactional-email \
  -H "Authorization: Bearer <ANON_KEY>" \
  -H "Content-Type: application/json" \
  -d '{
    "to": "lucas.5000benigno@gmail.com",
    "template": "welcome",
    "locale": "en",
    "data": {}
  }'

# Testar template payment_failed
curl -X POST https://<SUPABASE_URL>/functions/v1/send-transactional-email \
  -H "Authorization: Bearer <ANON_KEY>" \
  -H "Content-Type: application/json" \
  -d '{
    "to": "lucas.5000benigno@gmail.com",
    "template": "payment_failed",
    "locale": "en",
    "data": {}
  }'
```

### Testar formulário de contato

1. Acesse `https://app.natglow.app/contact`
2. Preencha o formulário
3. Verifique se chega em `support@natglow.app`
4. Verifique se foi salvo na tabela `contact_messages` no Supabase

---

## PARTE 9 — Rodar Migration SQL

No **Supabase Dashboard → SQL Editor**, rode:

```sql
-- Cole o conteúdo de supabase/migrations/20260514000001_contact_messages.sql
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
```

---

## Checklist Final

- [ ] Conta criada no Resend
- [ ] Domínio `natglow.app` verificado no Resend (3 registros DNS no Namecheap)
- [ ] Propagação DNS confirmada no whatsmydns.net
- [ ] `RESEND_API_KEY` adicionada nos Supabase Secrets
- [ ] Supabase Auth → Custom SMTP configurado com credenciais do Resend
- [ ] Template de magic link atualizado (opcional)
- [ ] Email `support@natglow.app` criado (forwarding no Namecheap)
- [ ] Migration `contact_messages` rodada no SQL Editor
- [ ] Edge functions deployadas (`send-transactional-email`, `send-contact-message`, `stripe-webhook`)
- [ ] Template de welcome testado — chegou na caixa de entrada
- [ ] Template de payment_failed testado
- [ ] Formulário de contato testado — email chegou em `support@natglow.app`

---

## Observações Importantes

**Modo sandbox do Resend:** Enquanto o domínio não estiver verificado, o Resend só envia emails para o endereço cadastrado na conta deles (seu email pessoal). Emails para outros destinatários ficam em modo sandbox. Verifique o domínio antes de ativar o Stripe Live Mode.

**SPF com outros serviços:** Se você já tem um registro SPF (`v=spf1 ...`) no `@`, não crie um segundo — isso invalida o SPF. Combine os `include:` em um único registro:
```
v=spf1 include:amazonses.com include:outro-servico.com ~all
```

**Limite free tier Resend:** 3.000 emails/mês e 100/dia. Para escalar, o plano Pro custa $20/mês com 50.000 emails. Não é necessário agora.
