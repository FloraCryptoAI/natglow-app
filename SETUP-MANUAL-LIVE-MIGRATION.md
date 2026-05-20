# NatGlow — Migração Stripe Test → Live Mode

> **⚠️ ATENÇÃO:** Execute cada seção NA ORDEM EXATA. Não pule etapas.
> **⚠️ CRÍTICO:** Antes de iniciar, confirme que o banco já foi resetado (Fase 1 do Claude).

---

## PRÉ-REQUISITO: Verificação do banco

Antes de qualquer coisa, confirme no Supabase SQL Editor que o banco está zerado:

**Link:** https://supabase.com/dashboard/project/kspbgslqdlnnylqsvnji/sql

```sql
SELECT tablename,
  (xpath('/row/count/text()', query_to_xml(
    format('SELECT COUNT(*) FROM public.%I', tablename), false, true, ''))
  )[1]::text::int AS row_count
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;
```

**Resultado esperado:** todas as tabelas com `row_count = 0`
(exceto `app_config` e `notification_templates` que têm valores default do seed)

---

## SEÇÃO 1: Pré-requisitos Stripe

### 1.1 — Confirmar que a conta está ativada para Live Mode

**Link:** https://dashboard.stripe.com/account/status

**O que verificar:**
- Aparece **"Activated"** para "Take live payments"
- Se aparecer "Restricted" ou "Pending" → **PARE AQUI** e resolva a ativação antes de continuar

**Resultado esperado:** status verde "Activated"

---

### 1.2 — Verificar conta bancária conectada para payout

**Link:** https://dashboard.stripe.com/settings/payouts

**O que verificar:**
- Conta bancária BRL listada e ativa
- Se não houver: adicionar conta bancária antes de prosseguir (os pagamentos precisam ter destino)

**Resultado esperado:** conta bancária BRL visível e ativa

---

## SEÇÃO 2: Criar os 3 produtos no Live Mode

> **⚠️ CRÍTICO:** Verifique que o toggle **Test / Live** no topo do Stripe Dashboard está em **LIVE** antes de criar os produtos. Produtos criados em Test Mode NÃO funcionam em Live Mode.

**Link:** https://dashboard.stripe.com/products

### 2.1 — Produto $6.99/mês (padrão)

1. Clique em **"Add product"**
2. Preencha:
   - **Name:** `NatGlow Monthly`
   - **Description:** `NatGlow monthly subscription - natural hair care plan`
3. Em Pricing, selecione **"Standard pricing"**
4. Preencha:
   - **Price:** `6.99`
   - **Currency:** `USD`
   - **Billing period:** `Monthly`
5. Clique **Save product**
6. Na página do produto recém-criado, localize **"API ID"** do price (formato `price_xxxxx`)
7. **Copie e anote:** este é o `STRIPE_PRICE_MONTHLY`

**Resultado esperado:** produto criado, price_id copiado (ex: `price_aBcDeFgH123456`)

---

### 2.2 — Produto $4.99/mês (cheap)

1. Clique em **"Add product"**
2. Preencha:
   - **Name:** `NatGlow Monthly Cheap`
   - **Description:** `NatGlow monthly subscription - natural hair care plan (intro price)`
3. Pricing → Standard pricing
   - **Price:** `4.99`
   - **Currency:** `USD`
   - **Billing period:** `Monthly`
4. Clique **Save product**
5. Copie o price API ID
6. **Anote como:** `STRIPE_PRICE_MONTHLY_CHEAP`

---

### 2.3 — Produto $14.99/mês (premium)

1. Clique em **"Add product"**
2. Preencha:
   - **Name:** `NatGlow Monthly Premium`
   - **Description:** `NatGlow monthly subscription - premium natural hair care plan`
3. Pricing → Standard pricing
   - **Price:** `14.99`
   - **Currency:** `USD`
   - **Billing period:** `Monthly`
4. Clique **Save product**
5. Copie o price API ID
6. **Anote como:** `STRIPE_PRICE_MONTHLY_PREMIUM`

---

## SEÇÃO 3: Pegar a API Key do Live Mode

**Link:** https://dashboard.stripe.com/apikeys

