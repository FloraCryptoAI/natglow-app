-- ============================================================
-- USD base currency + access/exclusion flags for subscriptions
-- Date: 2026-07-09
-- ============================================================
--
-- The admin panel consolidates all financials in USD (Facebook Ads costs are
-- logged in USD). Until now `purchase_amount` (the LOCAL charge, e.g. BRL 44.89)
-- was summed as if it were USD, inflating revenue/ticket. These columns add a
-- canonical USD value + flags to mark free/test access that must NOT count as
-- revenue (e.g. Hotmart's own product-review access).
--
--   amount_usd            -> base USD value for consolidated reports
--   access_type           -> 'paid' | 'free' | 'test'
--   excluded_from_revenue -> hard exclusion from all revenue/ticket/ROI math
--   offer_country         -> the ?country= offer bucket ('mx'|'co'|'pe'|'cl'|'default')
--   payment_provider      -> 'hotmart' (default) | 'stripe' (legacy)
--
-- purchase_amount = amount_original and purchase_currency = currency_original
-- (existing columns, reused — no new column needed for those).

ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS amount_usd            NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS access_type           TEXT    NOT NULL DEFAULT 'paid',
  ADD COLUMN IF NOT EXISTS excluded_from_revenue BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS offer_country         TEXT,
  ADD COLUMN IF NOT EXISTS payment_provider      TEXT    DEFAULT 'hotmart';

-- Backfill amount_usd for existing rows from each plan's USD list price.
-- (Fixed-price products, so the USD value is known per plan — no FX needed.)
UPDATE public.subscriptions SET amount_usd = CASE pricing_plan
  WHEN 'natglow'           THEN 7.9
  WHEN 'one_time_basic'    THEN 17
  WHEN 'one_time_standard' THEN 27
  WHEN 'one_time_premium'  THEN 47
  WHEN 'monthly_499'       THEN 4.99
  WHEN 'monthly_699'       THEN 6.99
  WHEN 'monthly_1499'      THEN 14.99
  ELSE amount_usd
END
WHERE amount_usd IS NULL;
