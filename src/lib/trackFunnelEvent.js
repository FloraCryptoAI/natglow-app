import { getLang } from '@/lib/i18n'

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

export async function trackFunnelEvent(event_type, metadata = null) {
  try {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
    const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY
    fetch(`${supabaseUrl}/functions/v1/track-funnel-event`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${supabaseAnonKey}`,
        apikey: supabaseAnonKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        event_type,
        session_id: getSessionId(),
        idioma: getLang(),
        metadata,
      }),
    })
  } catch {
    // never throw — tracking must never break the app
  }
}
