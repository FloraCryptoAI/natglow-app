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
  // Meta/FB-safe funnel (Spanish LatAm), $7.90 tripwire offer. Uses a DEDICATED
  // Hotmart checkout (VITE_HOTMART_CHECKOUT_URL_NATGLOW) so the $7.90 price does
  // not collide with the $17 product used by /quiz-meta. Falls back to the basic
  // URL if the dedicated env is not set yet (button never breaks — but the price
  // shown on the page won't match the checkout until the env is configured).
  natglow: {
    hotmart_checkout_url:
      import.meta.env.VITE_HOTMART_CHECKOUT_URL_NATGLOW ||
      import.meta.env.VITE_HOTMART_CHECKOUT_URL_BASIC,
    display_price: 7.9,
    period_label: 'pago único',
    label_es: '$7.90 USD',
    cta_es: 'ACTIVAR MI RUTINA PERSONALIZADA',
    plan_key: 'one_time_basic',
    // Canonical entry is /quiz (migrated here — the live Facebook ad already
    // points to it). /quiz-natglow still works as an alias of the same route.
    route_path: '/quiz',
  },
}