> **⚠️** Verifique que está em **Live Mode** no toggle superior.
>
> **ℹ️ Publishable Key (`pk_live_`):** o NatGlow usa Stripe Checkout redirect (server-side), portanto a Publishable Key **não é utilizada** pelo app — você pode ignorá-la. Apenas a Secret Key é necessária.

### 3.1 — Secret Key (Live)

1. Localize **"Secret key"**
2. Clique em **"Reveal live key"**
3. Copie imediatamente (valor começa com `sk_live_`)
4. **⚠️ Esta chave só aparece uma vez.** Guarde em local seguro antes de continuar.
5. **Anote como:** `STRIPE_SECRET_KEY`

**Resultado esperado:** valor começando com `sk_live_`

---

## SEÇÃO 4: Configurar o Webhook em Live Mode

**Link:** https://dashboard.stripe.com/webhooks

> **⚠️** Verifique que está em **Live Mode** no toggle superior. Webhooks de Test e Live são separados.

### 4.1 — Criar o endpoint

1. Clique em **"Add endpoint"** (ou "Add destination")
2. Preencha:
   - **Endpoint URL:** `https://kspbgslqdlnnylqsvnji.supabase.co/functions/v1/stripe-webhook`
   - **Description:** `NatGlow webhook (Live)`
3. Em **"Events to send"**, selecione os 4 eventos abaixo:
   - `checkout.session.completed`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_failed`
4. Clique **"Add endpoint"**

**Resultado esperado:** endpoint criado com status "Enabled"

---

### 4.2 — Pegar o Signing Secret

1. Clique no endpoint recém-criado
2. Localize **"Signing secret"**
3. Clique em **"Reveal"**
4. Copie o valor (começa com `whsec_`)
5. **Anote como:** `STRIPE_WEBHOOK_SECRET`

**Resultado esperado:** valor começando com `whsec_`

---

## SEÇÃO 5: Atualizar variáveis no Vercel

**Link:** https://vercel.com/dashboard → projeto `natglow-app` → **Settings** → **Environment Variables**

> Após atualizar cada variável, o Vercel já marca como "updated" mas só aplica no próximo deploy.

### 5.1 — Substituir cada variável

> **Nota:** `VITE_STRIPE_PUBLISHABLE_KEY` **não existe** no projeto e **não é necessária** — o app usa Stripe Checkout (redirect), que não precisa de publishable key no frontend. Apenas as 3 variáveis de price_id precisam ser atualizadas.

Para cada linha abaixo:
1. Localize a variável pelo nome
2. Clique no menu `⋯` → **Edit**
3. Apague o valor antigo e cole o novo
4. Marque os ambientes: **Production**, **Preview**, **Development** (todos os 3)
5. Clique **Save**

| Variável | Novo valor | De onde veio | Ambientes atuais |
|---|---|---|---|
| `VITE_STRIPE_PRICE_MONTHLY` | `price_xxx` | Seção 2.1 | Production, Preview, Development |
| `VITE_STRIPE_PRICE_MONTHLY_CHEAP` | `price_xxx` | Seção 2.2 | ⚠️ Só Production — adicionar Preview e Development também |
| `VITE_STRIPE_PRICE_MONTHLY_PREMIUM` | `price_xxx` | Seção 2.3 | ⚠️ Só Production — adicionar Preview e Development também |

> **Atenção especial:** `CHEAP` e `PREMIUM` hoje estão só em Production. Ao editar, marque **todos os 3 ambientes** para consistência.

**Resultado esperado:** 3 variáveis atualizadas com valores Live em todos os ambientes

---

### 5.2 — Fazer redeploy no Vercel

1. Na aba **Deployments** (menu lateral)
2. Localize o último deploy (topo da lista)
3. Clique no menu `⋯` → **Redeploy**
4. Aguarde o deploy completar (geralmente 1-2 minutos)

**Resultado esperado:** deploy com status "Ready" usando os novos valores

---

## SEÇÃO 6: Atualizar Secrets nas Edge Functions do Supabase

**Link:** https://supabase.com/dashboard/project/kspbgslqdlnnylqsvnji/settings/functions

### 6.1 — Substituir cada secret

Para cada linha abaixo:
1. Localize o secret pelo nome (ou clique **"Add new secret"** se não existir)
2. Substitua o valor pelo novo
3. Clique **Save** / **Update**

| Secret | Novo valor | De onde veio |
|---|---|---|
| `STRIPE_SECRET_KEY` | `sk_live_xxx` | Seção 3.2 |
| `STRIPE_WEBHOOK_SECRET` | `whsec_xxx` | Seção 4.2 |
| `STRIPE_PRICE_MONTHLY` | `price_xxx` | Seção 2.1 |
| `STRIPE_PRICE_MONTHLY_CHEAP` | `price_xxx` | Seção 2.2 |
| `STRIPE_PRICE_MONTHLY_PREMIUM` | `price_xxx` | Seção 2.3 |

> **⚠️ Atenção:** Os price_ids no Supabase (sem prefixo `VITE_`) devem ser IDÊNTICOS aos do Vercel (com prefixo `VITE_`). É o mesmo valor, dois lugares diferentes.

**Resultado esperado:** 5 secrets atualizados com valores Live

---

### 6.2 — Fazer redeploy das Edge Functions

No terminal (pasta do projeto):

```bash
cd C:\Users\Jogos\Desktop\Projetos\glow-natural
supabase functions deploy stripe-webhook --no-verify-jwt
supabase functions deploy create-checkout-session --no-verify-jwt
supabase functions deploy get-checkout-session --no-verify-jwt
```

**Resultado esperado:** 3 functions deployed com sucesso (sem erros)

---

## SEÇÃO 7: Validação com compra real

> **⚠️ Esta validação cobra valor real no seu cartão pessoal. Você vai reembolsar na sequência.**

### 7.1 — Compra teste ($6.99)

1. Abra o browser em **aba anônima (incógnito)**
2. Acesse: https://app.natglow.app/quiz
3. Complete o quiz normalmente
4. Na página de upgrade, selecione o plano $6.99
5. No checkout Stripe:
   - Use **cartão pessoal REAL** (cartão `4242...` só funciona em Test Mode — não vai funcionar)
   - Complete o pagamento
6. Aguarde a confirmação

---

### 7.2 — Verificar que tudo funcionou

Após a compra, confirme CADA item:

| Item | Onde verificar | Resultado esperado |
|---|---|---|
| Pagamento recebido | [Stripe Live → Payments](https://dashboard.stripe.com/payments) | $6.99 listado |
| Subscription criada | [Supabase → subscriptions](https://supabase.com/dashboard/project/kspbgslqdlnnylqsvnji/editor) | linha com status `active` |
| Welcome email chegou | Caixa de entrada do email usado | Email NatGlow com magic link |
| Magic link funciona | Clica no botão do email | Loga direto no app |
| Painel admin mostra venda | https://app.natglow.app/admin → Financeiro | $6.99 na aba financeiro |

**Se algum item não funcionar:** não continue para 7.3 — diagnostique primeiro.

---

### 7.3 — Reembolsar a compra teste

1. Acesse [Stripe → Payments](https://dashboard.stripe.com/payments) em Live Mode
2. Localize o pagamento de $6.99
3. Clique no pagamento → botão **"Refund"**
4. Selecione reembolso integral → confirme
5. Na aba [Subscriptions](https://dashboard.stripe.com/subscriptions), localize a subscription
6. Clique → **"Cancel subscription"** → cancelar imediatamente

**Resultado esperado:** pagamento reembolsado, subscription cancelada

---

### 7.4 — Limpar dados da compra teste no banco

Execute no [Supabase SQL Editor](https://supabase.com/dashboard/project/kspbgslqdlnnylqsvnji/sql):

```sql
-- Substitua pelo email que você usou no teste
DELETE FROM public.subscriptions WHERE email = 'seu_email@gmail.com';
DELETE FROM public.funnel_events WHERE user_id = (
  SELECT id FROM auth.users WHERE email = 'seu_email@gmail.com'
);
```

Depois, no Supabase Dashboard → **Authentication → Users**, localize o email e delete o usuário.

---

### 7.5 — Testes opcionais (recomendado)

Repita o processo 7.1–7.4 para os outros dois caminhos:

- `https://app.natglow.app/quiz-cheap` → deve cobrar **$4.99**
- `https://app.natglow.app/quiz-premium` → deve cobrar **$14.99**

