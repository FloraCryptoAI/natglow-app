-- ─────────────────────────────────────────────────────────────────────────────
-- Migration: add pricing_plan column to admin_costs
-- Enables ROI breakdown per pricing plan in the admin dashboard
-- Backfill: existing costs were registered before multi-plan → assign to monthly_699
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE public.admin_costs
  ADD COLUMN IF NOT EXISTS pricing_plan TEXT;

UPDATE public.admin_costs
  SET pricing_plan = 'monthly_699'
  WHERE pricing_plan IS NULL;

CREATE INDEX IF NOT EXISTS admin_costs_pricing_plan_idx
  ON public.admin_costs (pricing_plan)
  WHERE pricing_plan IS NOT NULL;
