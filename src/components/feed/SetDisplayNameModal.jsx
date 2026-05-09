import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { supabase } from '@/api/supabaseClient'
import { toast } from 'sonner'
import { X } from 'lucide-react'

export default function SetDisplayNameModal({ onSaved, onClose }) {
  const { t } = useTranslation()
  const [name, setName]     = useState('')
  const [saving, setSaving] = useState(false)

  async function handleSave() {
    const trimmed = name.trim()
    if (trimmed.length < 3 || trimmed.length > 30) return
    setSaving(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')
      const { error } = await supabase
        .from('subscriptions')
        .update({ display_name: trimmed })
        .eq('user_id', user.id)
      if (error) throw error
      onSaved(trimmed)
    } catch {
      toast.error(t('feed.errorSavingName'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
      <div className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-bold text-stone-800">{t('feed.setDisplayName')}</h2>
          <button onClick={onClose} className="p-1 rounded-lg text-stone-400 hover:bg-stone-100">
            <X className="w-4 h-4" />
          </button>
        </div>
        <p className="text-sm text-stone-500 mb-4">{t('feed.displayNameHint')}</p>
        <input
          type="text"
          value={name}
          onChange={e => setName(e.target.value)}
          maxLength={30}
          placeholder={t('feed.displayNameLabel')}
          className="w-full border border-stone-200 rounded-xl px-4 py-3 text-sm text-stone-800 outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand mb-4"
          onKeyDown={e => e.key === 'Enter' && handleSave()}
        />
        <div className="flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl border border-stone-200 text-sm font-medium text-stone-500 hover:bg-stone-50"
          >
            {t('common.cancel') || 'Cancelar'}
          </button>
          <button
            onClick={handleSave}
            disabled={saving || name.trim().length < 3}
            className="flex-1 py-2.5 rounded-xl bg-brand text-white text-sm font-semibold disabled:opacity-50"
          >
            {saving ? t('settings.saving') : t('common.save') || 'Salvar'}
          </button>
        </div>
      </div>
    </div>
  )
}
