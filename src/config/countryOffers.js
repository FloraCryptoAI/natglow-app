// Country-based pricing for /quiz-natglow. The quiz itself stays the same for
// every country — only the offer page's price/checkout link changes, driven
// by a `?country=` URL param captured on the quiz and persisted so it still
// applies if the user reaches the offer page without the param in the URL.
const VALID_CODES = ['mx', 'co', 'pe', 'cl']
const STORAGE_KEY = 'natglow_country'

export const COUNTRY_OFFERS = {
  cl: {
    country: 'Chile',
    currency: 'CLP',
    displayPrice: '$7.490 CLP',
    oldPrice: '$29.900 CLP',
    priceValue: 7490,
    checkoutUrl: 'https://pay.hotmart.com/F105945011B?off=4cqblugp',
  },
  pe: {
    country: 'Perú',
    currency: 'PEN',
    displayPrice: 'S/29',
    oldPrice: 'S/109',
    priceValue: 29,
    checkoutUrl: 'https://pay.hotmart.com/F105945011B?off=ih566qbs',
  },
  co: {
    country: 'Colombia',
    currency: 'COP',
    displayPrice: '$29.900 COP',
    oldPrice: '$119.900 COP',
    priceValue: 29900,
    checkoutUrl: 'https://pay.hotmart.com/F105945011B?off=vsu2mzob',
  },
  mx: {
    country: 'México',
    currency: 'MXN',
    displayPrice: '$149 MXN',
    oldPrice: '$599 MXN',
    priceValue: 149,
    checkoutUrl: 'https://pay.hotmart.com/F105945011B?off=ahwhbzk6',
  },
  // Fallback: no ?country= param, an unrecognized country, or no dedicated
  // local offer yet. Reuses the funnel's existing USD checkout — never mx.
  default: {
    country: 'Internacional',
    currency: 'USD',
    displayPrice: 'US$7,90',
    oldPrice: 'US$29,90',
    priceValue: 7.9,
    checkoutUrl:
      import.meta.env.VITE_HOTMART_CHECKOUT_URL_NATGLOW ||
      import.meta.env.VITE_HOTMART_CHECKOUT_URL_BASIC,
  },
}

function resolveCountryCode() {
  try {
    const params = new URLSearchParams(window.location.search)
    // ?country= present always wins, valid or not — an unrecognized code
    // (e.g. ?country=ar) must NOT fall back to a previously stored country,
    // it must resolve straight to the USD default (and overwrite the store).
    if (params.has('country')) {
      const fromUrl = params.get('country')?.toLowerCase()
      const code = fromUrl && VALID_CODES.includes(fromUrl) ? fromUrl : 'default'
      localStorage.setItem(STORAGE_KEY, code)
      return code
    }
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored && VALID_CODES.includes(stored)) return stored
  } catch { /* storage blocked */ }
  return 'default'
}

// Call on the quiz's first mount so the country sticks even if the user
// reaches the offer page later without the query param in the URL.
export function captureCountry() {
  resolveCountryCode()
}

// Call on the offer page to get the price/checkout for the resolved country.
export function getCountryOffer() {
  const code = resolveCountryCode()
  return { code, ...COUNTRY_OFFERS[code] }
}
