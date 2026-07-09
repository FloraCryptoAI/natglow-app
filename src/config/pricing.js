export const PRICING_PLANS = {
  bold: {
    hotmart_checkout_url: import.meta.env.VITE_HOTMART_CHECKOUT_URL_BASIC,
    display_price: 17,
    period_label: 'pago único',
    label_es: '$17 USD',
    cta_es: '¡Sí, lo quiero ya!',
    plan_key: 'one_time_basic',
    route_path: '/quiz-meta',
    results_path: '/results-bold',
  },
  detox: {
    hotmart_checkout_url: import.meta.env.VITE_HOTMART_CHECKOUT_URL_BASIC,
    display_price: 17,
    period_label: 'pago único',
    label_es: '$17 USD',
    cta_es: '¡Sí, quiero desintoxicar ahora!',
    plan_key: 'one_time_basic',
    route_path: '/quiz-detox',
    results_path: '/results-detox',
  },
  // Meta/FB-safe funnel (Spanish LatAm) with country-based dynamic pricing —
  // see src/config/countryOffers.js for the per-country price/checkout URL
  // (that's the single source of truth now, not display_price/hotmart_checkout_url
  // here, since the price varies by country instead of being a flat constant).
  natglow: {
    plan_key: 'one_time_basic',
    // Canonical entry is /quiz (migrated here — the live Facebook ad already
    // points to it). /quiz-natglow still works as an alias of the same route.
    route_path: '/quiz',
  },
}
