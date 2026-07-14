// Isolated analytics for /quiz-new. Sends quiz_new_* events to the SAME
// track-funnel-event edge function, but namespaced by event_type prefix and by
// using the quiz attempt id as session_id — so its data never mixes with the
// /quiz (natglow) or detox funnels. No PII (name / full answers) is ever sent.
import { getLang } from '@/lib/i18n'
import { detectCountry } from '@/lib/detectCountry'
import { hasSent, markSent } from './quizNewStorage'

const ENDPOINT = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/track-funnel-event`
const ANON = import.meta.env.VITE_SUPABASE_ANON_KEY

// Aggregate, non-personal metadata derived from the attempt.
function baseMetadata(session, extra = {}) {
  const a = session?.answers ?? {}
  const chems = Array.isArray(a.chemicalProcesses) ? a.chemicalProcesses.filter(v => v && v !== 'ninguno') : []
  const answered = Object.values(a).filter(v => (Array.isArray(v) ? v.length > 0 : !!v)).length
  return {
    funnel: 'quiz_new',
    quiz_attempt_id: session?.attemptId ?? null,
    country: session?.country ?? null,
    hair_type: a.hairType || null,
    primary_goal: Array.isArray(a.goals) ? (a.goals[0] ?? null) : null,
    available_time: a.availableTime || null,
    wash_frequency: a.washFrequency || null,
    has_heat_use: a.heatUse ? a.heatUse !== 'no' : null,
    has_chemical_process: chems.length > 0,
    answer_count: answered,
    utm_source: session?.utmSource ?? null,
    utm_medium: session?.utmMedium ?? null,
    utm_campaign: session?.utmCampaign ?? null,
    utm_content: session?.utmContent ?? null,
    utm_term: session?.utmTerm ?? null,
    fbclid: session?.fbclid ?? null,
    ...extra,
  }
}

/**
 * Fire an event. keepalive lets it survive a redirect (e.g. results CTA).
 * @param {import('./quizNewStorage').QuizNewSession} session
 */
export function post(eventType, session, extra = {}) {
  try {
    fetch(ENDPOINT, {
      method: 'POST',
      keepalive: true,
      headers: { Authorization: `Bearer ${ANON}`, apikey: ANON, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event_type: eventType,
        session_id: session?.attemptId,          // attempt id = isolated session namespace
        idioma: getLang(),
        pais: detectCountry(),
        metadata: baseMetadata(session, extra),
        pricing_plan: null,
      }),
    })
  } catch { /* tracking must never break the app */ }
}

/**
 * Fire once per attempt for a given key; returns the (possibly) updated session
 * with the dedupe flag set. Use for started/completed/results_viewed/cta and
 * per-step viewed (key includes the step).
 * @param {import('./quizNewStorage').QuizNewSession} session
 * @returns {import('./quizNewStorage').QuizNewSession}
 */
export function postOnce(session, dedupeKey, eventType, extra = {}) {
  if (!session || hasSent(session, dedupeKey)) return session
  post(eventType, session, extra)
  return markSent(session, dedupeKey)
}
