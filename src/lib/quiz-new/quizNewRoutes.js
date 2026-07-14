// Route constants for the isolated /quiz-new funnel + the single place that
// decides which offer page the result CTA sends people to. Change OFFER_ROUTE
// here (and nowhere else) when the offer is rebuilt on its own route later.

export const NEW_QUIZ_ROUTE         = '/quiz-new'
export const NEW_QUIZ_RESULTS_ROUTE = '/quiz-new/results'

// The result page bridges to the CURRENT offer. Centralized so a future rebuild
// only needs to swap this constant.
export const OFFER_ROUTE = '/offer-natglow'

// Query params we always try to carry across the whole funnel and forward to the
// offer, so country pricing + ad attribution survive the navigation.
const FORWARD_PARAMS = ['country', 'utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term', 'fbclid']

/**
 * Build the offer URL, forwarding country / UTMs / fbclid and the quiz attempt id.
 * The attempt id is sent as both `quiz_attempt_id` and `src` so the future offer
 * rebuild (and Hotmart's `src` tracking) can tie the purchase back to this attempt.
 * @param {import('./quizNewStorage').QuizNewSession} session
 */
export function buildOfferUrl(session) {
  const params = new URLSearchParams()
  const s = session ?? {}
  if (s.country)      params.set('country', s.country)
  if (s.utmSource)    params.set('utm_source', s.utmSource)
  if (s.utmMedium)    params.set('utm_medium', s.utmMedium)
  if (s.utmCampaign)  params.set('utm_campaign', s.utmCampaign)
  if (s.utmContent)   params.set('utm_content', s.utmContent)
  if (s.utmTerm)      params.set('utm_term', s.utmTerm)
  if (s.fbclid)       params.set('fbclid', s.fbclid)
  if (s.attemptId)  { params.set('quiz_attempt_id', s.attemptId); params.set('src', s.attemptId) }
  const qs = params.toString()
  return qs ? `${OFFER_ROUTE}?${qs}` : OFFER_ROUTE
}

/**
 * Preserve the forwardable params of the CURRENT url as a querystring — used when
 * redirecting a direct /quiz-new/results hit back to /quiz-new without losing
 * country / attribution.
 */
export function preservedSearch() {
  try {
    const src = new URLSearchParams(window.location.search)
    const out = new URLSearchParams()
    for (const k of FORWARD_PARAMS) {
      const v = src.get(k)
      if (v) out.set(k, v)
    }
    const qs = out.toString()
    return qs ? `?${qs}` : ''
  } catch {
    return ''
  }
}
