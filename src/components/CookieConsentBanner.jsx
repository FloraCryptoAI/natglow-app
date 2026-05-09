import React, { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { X } from 'lucide-react'
import { initFacebookPixel } from '@/lib/tracking/facebook-pixel'
import { initTikTokPixel }   from '@/lib/tracking/tiktok-pixel'

const CONSENT_KEY    = 'natglow_consent'
const CONFIG_CACHE   = '_consent_config_checked'

function getConsent() {
  try {
    const raw = localStorage.getItem(CONSENT_KEY)
    return raw ? JSON.parse(raw) : null
  } catch { return null }
}

function saveConsent(accepted) {
  try {
    localStorage.setItem(CONSENT_KEY, JSON.stringify({ accepted, savedAt: Date.now() }))
  } catch { /* ignore */ }
}

async function isConsentRequired() {
  try {
    const cached = sessionStorage.getItem(CONFIG_CACHE)
    if (cached !== null) return cached === 'true'

    const supabaseUrl     = import.meta.env.VITE_SUPABASE_URL
    const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY
    const res = await fetch(
      `${supabaseUrl}/functions/v1/admin-tracking-config?mode=public`,
      { headers: { Authorization: `Bearer ${supabaseAnonKey}`, apikey: supabaseAnonKey } },
    )
    if (!res.ok) return true  // default safe: show banner
    const data = await res.json()
    const required = data['tracking.consent.required'] !== false
    try { sessionStorage.setItem(CONFIG_CACHE, String(required)) } catch { /* ignore */ }
    return required
  } catch {
    return true  // default safe
  }
}

export default function CookieConsentBanner() {
  const { t } = useTranslation()
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const existing = getConsent()
    if (existing !== null) {
      // Consent already given — init pixels immediately if accepted
      if (existing.accepted) {
        initFacebookPixel()
        initTikTokPixel()
      }
      return
    }

    isConsentRequired().then(required => {
      if (!required) {
        // No consent needed — init everything immediately
        saveConsent(true)
        initFacebookPixel()
        initTikTokPixel()
        return
      }
      setVisible(true)
    })
  }, [])

  function handleAccept() {
    saveConsent(true)
    setVisible(false)
    initFacebookPixel()
    initTikTokPixel()
  }

  function handleReject() {
    saveConsent(false)
    setVisible(false)
  }

  if (!visible) return null

  return (
    <div
      role="dialog"
      aria-label={t('consent.bannerLabel')}
      className="fixed bottom-0 left-0 right-0 z-[9999] bg-white border-t border-stone-200 shadow-lg safe-area-bottom"
    >
      <div className="max-w-4xl mx-auto px-4 py-4 flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-sm text-stone-700 leading-relaxed">
            {t('consent.text')}{' '}
            <a
              href="/privacy"
              target="_blank"
              rel="noopener noreferrer"
              className="underline text-stone-500 hover:text-brand"
            >
              {t('consent.privacyLink')}
            </a>
            .
          </p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={handleReject}
            className="px-4 py-2 text-sm font-medium text-stone-500 hover:text-stone-700 border border-stone-200 rounded-full transition-colors"
          >
            {t('consent.reject')}
          </button>
          <button
            onClick={handleAccept}
            className="px-5 py-2 text-sm font-semibold bg-brand text-white rounded-full hover:bg-brand/90 transition-colors"
          >
            {t('consent.accept')}
          </button>
          <button
            onClick={handleReject}
            className="p-1.5 text-stone-400 hover:text-stone-600 transition-colors"
            aria-label={t('common.close')}
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  )
}
