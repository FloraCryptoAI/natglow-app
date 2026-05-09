# SETUP-MANUAL-TRACKING.md
## NatGlow — Facebook Pixel + Conversions API + TikTok Pixel + Events API

> Siga cada seção em ordem. Todas as ações manuais têm um link direto, o nome exato dos botões e o campo no admin onde colar o resultado.

---

## SEÇÃO 1 — SUPABASE: APLICAR MIGRATION

**Por quê:** A migration cria as tabelas `app_config`, `app_config_secrets` e `tracking_events_log`, além da coluna `attribution` em `subscriptions`. Sem isso nada funciona.

**Onde:** [https://supabase.com/dashboard/project/_/sql/new](https://supabase.com/dashboard/project/_/sql/new) — substitua `_` pelo ID do seu projeto.

**Como:**
1. Abra o link acima
2. Cole o conteúdo do arquivo `supabase/migrations/20260509000001_tracking.sql`
3. Clique em **Run** (botão azul, canto superior direito)
4. Verifique que aparece `Success. No rows returned`

**Resultado esperado:** Sem erros. Se aparecer "table already exists", ignore — o SQL usa `if not exists`.

---

## SEÇÃO 2 — DEPLOY DAS EDGE FUNCTIONS

**Por quê:** Três funções novas/modificadas precisam ser deployadas: `admin-tracking-config`, `create-checkout-session` e `stripe-webhook`.

**Onde:** Terminal no diretório do projeto.

**Como:**
```bash
supabase functions deploy admin-tracking-config
supabase functions deploy create-checkout-session
supabase functions deploy stripe-webhook
```

Execute cada linha separadamente e aguarde `Deployed Function admin-tracking-config` (ou o nome correspondente) antes da próxima.

**Resultado esperado:** Cada comando termina com `Deployed Function <nome>`.

---

## SEÇÃO 3 — META BUSINESS: CRIAR CONTA E PIXEL

### 3.1 Criar conta Meta Business Suite

**Por quê:** Necessário para acessar o Events Manager e criar o Pixel.

**Onde:** [https://business.facebook.com](https://business.facebook.com)

**Como:**
1. Clique em **Criar conta**
2. Nome sugerido: `NatGlow`
3. Preencha nome, email e nome da empresa
4. Confirme o email recebido

---

### 3.2 Criar o Facebook Pixel

**Por quê:** O Pixel é o ID que o código browser usa para enviar eventos ao Facebook.

**Onde:** [https://business.facebook.com/events_manager](https://business.facebook.com/events_manager)

**Como:**
1. Clique em **Connect Data Sources** (botão azul à esquerda)
2. Selecione **Web**
3. Clique em **Connect**
4. Selecione **Meta Pixel** e clique em **Connect**
5. Nome: `NatGlow Pixel`
6. URL do site: `https://app.natglow.app`
7. Clique em **Continue**
8. Na tela seguinte, escolha **Install code manually** — NÃO use o parceiro ou tag manager
9. **Copie o Pixel ID** — número de 15-17 dígitos que aparece no topo (ex: `1234567890123456`)

**Onde colar:** Admin → Tracking & Marketing → Card Facebook → campo **Pixel ID** → Salvar

---

### 3.3 Verificação de Domínio (CRÍTICO para iOS 14+)

**Por quê:** Sem verificação de domínio, o Facebook bloqueia eventos para usuárias iOS após iOS 14. Afeta diretamente a atribuição de campanhas.

**Onde:** [https://business.facebook.com/settings/owned-domains](https://business.facebook.com/settings/owned-domains)

**Como:**
1. Clique em **Add** ou **Adicionar**
2. Digite `natglow.app` (sem https://)
3. Selecione **DNS Verification** (método mais simples)
4. Copie o TXT record fornecido (começa com `facebook-domain-verification=...`)
5. Acesse o painel DNS do seu domínio (Cloudflare, Namecheap, Vercel, etc.)
6. Adicione um registro **TXT** com:
   - **Host/Name:** `@` (ou deixe em branco — depende do provedor)
   - **Value:** o código copiado
7. Aguarde propagação (normalmente 5-15 minutos, pode levar até 72h)
8. Volte ao painel da Meta e clique em **Verify**

**Resultado esperado:** Status muda para `Verified` (verde).

---

### 3.4 Aggregated Event Measurement (iOS 14+)

**Por quê:** Configura a prioridade dos eventos para iOS, onde apenas 8 eventos são enviados por domínio. Purchase deve ser o #1.

**Onde:** [https://business.facebook.com/events_manager](https://business.facebook.com/events_manager) → selecione seu Pixel → aba **Aggregated Event Measurement**

**Como:**
1. Clique em **Configure Web Events**
2. Adicione os eventos nesta ordem de prioridade:
   1. `Purchase` ← mais importante
   2. `InitiateCheckout`
   3. `Lead`
   4. `ViewContent`
3. Clique em **Apply** para cada um

**Resultado esperado:** 4 eventos configurados em ordem de prioridade.

---

### 3.5 Gerar Access Token da Conversions API (CAPI)

**Por quê:** Permite que o servidor (Edge Function no Supabase) envie eventos diretamente ao Facebook, independente de AdBlock ou iOS privacy. Especialmente crítico para o evento Purchase.

**Onde:** [https://business.facebook.com/events_manager](https://business.facebook.com/events_manager) → selecione seu Pixel → aba **Settings**

**Como:**
1. Role até a seção **Conversions API**
2. Clique em **Generate access token**
3. ⚠️ **O token só aparece UMA vez. Copie agora e salve em local seguro.**
4. O token é uma string longa (200+ caracteres)

**Onde colar:** Admin → Tracking & Marketing → Card Facebook → campo **CAPI Token** → Salvar

---

### 3.6 Test Event Code (para validação inicial)

**Por quê:** Permite testar eventos sem contaminar os dados reais de produção. Remover após validação.

**Onde:** [https://business.facebook.com/events_manager](https://business.facebook.com/events_manager) → selecione seu Pixel → aba **Test Events**

**Como:**
1. A tela já mostra um código no formato `TEST12345`
2. Copie esse código

**Onde colar:** Admin → Tracking & Marketing → Card Facebook → campo **Test Event Code** → Salvar

> ⚠️ **Remova o Test Event Code quando terminar os testes.** Com ele ativo, eventos aparecem apenas em "Test Events", não em produção.

---

## SEÇÃO 4 — TIKTOK ADS MANAGER: CRIAR CONTA E PIXEL

### 4.1 Criar conta TikTok Ads Manager

**Onde:** [https://ads.tiktok.com/i18n/signup](https://ads.tiktok.com/i18n/signup)

**Como:**
1. Selecione **Business** como tipo de conta
2. Preencha email, senha e país (Brazil ou United States)
3. Confirme o email
4. Na tela inicial, complete o perfil do negócio com nome `NatGlow`

---

### 4.2 Criar o TikTok Pixel

**Onde:** [https://ads.tiktok.com](https://ads.tiktok.com) → menu **Assets** → **Events** → **Web Events**

**Como:**
1. Clique em **Set Up Web Events**
2. Selecione **Manual Setup** (não o parceiro automático)
3. Nome: `NatGlow Pixel`
4. URL: `https://app.natglow.app`
5. Clique em **Next**
6. Escolha **Pixel SDK** como método
7. Copie o **Pixel ID** (string alfanumérica, ex: `C4ABCDEF12345678`)

**Onde colar:** Admin → Tracking & Marketing → Card TikTok → campo **Pixel ID** → Salvar

---

### 4.3 Gerar Access Token (Events API)

**Por quê:** Equivalente ao CAPI do Facebook — permite envio server-side de eventos para o TikTok.

**Onde:** Dentro do Pixel criado → aba **Events API**

**Como:**
1. Clique em **Generate Access Token**
2. ⚠️ **Copie imediatamente — aparece só uma vez.**

**Onde colar:** Admin → Tracking & Marketing → Card TikTok → campo **Access Token** → Salvar

---

## SEÇÃO 5 — CONFIGURAR NO PAINEL ADMIN

1. Acesse [https://app.natglow.app/admin/tracking](https://app.natglow.app/admin/tracking)
2. **Card Facebook:**
   - Cole o Pixel ID → clique **Salvar**
   - Cole o CAPI Token → clique **Salvar**
   - Cole o Test Event Code → clique **Salvar**
   - Ative o toggle **Ativado**
3. **Card TikTok:**
   - Cole o Pixel ID → clique **Salvar**
   - Cole o Access Token → clique **Salvar**
   - Ative o toggle **Ativado**
4. **Card Privacidade:**
   - Confirme que **Exigir consentimento de cookies** está ativado (padrão)
5. Clique em **Testar CAPI/Events API** no card Facebook
   - Deve aparecer toast `Evento de teste CAPI enviado com sucesso`
   - Confirme no [Events Manager → Test Events](https://business.facebook.com/events_manager) que o evento aparece em até 30 segundos
6. Repita o teste para o TikTok

---

## SEÇÃO 6 — VARIÁVEIS DE AMBIENTE

Nenhuma variável nova precisa ser adicionada no `.env` ou Vercel. Tudo é gerenciado via admin. Os tokens ficam na tabela `app_config_secrets` no Supabase, acessível apenas por `service_role`.

---

## SEÇÃO 7 — VALIDAÇÃO END-TO-END

Siga este roteiro para confirmar que toda a cadeia está funcionando:

1. Abra duas abas:
   - **Aba 1:** [https://app.natglow.app/quiz?utm_source=facebook&utm_campaign=test&fbclid=TestClickId123](https://app.natglow.app/quiz?utm_source=facebook&utm_campaign=test&fbclid=TestClickId123) em **aba anônima**
   - **Aba 2:** [https://business.facebook.com/events_manager](https://business.facebook.com/events_manager) → seu Pixel → **Test Events** (com Test Event Code ativo)

2. Na Aba 1, observe no DevTools → Application → LocalStorage:
   - Chave `natglow_attribution` deve conter `utm_source: "facebook"`, `utm_campaign: "test"`, `fbclid: "TestClickId123"`
   - Cookie `_fbc` deve ter sido criado com o fbclid

3. Clique em **Iniciar quiz** — confira na Aba 2 que aparece evento `ViewContent` em ~15s

4. Complete todas as perguntas do quiz — confira `Lead` no Test Events

5. Na tela de resultados, confira `ViewContent` com `content_name` = o plan_key

6. Clique no botão de assinar:
   - Deve aparecer `InitiateCheckout` com `value` e `currency` corretos
   - DevTools → Network: procure a chamada para `create-checkout-session` e confirme que o body inclui `fbEventId`, `fbp`, `fbc`

7. Complete o pagamento com cartão teste Stripe: `4242 4242 4242 4242`, qualquer data futura, qualquer CVV

8. Aguarde ~30 segundos e confirme `Purchase` nos Test Events do Facebook
   - O `event_id` do `Purchase` deve ser **igual** ao do `InitiateCheckout` → deduplicação funcionando
   - No painel Admin → Tracking & Marketing → Status & Eventos, deve aparecer o evento com match Pixel + CAPI

9. Repita para os 3 caminhos: `/quiz`, `/quiz-cheap`, `/quiz-premium`

---

## SEÇÃO 8 — REMOVER TEST EVENT CODE (PRODUÇÃO)

Quando todos os testes passarem:

1. Admin → Tracking & Marketing → Card Facebook → campo **Test Event Code**
2. Apague o conteúdo do campo
3. Clique **Salvar**

A partir desse momento, eventos vão para produção e aparecerão em **Events Manager → Overview** (não mais em Test Events).

---

## SEÇÃO 9 — TROUBLESHOOTING

### Eventos não aparecem no Test Events do Facebook

- [ ] Test Event Code está preenchido no admin?
- [ ] Toggle Facebook está **Ativado**?
- [ ] Banner de consentimento foi aceito na sessão de teste?
- [ ] AdBlock ou uBlock Origin está ativo? → Use aba anônima sem extensões
- [ ] Pixel ID está correto (sem espaços)?
- [ ] O domínio `natglow.app` está verificado no Meta Business?

### Erro ao clicar "Testar CAPI" no admin

- [ ] CAPI Token está salvo corretamente? Token tem 200+ caracteres
- [ ] Edge function `admin-tracking-config` foi deployada após as últimas mudanças?
- [ ] Há algum erro nos logs do Supabase? → Dashboard → Edge Functions → `admin-tracking-config` → Logs

### Purchase não aparece via CAPI

- [ ] Edge function `stripe-webhook` foi deployada?
- [ ] O `fb_event_id` está chegando no metadata da Stripe Session? → Stripe Dashboard → Payments → selecione o pagamento → Metadata
- [ ] A tabela `tracking_events_log` tem um registro? → Supabase SQL: `select * from tracking_events_log order by created_at desc limit 5`
- [ ] Resposta do CAPI foi `success`? → veja coluna `response` na tabela acima

### Eventos duplicados (sem deduplicação)

O Facebook considera deduplicados quando **Pixel browser** e **CAPI server** enviam o mesmo `event_id` para o mesmo `event_name`.

Verificar:
- [ ] `fbEventId` gerado em `handleCheckout` (Results.jsx) está chegando no metadata da Stripe Session como `fb_event_id`?
- [ ] O webhook está lendo `session.metadata.fb_event_id` e passando para `sendFacebookCAPIEvent` como `event_id`?

### Cookie `_fbc` não está sendo criado

- [ ] URL tem parâmetro `fbclid`?
- [ ] Está testando em HTTPS? Cookies `secure` não funcionam em `http://localhost`
- [ ] Para testar local: use `http://localhost` sem o flag `secure`, ou use ngrok

### attribution não aparece na aba Attribution do admin

- [ ] A compra foi feita com URL contendo UTMs?
- [ ] A tabela `subscriptions` tem a coluna `attribution`? → Migration foi aplicada?
- [ ] Stripe webhook foi deployado após as mudanças?

---

## SEÇÃO 10 — LIMPEZA DE DADOS APÓS TESTES

Remova os pagamentos e usuárias de teste:

1. Stripe Dashboard → Customers → encontre o email de teste → Delete
2. Supabase → Table Editor → `subscriptions` → delete a linha do email de teste
3. Supabase → Table Editor → `tracking_events_log` → delete os registros de teste (filtre por `created_at`)
4. Supabase → Table Editor → `funnel_events` → delete os registros da sessão de teste

---

*Documento gerado em maio de 2026. Versão inicial sujeita a revisão jurídica.*
