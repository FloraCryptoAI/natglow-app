-- ============================================================
-- Hotmart migration — adapt subscriptions for one-time purchases
-- Date: 2026-05-20
-- ============================================================

-- Add Hotmart-specific columns to the existing subscriptions table
ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS hotmart_transaction_id TEXT,
  ADD COLUMN IF NOT EXISTS hotmart_product_id     TEXT,
  ADD COLUMN IF NOT EXISTS purchase_amount        NUMERIC(10, 2),
  ADD COLUMN IF NOT EXISTS purchase_currency      TEXT DEFAULT 'USD',
  ADD COLUMN IF NOT EXISTS purchase_type          TEXT;

-- Index for fast webhook deduplication and transaction-based updates
CREATE INDEX IF NOT EXISTS idx_subscriptions_hotmart_transaction_id
  ON public.subscriptions (hotmart_transaction_id)
  WHERE hotmart_transaction_id IS NOT NULL;

-- ============================================================
-- NOTE: The following Stripe columns are NOT dropped here.
-- They remain for historical data safety and to keep the
-- stripe-webhook edge function operational during the transition.
-- Drop them manually AFTER hotmart-webhook is confirmed working
-- and stripe-webhook has been decommissioned:
--
--   ALTER TABLE public.subscriptions
--     DROP COLUMN IF EXISTS stripe_subscription_id,
--     DROP COLUMN IF EXISTS stripe_customer_id,
--     DROP COLUMN IF EXISTS current_period_end,
--     DROP COLUMN IF EXISTS price_id;
-- ============================================================
