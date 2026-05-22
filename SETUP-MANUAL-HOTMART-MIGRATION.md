# Setup Manual — Migração Hotmart (NatGlow LATAM)

> **LEIA ANTES DE FAZER QUALQUER COISA:**  
> 1. Faça um `git tag` de segurança antes de qualquer deploy.  
> 2. NÃO remova o `stripe-webhook` do servidor antes de confirmar que o `hotmart-webhook` está funcionando.  
> 3. Execute os passos na ordem exata abaixo.

---

## PASSO 0 — TAG DE SEGURANÇA (FAZER PRIMEIRO)

**O QUÊ:** Criar um snapshot do estado atual do código antes de qualquer mudança de produção.

**ONDE:** Terminal, na raiz do projeto.

**COMO:**
```bash
git tag pre-hotmart-migration
git push origin pre-hotmart-migration
```

**O QUE ESPERAR:** Tag criada e enviada ao GitHub. Se algo der errado, você pode voltar com `git checkout pre-hotmart-migration`.

---

## PASSO 1 — CRIAR CONTA E PRODUTOS NO HOTMART

**O QUÊ:** Criar 3 produtos separados no Hotmart (um por plano de preço).

**ONDE:** [https://app.hotmart.com/products](https://app.hotmart.com/products)  
_(Login: [https://app.hotmart.com/login](https://app.hotmart.com/login))_

**COMO:**
1. Acesse o Hotmart e faça login como produtor.
2. Clique em **"Criar produto"** → escolha **"Infoproduto digital"**.
3. Crie os 3 produtos com os seguintes preços:

| Produto | Nome | Preço |
|---|---|---|
| Básico | NatGlow Básico | $17 USD |
| Completo | NatGlow Completo | $27 USD |
| VIP | NatGlow VIP | $47 USD |

4. Para cada produto, após criar, copie o **Product ID** (número visível na URL do produto ou na lista de produtos).
5. Para cada produto, copie também a **URL de checkout** no formato: `https://pay.hotmart.com/XXXXXXXXX`

**O QUE ESPERAR:** 3 produtos criados com seus respectivos Product IDs e Checkout URLs.

**ONDE COLAR:** Os valores serão usados nos Passos 3 e 4 abaixo.

---

## PASSO 2 — CONFIGURAR WEBHOOK NO HOTMART

**O QUÊ:** Registrar a URL do `hotmart-webhook` edge function para receber eventos de compra.

**ONDE:** Painel Hotmart → menu lateral esquerdo → **Ferramentas (Tools)** → **Ver todas (Show all)** → buscar/clicar em **"Webhook (API e notificações)"**  
Link direto: [https://app.hotmart.com/tools/webhooks](https://app.hotmart.com/tools/webhooks)

**COMO:**
1. Clique em **"+ Cadastrar Webhook"** (Register Webhook).
2. Escolha se quer aplicar a **todos os produtos** ou a um produto específico — selecione **todos** (ou selecione cada um dos 3 produtos criados no Passo 1).
3. Cole a URL de entrega:
   ```
   https://<SEU_PROJECT_REF>.supabase.co/functions/v1/hotmart-webhook
   ```
   Você encontra o `<SEU_PROJECT_REF>` em: [https://supabase.com/dashboard/project/](https://supabase.com/dashboard/project/) → clique no seu projeto → copie o ID na URL.

4. Marque os eventos (triggers):

| Evento | Quando ocorre |
|---|---|
| `PURCHASE_APPROVED` | Pagamento aprovado (cartão de crédito) |
| `PURCHASE_COMPLETE` | Compra concluída (pagamento confirmado) |
| `PURCHASE_BILLET_PRINTED` | Boleto gerado (aguardando pagamento) |
| `PURCHASE_DELAYED` | Pagamento PIX/delayed pendente |
| `PURCHASE_REFUNDED` | Reembolso processado |
| `PURCHASE_CHARGEBACK` | Chargeback/estorno |
| `PURCHASE_CANCELED` | Compra cancelada |
| `PURCHASE_EXPIRED` | Boleto/PIX expirado sem pagamento |

5. Salve o webhook.

6. Após salvar, vá na aba **"Autenticação de Webhook"** (Webhook Authentication) do webhook que você acabou de criar. Você verá um campo chamado **Hottok** — **copie esse valor**. Ele é a senha que o Hotmart envia para autenticar cada requisição. Guarde com segurança — será usado no Passo 4 como `HOTMART_WEBHOOK_TOKEN`.

**Como o Hottok funciona na API v2:** O Hotmart envia o Hottok como o **header HTTP `x-hotmart-hottok`** em cada requisição POST ao webhook. Nosso código também aceita o Hottok no corpo JSON (campo `hottok`) e como query param para compatibilidade com versões antigas — mas o comportamento padrão atual é via header.

**O QUE ESPERAR:** Webhook registrado e ativo. O Hotmart enviará um POST para a URL cadastrada a cada evento de compra, com o Hottok no header `x-hotmart-hottok`.

---

## PASSO 3 — VARIÁVEIS DE AMBIENTE NO VERCEL

**O QUÊ:** Adicionar as 3 URLs de checkout do Hotmart como variáveis de ambiente do frontend.

**ONDE:** [https://vercel.com/dashboard](https://vercel.com/dashboard) → Seu projeto → **Settings** → **Environment Variables**

**COMO:**

Adicione as 3 variáveis abaixo (copie as URLs do Passo 1):

| Nome da variável | Valor |
|---|---|
| `VITE_HOTMART_CHECKOUT_URL_BASIC` | `https://pay.hotmart.com/XXXXXXXXX` (URL do produto Básico) |
| `VITE_HOTMART_CHECKOUT_URL_STANDARD` | `https://pay.hotmart.com/XXXXXXXXX` (URL do produto Completo) |
| `VITE_HOTMART_CHECKOUT_URL_PREMIUM` | `https://pay.hotmart.com/XXXXXXXXX` (URL do produto VIP) |

Para cada variável:
1. Clique em **"Add New"**.
2. Cole o nome e o valor.
3. Selecione os ambientes: **Production**, **Preview** e **Development**.
4. Clique em **"Save"**.

**O QUE ESPERAR:** 3 variáveis salvas. Elas serão injetadas no próximo build do frontend.

---

## PASSO 4 — SECRETS DAS EDGE FUNCTIONS NO SUPABASE

**O QUÊ:** Adicionar as variáveis de ambiente usadas pelo `hotmart-webhook`.

**ONDE:** [https://supabase.com/dashboard/project/](https://supabase.com/dashboard/project/) → Seu projeto → **Edge Functions** → **Secrets** (ou via Supabase CLI)

**COMO (via Dashboard):**

Adicione os seguintes secrets (clicando em **"Add new secret"** para cada um):

| Secret | Valor |
|---|---|
| `HOTMART_WEBHOOK_TOKEN` | O valor copiado na aba "Autenticação de Webhook" (Hottok) do Passo 2 |
| `HOTMART_PRODUCT_ID_BASIC` | Product ID do produto NatGlow Básico (copiado no Passo 1) |
| `HOTMART_PRODUCT_ID_STANDARD` | Product ID do produto NatGlow Completo (copiado no Passo 1) |
| `HOTMART_PRODUCT_ID_PREMIUM` | Product ID do produto NatGlow VIP (copiado no Passo 1) |

**COMO (via CLI, alternativa):**
```bash
supabase secrets set HOTMART_WEBHOOK_TOKEN="seu_token_aqui"
supabase secrets set HOTMART_PRODUCT_ID_BASIC="12345678"
supabase secrets set HOTMART_PRODUCT_ID_STANDARD="12345679"
supabase secrets set HOTMART_PRODUCT_ID_PREMIUM="12345680"
```

**O QUE ESPERAR:** 4 secrets salvos. Eles estarão disponíveis para a edge function `hotmart-webhook`.

---

## PASSO 5 — EXECUTAR A MIGRATION SQL

**O QUÊ:** Adicionar as colunas `hotmart_transaction_id`, `hotmart_product_id`, `purchase_amount`, `purchase_currency` e `purchase_type` na tabela `subscriptions`.

**ONDE:** [https://supabase.com/dashboard/project/](https://supabase.com/dashboard/project/) → Seu projeto → **SQL Editor** → **New query**

**COMO:**
1. Abra o arquivo `supabase/migrations/20260520000001_hotmart_migration.sql`.
2. Copie todo o conteúdo.
3. Cole no SQL Editor do Supabase.
4. Clique em **"Run"** (ou Ctrl+Enter).

**O QUE ESPERAR:**
```
ALTER TABLE
CREATE INDEX
```
Sem erros. As novas colunas aparecerão na tabela `subscriptions` (visível em **Table Editor** → subscriptions).

---

## PASSO 6 — DEPLOY DAS EDGE FUNCTIONS

**O QUÊ:** Publicar as novas e atualizadas edge functions no Supabase.

**ONDE:** Terminal, na raiz do projeto, com Supabase CLI instalada e autenticada.

**COMO:**

Execute os comandos abaixo **na ordem**:

```bash
# 1. Nova edge function — webhook do Hotmart
supabase functions deploy hotmart-webhook --no-verify-jwt

# 2. Atualizada — email transacional (removeu payment_failed e subscription_canceled, adicionou purchase_refunded)
supabase functions deploy send-transactional-email --no-verify-jwt

# 3. Atualizadas — admin (sem Stripe)
supabase functions deploy admin-financial --no-verify-jwt
supabase functions deploy admin-retention --no-verify-jwt
```

**Nota:** `--no-verify-jwt` é necessário para `hotmart-webhook` e `send-transactional-email` porque eles são chamados externamente (Hotmart) ou como módulo sem token de usuário.

**O QUE ESPERAR:** Cada comando termina com `"Deployed Function <nome>"` e a URL da função.

---

## PASSO 7 — DEPLOY DO FRONTEND

**O QUÊ:** Publicar o novo código frontend (sem Stripe, com Hotmart, ES-only).

**ONDE:** Terminal, na raiz do projeto.

**COMO:**
```bash
git add .
git commit -m "feat: pivot to Hotmart one-time purchase LATAM model"
git push origin main
```

O Vercel vai detectar o push e iniciar o build automaticamente.

**O QUE ESPERAR:** Build bem-sucedido em [vercel.com/dashboard](https://vercel.com/dashboard). Monitorar o log para garantir que não há erros de variáveis de ambiente ausentes (`VITE_HOTMART_CHECKOUT_URL_*`).

---

## PASSO 8 — TESTE DO FLUXO PONTA A PONTA

**O QUÊ:** Verificar que uma compra real ou de teste no Hotmart cria o usuário e a subscription corretamente.

**COMO:**
1. No Hotmart, use o **modo de teste** do checkout. No painel Hotmart → seu produto → aba **"Links de Pagamento"** → clique em **"Gerar link de teste"** (ou use o modo sandbox se disponível).
2. Complete uma compra do produto "Completo" ($27). O checkout de teste não cobra o cartão de verdade.
3. Verifique nos **logs da edge function** primeiro: Supabase → **Edge Functions** → `hotmart-webhook` → **Logs**. O log deve mostrar:
   ```
   Hotmart event: PURCHASE_COMPLETE status: COMPLETE { txId: "HP...", email: "***", planKey: "one_time_standard", ... }
   ```
4. Verifique no Supabase → **Table Editor** → `subscriptions`:
   - Nova linha com `status = 'active'`
   - `hotmart_transaction_id` preenchido (formato `HP...`)
   - `pricing_plan = 'one_time_standard'`
   - `purchase_amount = 27`
5. Verifique que o email de boas-vindas chegou (com magic link funcional).
6. Clique no magic link → deve logar e redirecionar para `/HairDashboard`.
7. (Opcional) Verifique no Facebook Events Manager e TikTok Events Manager que o evento `Purchase` chegou.

**Se o hottok falhar:** O log vai mostrar `"Hotmart webhook: invalid hottok — ignoring event"`. Isso significa que o valor do `HOTMART_WEBHOOK_TOKEN` no Supabase Secrets não bate com o Hottok exibido na aba "Autenticação de Webhook" do painel Hotmart. Copie o valor exato do painel e atualize o secret.

---

## PASSO 9 — DECOMMISSION DO STRIPE (SOMENTE APÓS VALIDAÇÃO)

**⚠️ SOMENTE depois de confirmar que o Hotmart está funcionando perfeitamente em produção.**

**COMO:**

1. No Supabase → Edge Functions: **deletar** (ou apenas parar de usar) `stripe-webhook` e `create-checkout-session` e `get-checkout-session`.
2. No Vercel → Environment Variables: **remover** as variáveis `STRIPE_*` (após confirmar que nenhum código as usa mais).
3. No Supabase → Secrets: **remover** `STRIPE_SECRET_KEY` e `STRIPE_WEBHOOK_SECRET`.
4. (Opcional, após meses de operação) Executar no SQL Editor:
   ```sql
   ALTER TABLE public.subscriptions
     DROP COLUMN IF EXISTS stripe_subscription_id,
     DROP COLUMN IF EXISTS stripe_customer_id,
     DROP COLUMN IF EXISTS current_period_end,
     DROP COLUMN IF EXISTS price_id;
   ```

---

## RESUMO FINAL — ARQUIVOS DO PIVOTE

### Arquivos CRIADOS:
| Arquivo | Descrição |
|---|---|
| `supabase/functions/hotmart-webhook/index.ts` | Webhook de compras Hotmart |
| `supabase/functions/_shared/email-templates/purchase_refunded.ts` | Email de reembolso (ES) |
| `supabase/migrations/20260520000001_hotmart_migration.sql` | Migration das colunas Hotmart |
| `SETUP-MANUAL-HOTMART-MIGRATION.md` | Este arquivo |

### Arquivos MODIFICADOS:
| Arquivo | Mudança |
|---|---|
| `src/config/pricing.js` | Plan keys Hotmart, URLs de checkout |
| `src/lib/i18n.js` | ES-only, sem detecção de idioma |
| `src/lib/AuthContext.jsx` | `isSubscribed` aceita `'pending'` |
| `index.html` | `lang="es"`, títulos e meta tags em ES |
| `src/pages/Results.jsx` | `handleCheckout` direto para Hotmart (sem Stripe) |
| `src/pages/SubscriptionSuccess.jsx` | Remove fetch de sessão Stripe |
| `src/pages/Upgrade.jsx` | 3 cards com preços únicos + redirect Hotmart |
| `src/pages/HairSettings.jsx` | Remove seletor de idioma |
| `src/components/Layout.jsx` | Remove sync de idioma do banco |
| `src/locales/es.json` | Textos de garantia, preço único, ES neutro |
| `src/pages/admin/AdminFinancial.jsx` | Métricas de compra única (sem MRR/Stripe) |
| `src/pages/admin/AdminRetention.jsx` | Engajamento por uso (sem churn/cohort/Stripe) |
| `supabase/functions/admin-financial/index.ts` | Sem Stripe, dados do Supabase |
| `supabase/functions/admin-retention/index.ts` | Sem Stripe, uso do app |
| `supabase/functions/send-transactional-email/index.ts` | Adiciona `purchase_refunded`; remove `payment_failed`, `subscription_canceled` |
| `supabase/functions/_shared/email-templates/welcome.ts` | ES-only, linguagem de compra única |

### Arquivos A REMOVER DO SERVIDOR (não agora — somente após validação Hotmart):
| Arquivo / Função | Quando remover |
|---|---|
| `supabase/functions/stripe-webhook` | Após confirmar Hotmart em produção |
| `supabase/functions/create-checkout-session` | Após confirmar Hotmart em produção |
| `supabase/functions/get-checkout-session` | Após confirmar Hotmart em produção |

> `src/locales/en.json` e `src/locales/hairDataText.en.js` **já foram deletados** neste pivote.

### Variáveis de ambiente necessárias:
**Vercel (frontend):**
- `VITE_HOTMART_CHECKOUT_URL_BASIC`
- `VITE_HOTMART_CHECKOUT_URL_STANDARD`
- `VITE_HOTMART_CHECKOUT_URL_PREMIUM`

**Supabase Secrets (edge functions):**
- `HOTMART_WEBHOOK_TOKEN`
- `HOTMART_PRODUCT_ID_BASIC`
- `HOTMART_PRODUCT_ID_STANDARD`
- `HOTMART_PRODUCT_ID_PREMIUM`
