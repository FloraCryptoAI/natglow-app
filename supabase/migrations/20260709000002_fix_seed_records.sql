-- ============================================================
-- One-off correction of two mislabeled subscription records
-- Date: 2026-07-09
-- ============================================================
-- Run AFTER 20260709000001_usd_base_and_access_flags.sql.
--
-- 1) Lucas: a REAL paid purchase, but stored as Bold/Detox with the BRL charge
--    (44.89) being counted as USD. Fix to the normal NatGlow plan, keep the
--    local charge as amount_original (BRL 44.89) and set amount_usd = 7.90.
--
-- 2) Hotmart tester: NOT a sale — access Hotmart created to review the product
--    from the inside (showed up as a $27 purchase). Mark as free/test access,
--    excluded from revenue. Still visible under "Usuárias".

-- 1) Lucas — real paid customer, NatGlow normal plan, BRL 44,89 / US$7,90
UPDATE public.subscriptions SET
  pricing_plan          = 'natglow',
  status                = 'active',
  access_type           = 'paid',
  excluded_from_revenue = false,
  purchase_amount       = 44.89,
  purchase_currency     = 'BRL',
  amount_usd            = 7.9,
  offer_country         = COALESCE(offer_country, 'default'),
  payment_provider      = 'hotmart'
WHERE email = 'lucas.5001pereira@gmail.com';

-- 2) Hotmart tester — free/review access, out of all revenue math
UPDATE public.subscriptions SET
  pricing_plan          = 'natglow_free_hotmart_review',
  status                = 'active',
  access_type           = 'test',
  excluded_from_revenue = true,
  purchase_amount       = 0,
  purchase_currency     = 'USD',
  amount_usd            = 0
WHERE email = 'hotmarttester@mailsac.com';
