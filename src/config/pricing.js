export const PRICING_PLANS = {
  bold: {
    hotmart_checkout_url: import.meta.env.VITE_HOTMART_CHECKOUT_URL_BASIC,
    display_price: 17,
    period_label: 'pago único',
    label_es: '$17 USD',
    cta_es: '¡Sí, lo quiero ya!',
    plan_key: 'one_time_basic',
    route_path: '/quiz-bold',
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
}
