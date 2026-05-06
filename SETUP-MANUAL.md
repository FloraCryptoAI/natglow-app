# SETUP MANUAL — NatGlow Multi-Plan (3 planos mensais)

> Atualizado após remoção do plano weekly_249. O projeto opera apenas com planos mensais.

---

## Estado atual dos planos

| Plano | Rota quiz | Rota results | Price ID (Test) |
|---|---|---|---|
| `monthly_499`  | `/quiz-cheap`   | `/results-cheap`   | `price_1TTVbeHx9zhMiULWP5hkGKay` |
| `monthly_699`  | `/quiz`         | `/results`         | `price_1TNlDMHx9zhMiULWFVJI0VIo` |
| `monthly_1499` | `/quiz-premium` | `/results-premium` | `price_1TTVcXHx9zhMiULWUHLaOMg8` |

> `/quiz-weekly` e `/results-weekly` agora retornam redirect 301 para `/quiz` e `/results`.

---

## ⚠️ Ações manuais necessárias (após deploy)

### 1. Vercel — remover variável obsoleta

Acesse [https://vercel.com](https://vercel.com) → seu projeto → **Settings → Environment Variables**

- **DELETAR** `VITE_STRIPE_PRICE_WEEKLY` em **Production**, **Preview** e **Development**

Variáveis que devem permanecer:

| Variável | Valor |
|---|---|
| `VITE_SUPABASE_URL` | `https://kspbgslqdlnnylqsvnji.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | anon key do projeto |
| `VITE_STRIPE_PRICE_MONTHLY` | `price_1TNlDMHx9zhMiULWFVJI0VIo` |
| `VITE_STRIPE_PRICE_MONTHLY_CHEAP` | `price_1TTVbeHx9zhMiULWP5hkGKay` |
| `VITE_STRIPE_PRICE_MONTHLY_PREMIUM` | `price_1TTVcXHx9zhMiULWUHLaOMg8` |
| `VITE_ADMIN_EMAIL` | `lucas.5000benigno@gmail.com` |

---

### 2. Stripe Dashboard — arquivar produto semanal (Live Mode)

1. Acesse [https://dashboard.stripe.com/products](https://dashboard.stripe.com/products) (modo **Live**)
2. Encontre **"NatGlow Weekly"**
3. Clique em **Archive product** → confirme
4. Não delete — o Stripe não permite deletar produtos com histórico de transações

---

### 3. Stripe Test Mode — cancelar 4 assinaturas de teste do plano semanal

As 4 assinaturas de teste do plano `weekly_249` continuam ativas no Stripe Test Mode e geram invoices fictícias toda semana. Para limpar:

1. Acesse [https://dashboard.stripe.com](https://dashboard.stripe.com) → ative **"Test mode"** (toggle no canto superior direito)
2. Vá em **Customers**
3. Para cada cliente que tinha assinatura NatGlow Weekly:
   - Abra o cliente
   - Vá na aba **Subscriptions**
   - Encontre a assinatura ativa do produto "NatGlow Weekly"
   - Clique em **Cancel subscription** → selecione **Cancel immediately** → confirme
4. Repita para todos os 4 clientes de teste

> Alternativa mais rápida: Products → NatGlow Weekly → ver assinantes → cancelar direto pela lista.

---

### 4. Supabase Edge Functions — remover secret STRIPE_PRICE_WEEKLY

1. Acesse [https://supabase.com/dashboard](https://supabase.com/dashboard) → seu projeto → **Settings → Edge Functions → Secrets**
2. Delete o secret `STRIPE_PRICE_WEEKLY` (não é mais lido por nenhuma edge function)

Secrets que devem permanecer:

| Secret | Descrição |
|---|---|
| `SUPABASE_URL` | Já configurado |
| `SUPABASE_SERVICE_ROLE_KEY` | Já configurado |
| `STRIPE_SECRET_KEY` | Já configurado |
| `STRIPE_WEBHOOK_SECRET` | Já configurado |
| `SITE_URL` | Já configurado |
| `STRIPE_PRICE_MONTHLY` | Price ID mensal $6.99 |
| `STRIPE_PRICE_MONTHLY_CHEAP` | Price ID mensal $4.99 |
| `STRIPE_PRICE_MONTHLY_PREMIUM` | Price ID mensal $14.99 |
| `ADMIN_JWT_SECRET` | JWT do painel admin |

---

### 5. Facebook Ads — pausar/redirecionar campanha weekly

Se houver campanha ativa apontando para `/quiz-weekly`:
- A URL agora redireciona para `/quiz` automaticamente (301), então não vai quebrar
- Mas é melhor atualizar o link da campanha para `/quiz` diretamente para não perder o UTM tracking
- Sugestão: pausar a campanha weekly até criar uma nova para o plano correto

URLs de destino atualizadas para anúncios:

| Campanha | URL |
|---|---|
| Cheap $4.99  | `https://app.natglow.app/quiz-cheap?utm_campaign=cheap_v1&utm_source=fb` |
| Control $6.99 | `https://app.natglow.app/quiz?utm_campaign=monthly_v1&utm_source=fb` |
| Premium $14.99 | `https://app.natglow.app/quiz-premium?utm_campaign=premium_v1&utm_source=fb` |

---

## Migrations do banco de dados

Execute **em ordem** no Supabase SQL Editor:

```
supabase/migrations/20260504000001_pricing_plan.sql       — add pricing_plan to subscriptions + funnel_events
supabase/migrations/20260506000001_remove_weekly.sql      — DELETE dados weekly_249 (test data)
supabase/migrations/20260506000002_admin_costs_pricing_plan.sql — add pricing_plan to admin_costs
```

### Como executar
1. Acesse o projeto no Supabase → **SQL Editor**
2. Abra cada arquivo de migration, cole o conteúdo e execute
3. Execute na ordem numérica do nome

---

## Deploy das Edge Functions

```bash
supabase functions deploy stripe-webhook
supabase functions deploy admin-financial
supabase functions deploy admin-data
supabase functions deploy admin-multiplan
supabase functions deploy admin-costs
```

---

## Verificar o webhook do Stripe

1. Acesse [https://dashboard.stripe.com/webhooks](https://dashboard.stripe.com/webhooks)
2. Confirme que o webhook aponta para:
   `https://kspbgslqdlnnylqsvnji.supabase.co/functions/v1/stripe-webhook`
3. Eventos habilitados:
   - `checkout.session.completed`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_failed`

---

## Testar localmente

```bash
npm run dev
```

### Checklist por caminho

**Cheap $4.99 (`/quiz-cheap` → `/results-cheap`)**
- [ ] Acesse `http://localhost:5173/quiz-cheap`
- [ ] Complete o quiz e confirme que navega para `/results-cheap`
- [ ] Confirme que o preço exibido é **$4.99**
- [ ] Checkout abre com o produto correto

**Control $6.99 (`/quiz` → `/results`)**
- [ ] Acesse `http://localhost:5173/quiz`
- [ ] Complete o quiz e confirme que navega para `/results`
- [ ] Confirme que o preço exibido é **$6.99**

**Premium $14.99 (`/quiz-premium` → `/results-premium`)**
- [ ] Acesse `http://localhost:5173/quiz-premium`
- [ ] Complete o quiz e confirme que navega para `/results-premium`
- [ ] Confirme que o preço exibido é **$14.99**

**Redirects legados**
- [ ] Acesse `/quiz-weekly` → confirme redirect 301 para `/quiz`
- [ ] Acesse `/results-weekly` → confirme redirect 301 para `/results`

---

## Painel Admin — novas funcionalidades (Fase 2)

### ROI por plano em Custos & ROI

- Ao registrar um custo, selecione "Vincular a plano de preço" para associar o custo a um plano específico
- A tabela **"ROI por plano de preço"** aparece no Dashboard de ROI quando há dados
- Indicador de confiabilidade: **Confiável** (≥100 assinantes), **Tendência** (≥30), **Aguardando dados** (<30)
- Custos sem plano vinculado aparecem na linha **"Global (não vinculado)"**

### Migration necessária para esta feature

Execute `supabase/migrations/20260506000002_admin_costs_pricing_plan.sql` — adiciona coluna `pricing_plan` à tabela `admin_costs` e faz backfill dos registros existentes para `monthly_699`.

---

## Arquivos modificados — remoção do weekly

| Arquivo | Tipo | O que mudou |
|---|---|---|
| `src/config/pricing.js` | MODIFICADO | Removida entrada `weekly` |
| `.env` | MODIFICADO | Removida `VITE_STRIPE_PRICE_WEEKLY` |
| `src/App.jsx` | MODIFICADO | Rotas `/quiz-weekly` e `/results-weekly` viram redirects 301 |
| `supabase/functions/stripe-webhook/index.ts` | MODIFICADO | Removido mapeamento `STRIPE_PRICE_WEEKLY` |
| `supabase/functions/admin-financial/index.ts` | MODIFICADO | Removido `weekly_249` de PLAN_MRR e PLAN_LABELS |
| `supabase/functions/admin-data/index.ts` | MODIFICADO | Removido `weekly_249` de PLAN_MRR |
| `supabase/functions/admin-multiplan/index.ts` | MODIFICADO | Removido `weekly_249` de PLAN_CONFIG e PLAN_KEYS |
| `supabase/functions/admin-costs/index.ts` | MODIFICADO | PLAN_MRR multi-plano, planRoi, pricing_plan no POST |
| `src/pages/admin/AdminFunnel.jsx` | MODIFICADO | Removido filtro Weekly $2.49 |
| `src/pages/admin/AdminUsers.jsx` | MODIFICADO | Removido badge e opção Weekly $2.49 |
| `src/pages/admin/AdminQuizAnswers.jsx` | MODIFICADO | Removido weekly dos PLANS, simplificado MrrTooltip |
| `src/pages/admin/AdminFinancial.jsx` | MODIFICADO | Removida nota 4.33 |
| `src/pages/admin/AdminCosts.jsx` | MODIFICADO | Campo pricing_plan no form + tabela ROI por plano |
| `supabase/migrations/20260506000001_remove_weekly.sql` | CRIADO | DELETE dados weekly_249 |
| `supabase/migrations/20260506000002_admin_costs_pricing_plan.sql` | CRIADO | pricing_plan em admin_costs |
