import React, { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Bell, Camera, Check, Languages, Loader2, Pencil, ShieldCheck, X } from 'lucide-react'
import { supabase } from '@/api/supabaseClient'
import { unsubscribeFromPush, isPushSupported, isSubscribedToPush, updatePushLang } from '@/lib/push'
import { setLang } from '@/lib/i18n'
import { profileCache, updateProfileCache } from '@/lib/profileCache'
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
  const { t, i18n } = useTranslation()
  const currentLang = i18n.language?.startsWith('es') ? 'es' : 'en'

  // Show spinner only on very first load (no localStorage data at all)
  const hasCache = Boolean(profileCache.uid)
  const [loading, setLoading] = useState(!hasCache)
  const [saving, setSaving]   = useState(false)
  const [pushSubscribed, setPushSubscribed] = useState(false)
  const [userId, setUserId]   = useState(profileCache.uid)

  // Initialize from localStorage-backed cache — instant on page reload
  const [prefs, setPrefs]               = useState(profileCache.prefs ?? { promotions: true, newsletter: true })
  const [displayName, setDisplayName]   = useState(profileCache.displayName ?? '')
  const [avatarUrl, setAvatarUrl]       = useState(profileCache.avatarUrl ?? null)
  const [editingName, setEditingName]   = useState(false)
  const [nameInput, setNameInput]       = useState('')
  const [savingName, setSavingName]     = useState(false)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const avatarInputRef = useRef()

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setLoading(false); return }
      setUserId(user.id)

      const { data, error } = await supabase
        .from('subscriptions')
        .select('notification_preferences, display_name, avatar_url')
        .eq('user_id', user.id)
        .single()

      // Only update if the DB returned valid data — never overwrite cache with nulls on error
      if (data && !error) {
        const fetchedPrefs  = data.notification_preferences ?? { promotions: true, newsletter: true }
        const fetchedName   = data.display_name  ?? profileCache.displayName ?? ''
        const fetchedAvatar = data.avatar_url    ?? profileCache.avatarUrl   ?? null

        setPrefs(fetchedPrefs)
        setDisplayName(fetchedName)
        setAvatarUrl(fetchedAvatar)
        updateProfileCache({ uid: user.id, displayName: fetchedName, avatarUrl: fetchedAvatar, prefs: fetchedPrefs })
      }

      if (isPushSupported()) {
        const subscribed = await isSubscribedToPush()
        setPushSubscribed(subscribed)
      }

      setLoading(false)
    }
    load()
  }, [])

  async function handleSaveName() {
    const trimmed = nameInput.trim()
    if (trimmed.length < 3 || trimmed.length > 30) return
    setSavingName(true)
    const { error } = await supabase
      .from('subscriptions')
      .update({ display_name: trimmed })
      .eq('user_id', userId)
    setSavingName(false)
    if (error) {
      toast.error(t('communityProfile.nameError'))
    } else {
      setDisplayName(trimmed)
      setEditingName(false)
      updateProfileCache({ displayName: trimmed })
      toast.success(t('communityProfile.nameSaved'))
    }
  }

  async function handleAvatarChange(e) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 5 * 1024 * 1024) {
      toast.error(t('communityProfile.avatarTooLarge'))
      return
    }
    setUploadingAvatar(true)
    try {
      const ext  = file.name.split('.').pop()
      const path = `${userId}/avatar_${Date.now()}.${ext}`
      const { error: uploadError } = await supabase.storage
        .from('feed-images')
        .upload(path, file, { upsert: false })
      if (uploadError) throw uploadError
      const { data: { publicUrl } } = supabase.storage.from('feed-images').getPublicUrl(path)
      const { error: updateError } = await supabase
        .from('subscriptions')
        .update({ avatar_url: publicUrl })
        .eq('user_id', userId)
      if (updateError) throw updateError
      setAvatarUrl(publicUrl)
      updateProfileCache({ avatarUrl: publicUrl })
      toast.success(t('communityProfile.avatarSaved'))
    } catch {
      toast.error(t('communityProfile.avatarError'))
    } finally {
      setUploadingAvatar(false)
    }
  }

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
    } else {
      updateProfileCache({ prefs: next })
    }
  }

  async function handleDisablePush() {
    await unsubscribeFromPush()
    setPushSubscribed(false)
    toast.success(t('settings.disablePushConfirm'))
  }

  async function toggleLang(lang) {
    if (lang === currentLang) return
    setLang(lang)
    updatePushLang(lang)
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const { data } = await supabase
        .from('subscriptions')
        .select('notification_preferences')
        .eq('user_id', user.id)
        .single()
      const current = data?.notification_preferences ?? { promotions: true, newsletter: true }
      await supabase
        .from('subscriptions')
        .update({ notification_preferences: { ...current, lang } })
        .eq('user_id', user.id)
    }
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

      {/* Community profile */}
      <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden shadow-sm">
        <div className="px-5 pt-5 pb-3 border-b border-stone-100 flex items-center gap-2">
          <Camera className="w-4 h-4 text-brand" />
          <h2 className="text-sm font-semibold text-stone-800">{t('communityProfile.section')}</h2>
        </div>
        <div className="px-5 py-4 flex items-center gap-4">
          {/* Avatar */}
          <div className="relative flex-shrink-0">
            <button
              onClick={() => avatarInputRef.current?.click()}
              disabled={uploadingAvatar}
              className="w-16 h-16 rounded-full overflow-hidden bg-brand/10 flex items-center justify-center relative group"
            >
              {avatarUrl ? (
                <img src={avatarUrl} alt="" className="w-full h-full object-cover" />
              ) : (
                <span className="text-xl font-bold text-brand">
                  {displayName?.[0]?.toUpperCase() ?? '?'}
                </span>
              )}
              <div className="absolute inset-0 bg-black/30 rounded-full opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                {uploadingAvatar
                  ? <Loader2 className="w-5 h-5 text-white animate-spin" />
                  : <Camera className="w-5 h-5 text-white" />}
              </div>
            </button>
            <input
              ref={avatarInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleAvatarChange}
            />
          </div>

          {/* Name */}
          <div className="flex-1 min-w-0">
            <p className="text-xs text-stone-400 mb-1">{t('communityProfile.section')}</p>
            {editingName ? (
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={nameInput}
                  onChange={e => setNameInput(e.target.value)}
                  maxLength={30}
                  autoFocus
                  onKeyDown={e => { if (e.key === 'Enter') handleSaveName(); if (e.key === 'Escape') setEditingName(false) }}
                  className="flex-1 min-w-0 border border-stone-200 rounded-lg px-3 py-1.5 text-sm text-stone-800 outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand"
                />
                <button
                  onClick={handleSaveName}
                  disabled={savingName || nameInput.trim().length < 3}
                  className="p-1.5 rounded-lg bg-brand text-white disabled:opacity-50"
                >
                  {savingName ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                </button>
                <button onClick={() => setEditingName(false)} className="p-1.5 rounded-lg text-stone-400 hover:bg-stone-100">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-stone-800 truncate">
                  {displayName || <span className="text-stone-400 font-normal">{t('feed.displayNameLabel')}</span>}
                </span>
                <button
                  onClick={() => { setNameInput(displayName); setEditingName(true) }}
                  className="p-1 rounded-lg text-stone-400 hover:text-brand hover:bg-stone-100 flex-shrink-0"
                >
                  <Pencil className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
            <p className="text-xs text-stone-400 mt-0.5">{t('communityProfile.desc')}</p>
          </div>
        </div>
      </div>

      {/* Language selector */}
      <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden shadow-sm">
        <div className="px-5 pt-5 pb-3 border-b border-stone-100 flex items-center gap-2">
          <Languages className="w-4 h-4 text-brand" />
          <h2 className="text-sm font-semibold text-stone-800">{t('settings.languageSection')}</h2>
        </div>
        <div className="px-5 py-4">
          <p className="text-xs text-stone-400 mb-3">{t('settings.languageDesc')}</p>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => toggleLang('es')}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl border-2 transition-all text-left ${
                currentLang === 'es' ? 'border-brand bg-brand/5' : 'border-stone-200 hover:border-stone-300'
              }`}
            >
              <span className="text-2xl leading-none">🇪🇸</span>
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-semibold ${currentLang === 'es' ? 'text-brand' : 'text-stone-700'}`}>Español</p>
                <p className="text-xs text-stone-400">Spanish</p>
              </div>
              {currentLang === 'es' && <Check className="w-4 h-4 text-brand flex-shrink-0" />}
            </button>
            <button
              onClick={() => toggleLang('en')}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl border-2 transition-all text-left ${
                currentLang === 'en' ? 'border-brand bg-brand/5' : 'border-stone-200 hover:border-stone-300'
              }`}
            >
              <span className="text-2xl leading-none">🇺🇸</span>
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-semibold ${currentLang === 'en' ? 'text-brand' : 'text-stone-700'}`}>English</p>
                <p className="text-xs text-stone-400">Inglés</p>
              </div>
              {currentLang === 'en' && <Check className="w-4 h-4 text-brand flex-shrink-0" />}
            </button>
          </div>
        </div>
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