---

## SEÇÃO 8: Reconfigurar tracking (pós-reset do banco)

O reset do banco zerou o `app_config`. Reconfigure os pixels:

**Link:** https://app.natglow.app/admin → aba **"Tracking & Marketing"**

| Campo | O que colocar |
|---|---|
| Facebook Pixel ID | Seu Pixel ID do Meta Events Manager |
| Facebook CAPI Access Token | Token do Meta Events Manager |
| Facebook Test Event Code | Deixar **vazio** (era só para testes) |
| TikTok Pixel ID | Seu Pixel ID do TikTok Events Manager |
| TikTok Access Token | Token do TikTok Events Manager |

> **Atenção:** O campo "Facebook Test Event Code" ficava com `TEST73936`. Em produção, deve ficar **vazio** — caso contrário todos os eventos aparecerão somente no "Test Events" do Meta, não nas conversões reais.

---

## CHECKLIST FINAL

Marque cada item após confirmar:

### Stripe Live
- [ ] Conta Stripe ativada para Live payments
- [ ] Conta bancária BRL conectada
- [ ] 3 produtos criados em Live Mode (Monthly $6.99, Cheap $4.99, Premium $14.99)
- [ ] Webhook Live criado com os 4 eventos corretos
- [ ] Signing secret do webhook copiado

