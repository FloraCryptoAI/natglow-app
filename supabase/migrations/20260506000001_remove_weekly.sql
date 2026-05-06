-- ─────────────────────────────────────────────────────────────────────────────
-- Migration: remove all weekly_249 plan data
-- Confirmed 100% test data (Stripe Test Mode only, no real subscribers)
-- ─────────────────────────────────────────────────────────────────────────────

DELETE FROM public.funnel_events
  WHERE pricing_plan = 'weekly_249';

DELETE FROM public.subscriptions
  WHERE pricing_plan = 'weekly_249';
