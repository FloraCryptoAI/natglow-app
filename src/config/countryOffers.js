// Country-based pricing for /quiz-natglow. The quiz itself stays the same for
// every country — only the offer page's price/checkout link changes, driven
// by a `?country=` URL param captured on the quiz and persisted so it still
// applies if the user reaches the offer page without the param in the URL.
const VALID_CODES = ['mx', 'co', 'pe', 'cl']

export const COUNTRY_OFFERS = {
  cl: {
    country: 'Chile',
    currency: 'CLP',
    displayPrice: '$7.490 CLP',
    oldPrice: '$29.900 CLP',
    priceValue: 7490,
    checkoutUrl: 'https://pay.hotmart.com/F105945011B?off=4cqblugp&checkoutMode=10',
  },
  pe: {
    country: 'Perú',
    currency: 'PEN',
    displayPrice: 'S/29',
    oldPrice: 'S/109',
    priceValue: 29,
    checkoutUrl: 'https://pay.hotmart.com/F105945011B?off=ih566qbs&checkoutMode=10',
  },
  co: {
    country: 'Colombia',
    currency: 'COP',
    displayPrice: '$29.900 COP',
    oldPrice: '$119.900 COP',
    priceValue: 29900,
    checkoutUrl: 'https://pay.hotmart.com/F105945011B?off=vsu2mzob&checkoutMode=10',
  },
  mx: {
    country: 'México',
    currency: 'MXN',
    displayPrice: '$149 MXN',
    oldPrice: '$599 MXN',
    priceValue: 149,
    checkoutUrl: 'https://pay.hotmart.com/F105945011B?off=ahwhbzk6&checkoutMode=10',
  },
  // Fallback: no (or unrecognized) ?country= param. Shows the USD price with a
  // bare '$' (no "US" prefix) and the plain Hotmart checkout, which converts to
  // the buyer's local currency at checkout. Never mx.
  default: {
    country: 'Internacional',
    currency: 'USD',
    displayPrice: '$3,90',
    oldPrice: '$29,90',
    priceValue: 3.9,
    checkoutUrl: 'https://pay.hotmart.com/F105945011B?checkoutMode=10',
  },
}

// Country now applies ONLY when ?country= is present in the current URL — there
// is no longer any localStorage persistence. So the plain /quiz link (no param)
// always resolves to the USD default, and a ?country=mx|co|pe|cl link carries
// that country through the funnel via the forwarded querystring.
function resolveCountryCode() {
  try {
    const fromUrl = new URLSearchParams(window.location.search).get('country')?.toLowerCase()
    if (fromUrl && VALID_CODES.includes(fromUrl)) return fromUrl
  } catch { /* URL unavailable */ }
  return 'default'
}

// Kept as a no-op so existing callers (the quiz mount) don't break. Country is
// resolved from the URL on demand now, nothing is persisted.
export function captureCountry() { /* no-op — see resolveCountryCode */ }

// Call on the offer page to get the price/checkout for the resolved country.
export function getCountryOffer() {
  const code = resolveCountryCode()
  return { code, ...COUNTRY_OFFERS[code] }
}