### Vercel
- [ ] `VITE_STRIPE_PRICE_MONTHLY` atualizado para price Live (todos os 3 ambientes)
- [ ] `VITE_STRIPE_PRICE_MONTHLY_CHEAP` atualizado para price Live (todos os 3 ambientes)
- [ ] `VITE_STRIPE_PRICE_MONTHLY_PREMIUM` atualizado para price Live (todos os 3 ambientes)
- [ ] Redeploy executado e com status "Ready"

### Supabase Secrets
- [ ] `STRIPE_SECRET_KEY` atualizado para `sk_live_...`
- [ ] `STRIPE_WEBHOOK_SECRET` atualizado para `whsec_...` do Live webhook
- [ ] `STRIPE_PRICE_MONTHLY` atualizado para price Live
- [ ] `STRIPE_PRICE_MONTHLY_CHEAP` atualizado para price Live
- [ ] `STRIPE_PRICE_MONTHLY_PREMIUM` atualizado para price Live
- [ ] 3 edge functions reimplantadas

### Validação
- [ ] Compra de $6.99 com cartão real bem-sucedida
- [ ] Pagamento visível no Stripe Live
- [ ] Subscription criada no banco
- [ ] Welcome email recebido
- [ ] Magic link do email funcionando
- [ ] Painel admin mostrando venda
- [ ] Compra teste reembolsada + subscription cancelada
- [ ] Dados de teste removidos do banco

### Tracking
- [ ] Facebook Pixel ID reconfigurado no admin
- [ ] Facebook CAPI Access Token reconfigurado
- [ ] Facebook Test Event Code deixado **vazio**
- [ ] TikTok Pixel ID reconfigurado
- [ ] TikTok Access Token reconfigurado

---

## REFERÊNCIA RÁPIDA — Valores que você vai anotar durante o processo

Preencha conforme avança pelas seções:

| O que | Variável | Valor (preencher) |
|---|---|---|
| Secret Key Live | `STRIPE_SECRET_KEY` | `sk_live_` |
| Webhook Secret Live | `STRIPE_WEBHOOK_SECRET` | `whsec_` |
| Price $6.99 | `STRIPE_PRICE_MONTHLY` + `VITE_STRIPE_PRICE_MONTHLY` | `price_` |
| Price $4.99 | `STRIPE_PRICE_MONTHLY_CHEAP` + `VITE_STRIPE_PRICE_MONTHLY_CHEAP` | `price_` |
| Price $14.99 | `STRIPE_PRICE_MONTHLY_PREMIUM` + `VITE_STRIPE_PRICE_MONTHLY_PREMIUM` | `price_` |

> Esta tabela é apenas para anotação pessoal. Não commite este arquivo com valores preenchidos.
