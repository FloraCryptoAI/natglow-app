import { getLang } from '@/lib/i18n'
import { detectCountry } from '@/lib/detectCountry'

const SESSION_KEY = 'natglow_funnel_session'

function getSessionId() {
  let id = sessionStorage.getItem(SESSION_KEY)
  if (!id) {
    id = crypto.randomUUID()
    sessionStorage.setItem(SESSION_KEY, id)
  }
  return id
}

export function getFunnelSessionId() {
  return getSessionId()
}

// Mint a fresh funnel session id. Call this at the *real* start of a quiz (the
// "Comenzar" click), so that redoing the quiz from the beginning counts as a
// NEW attempt — while multiple clicks within one attempt (e.g. clicking the
// checkout button twice) keep the same id and are deduped as one. Resuming a
// quiz mid-way does NOT call this, so the in-progress attempt keeps its id.
// This id is also forwarded to the Hotmart checkout as `src`, letting the
// webhook tie the payment back to this exact quiz attempt.
export function startFunnelSession() {
  const id = crypto.randomUUID()
  sessionStorage.setItem(SESSION_KEY, id)
  return id
}

export async function trackFunnelEvent(event_type, metadata = null, pricing_plan = null) {
  try {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
    const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY
    fetch(`${supabaseUrl}/functions/v1/track-funnel-event`, {
      method: 'POST',
      // keepalive lets the request finish even if the page navigates away right
      // after (e.g. cta_clicked → immediate redirect to the Hotmart checkout).
      // Without it the browser cancels the in-flight fetch on unload and the
      // event is lost — which is why checkout clicks weren't being recorded.
      keepalive: true,
      headers: {
        Authorization: `Bearer ${supabaseAnonKey}`,
        apikey: supabaseAnonKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        event_type,
        session_id: getSessionId(),
        idioma: getLang(),
        // Browser-derived country (used as fallback when CF-IPCountry header
        // isn't set by Supabase Edge — see src/lib/detectCountry.js).
        pais: detectCountry(),
        metadata,
        pricing_plan,
      }),
    })
  } catch {
    // never throw — tracking must never break the app
  }
}
