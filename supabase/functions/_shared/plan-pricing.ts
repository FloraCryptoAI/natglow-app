// Single source of truth for the USD *list price* of each plan.
//
// The admin panel consolidates everything in USD (Facebook Ads costs are logged
// in USD). Every NatGlow product is a fixed-price digital product: the per-country
// offers (MX $149, CO $29.900, CL $7.490, PE S/29…) are the SAME $7.90 USD product
// charged in the buyer's local currency. So a sale's USD value is a known constant
// per plan — not something to derive via live FX. Legacy one_time_* plans keep
// their historical USD prices so old orders still consolidate correctly.
export const PLAN_USD: Record<string, number> = {
  // TESTE: o /quiz está com preço promocional de US$3,90 (era 7,90). Este é o
  // valor USD consolidado para vendas natglow em moeda local. Ao encerrar o
  // teste, voltar para o preço real.
  natglow:           3.9,
  one_time_basic:    17,
  one_time_standard: 27,
  one_time_premium:  47,
  monthly_499:       4.99,
  monthly_699:       6.99,
  monthly_1499:      14.99,
  // Access granted for Hotmart's own product review — not a real sale.
  natglow_free_hotmart_review: 0,
}

// Base USD amount of a subscription row for consolidated reporting.
// Prefers the persisted amount_usd column (set by the webhook / backfilled by
// migration); falls back to the plan's list price. purchase_amount is the LOCAL
// charge (amount_original) and must never be summed as if it were USD.
export function usdAmount(
  s: { amount_usd?: number | null; pricing_plan?: string | null },
): number {
  if (typeof s.amount_usd === 'number') return s.amount_usd
  return PLAN_USD[(s.pricing_plan as string) ?? ''] ?? 0
}
