import React, { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Bell, ShieldCheck, Loader2 } from 'lucide-react'
import { supabase } from '@/api/supabaseClient'
import { unsubscribeFromPush, isPushSupported, isSubscribedToPush } from '@/lib/push'
import { InstallSettingsSection } from '@/components/InstallPrompt'
import { toast } from 'sonner'

function ToggleRow({ label, description, checked, onChange, disabled = false }) {
  return (
    <div className="flex items-start justify-between gap-4 py-4 border-b border-stone-100 last:border-0">
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium ${disabled ? 'text-stone-400' : 'text-stone-800'}`}>{label}</p>
        {description && (
          <p className="text-xs text-stone-400 mt-0.5 leading-snug">{description}</p>
        )}
      </div>
      <button
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => !disabled && onChange(!checked)}
        className={`flex-shrink-0 relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
          checked ? 'bg-brand' : 'bg-stone-200'
        } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform ${
            checked ? 'translate-x-6' : 'translate-x-1'
          }`}
        />
      </button>
    </div>
  )
}

export default function HairSettings() {
  const { t } = useTranslation()
  const [prefs, setPrefs] = useState({ promotions: true, newsletter: true })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [pushSubscribed, setPushSubscribed] = useState(false)
  const [userId, setUserId] = useState(null)

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      setUserId(user.id)

      const { data } = await supabase
        .from('subscriptions')
        .select('notification_preferences')
        .eq('user_id', user.id)
        .single()

      if (data?.notification_preferences) {
        setPrefs(data.notification_preferences)
      }

      if (isPushSupported()) {
        const subscribed = await isSubscribedToPush()
        setPushSubscribed(subscribed)
      }

      setLoading(false)
    }
    load()
  }, [])

  async function updatePref(key, value) {
    const next = { ...prefs, [key]: value }
    setPrefs(next)
    setSaving(true)
    const { error } = await supabase
      .from('subscriptions')
      .update({ notification_preferences: next })
      .eq('user_id', userId)
    setSaving(false)
    if (error) {
      toast.error('Error saving preferences')
      setPrefs(prefs)
    }
  }

  async function handleDisablePush() {
    await unsubscribeFromPush()
    setPushSubscribed(false)
    toast.success(t('settings.disablePushConfirm'))
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-5 h-5 animate-spin text-stone-400" />
      </div>
    )
  }

  return (
    <div className="space-y-6 pb-8 max-w-lg mx-auto">
      <div>
        <h1 className="text-xl font-bold text-stone-800">{t('settings.title')}</h1>
      </div>

      {/* Notification preferences */}
      <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden shadow-sm">
        <div className="px-5 pt-5 pb-3 border-b border-stone-100 flex items-center gap-2">
          <Bell className="w-4 h-4 text-brand" />
          <h2 className="text-sm font-semibold text-stone-800">{t('settings.notificationsSection')}</h2>
          {saving && <Loader2 className="w-3.5 h-3.5 animate-spin text-stone-400 ml-auto" />}
        </div>

        <div className="px-5">
          <ToggleRow
            label={t('settings.promotions')}
            description={t('settings.promotionsDesc')}
            checked={prefs.promotions}
            onChange={(v) => updatePref('promotions', v)}
          />
          <ToggleRow
            label={t('settings.newsletter')}
            description={t('settings.newsletterDesc')}
            checked={prefs.newsletter}
            onChange={(v) => updatePref('newsletter', v)}
          />
        </div>
      </div>

      {/* Important messages — always on */}
      <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden shadow-sm">
        <div className="px-5 pt-5 pb-3 border-b border-stone-100 flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-stone-400" />
          <h2 className="text-sm font-semibold text-stone-600">{t('settings.importantMessages')}</h2>
        </div>
        <div className="px-5">
          <ToggleRow
            label={t('settings.importantMessages')}
            description={t('settings.importantMessagesDesc')}
            checked={true}
            onChange={() => {}}
            disabled={true}
          />
        </div>
      </div>

      {/* Install app */}
      <InstallSettingsSection />

      {/* Push device control */}
      {isPushSupported() && pushSubscribed && (
        <div className="bg-white rounded-2xl border border-stone-200 p-5 shadow-sm">
          <p className="text-sm font-medium text-stone-800 mb-1">{t('settings.disablePush')}</p>
          <p className="text-xs text-stone-400 mb-4">{t('settings.disablePushDesc')}</p>
          <button
            onClick={handleDisablePush}
            className="px-4 py-2 text-sm font-medium text-red-500 border border-red-200 rounded-xl hover:bg-red-50 transition-colors"
          >
            {t('settings.disablePush')}
          </button>
        </div>
      )}
    </div>
  )
}
