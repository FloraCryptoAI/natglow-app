-- ─────────────────────────────────────────────────────────────────────────────
-- Migration: add pricing_plan to subscriptions and funnel_events
-- Backfill: all pre-existing rows were on the single monthly plan → monthly_699
-- ─────────────────────────────────────────────────────────────────────────────

-- subscriptions ───────────────────────────────────────────────────────────────
alter table public.subscriptions
  add column if not exists pricing_plan text;

update public.subscriptions
  set pricing_plan = 'monthly_699'
  where pricing_plan is null;

create index if not exists subscriptions_pricing_plan_idx
  on public.subscriptions (pricing_plan)
  where pricing_plan is not null;

-- funnel_events ───────────────────────────────────────────────────────────────
alter table public.funnel_events
  add column if not exists pricing_plan text;

update public.funnel_events
  set pricing_plan = 'monthly_699'
  where pricing_plan is null;

create index if not exists funnel_events_pricing_plan_idx
  on public.funnel_events (pricing_plan)
  where pricing_plan is not null;
