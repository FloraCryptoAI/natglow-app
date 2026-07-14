// Attempt lifecycle + sessionStorage persistence for /quiz-new. Fully isolated
// from the other funnels (own storage key, own attempt id).
import { getCountryOffer } from '@/config/countryOffers'
import { getAttribution } from '@/lib/tracking/attribution'

const KEY = 'quiznew_session'

/**
 * @typedef {Object} QuizNewAnswers
 * @property {string[]} goals
 * @property {string}   profilePreference
 * @property {string}   hairType
 * @property {string[]} currentCondition
 * @property {string}   washFrequency
 * @property {string}   waterTemperature
 * @property {string}   heatUse
 * @property {string[]} chemicalProcesses
 * @property {string}   hydrationFrequency
 * @property {string}   availableTime
 * @property {string}   hairLength
 * @property {string}   routinePreference
 * @property {string}   name
 */

/**
 * @typedef {Object} QuizNewSession
 * @property {string}  attemptId
 * @property {string}  startedAt
 * @property {string=} completedAt
 * @property {number}  currentStep
 * @property {QuizNewAnswers} answers
 * @property {string=} country
 * @property {string=} utmSource
 * @property {string=} utmMedium
 * @property {string=} utmCampaign
 * @property {string=} utmContent
 * @property {string=} utmTerm
 * @property {string=} fbclid
 * @property {Record<string, true>} sentEvents
 */

/** @returns {QuizNewAnswers} */
export function emptyAnswers() {
  return {
    goals: [], profilePreference: '', hairType: '', currentCondition: [],
    washFrequency: '', waterTemperature: '', heatUse: '', chemicalProcesses: [],
    hydrationFrequency: '', availableTime: '', hairLength: '', routinePreference: '',
    name: '',
  }
}

/** @returns {QuizNewSession | null} */
export function loadSession() {
  try {
    const raw = sessionStorage.getItem(KEY)
    if (!raw) return null
    const s = JSON.parse(raw)
    if (!s || !s.attemptId || !s.answers) return null
    if (!s.sentEvents) s.sentEvents = {}
    return s
  } catch {
    return null
  }
}

/** @param {QuizNewSession} session */
export function saveSession(session) {
  try { sessionStorage.setItem(KEY, JSON.stringify(session)) } catch { /* blocked */ }
  return session
}

// Resolve country (reuses the shared ?country= logic) + ad attribution once.
function resolveContext() {
  let country
  try { country = getCountryOffer().code } catch { country = undefined }
  const a = getAttribution() ?? {}
  return {
    country,
    utmSource:   a.utm_source, utmMedium: a.utm_medium, utmCampaign: a.utm_campaign,
    utmContent:  a.utm_content, utmTerm: a.utm_term, fbclid: a.fbclid,
  }
}

/**
 * Start a BRAND-NEW attempt (fresh id + empty answers). Called on the real quiz
 * start ("Comenzar") and on restart — so redoing the quiz counts again.
 * @returns {QuizNewSession}
 */
export function startNewAttempt() {
  const session = {
    attemptId: crypto.randomUUID(),
    startedAt: new Date().toISOString(),
    currentStep: 0,
    answers: emptyAnswers(),
    sentEvents: {},
    ...resolveContext(),
  }
  return saveSession(session)
}

/** @param {QuizNewSession} session @returns {QuizNewSession} */
export function setStep(session, step) {
  return saveSession({ ...session, currentStep: step })
}

/** Single-choice answer. @param {QuizNewSession} session */
export function setAnswer(session, field, value) {
  return saveSession({ ...session, answers: { ...session.answers, [field]: value } })
}

/**
 * Multi-choice toggle honoring exclusive options: picking an exclusive option
 * clears the rest; picking any normal option clears the exclusive one.
 * @param {QuizNewSession} session
 * @param {{value:string, exclusive?:boolean}[]} options
 */
export function toggleMulti(session, field, value, options) {
  const current = Array.isArray(session.answers[field]) ? session.answers[field] : []
  const opt = options.find(o => o.value === value)
  const exclusiveValues = options.filter(o => o.exclusive).map(o => o.value)

  let next
  if (opt?.exclusive) {
    next = current.includes(value) ? [] : [value]         // toggle the exclusive alone
  } else {
    const withoutExclusive = current.filter(v => !exclusiveValues.includes(v))
    next = withoutExclusive.includes(value)
      ? withoutExclusive.filter(v => v !== value)
      : [...withoutExclusive, value]
  }
  return saveSession({ ...session, answers: { ...session.answers, [field]: next } })
}

/** @param {QuizNewSession} session */
export function setName(session, name) {
  return setAnswer(session, 'name', name)
}

/** @param {QuizNewSession} session */
export function markCompleted(session) {
  return saveSession({ ...session, completedAt: new Date().toISOString() })
}

/** A results page is only valid with a completed attempt that has a name. */
export function isValidCompleted(session) {
  return !!(session && session.completedAt && session.answers?.name)
}

// ── Event dedupe (per attempt) ──────────────────────────────────────────────
/** @param {QuizNewSession} session */
export function hasSent(session, eventKey) {
  return !!session?.sentEvents?.[eventKey]
}
/** @param {QuizNewSession} session */
export function markSent(session, eventKey) {
  const sentEvents = { ...(session.sentEvents ?? {}), [eventKey]: true }
  return saveSession({ ...session, sentEvents })
}
