import React, { useState, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { supabase } from '@/api/supabaseClient'
import { toast } from 'sonner'
import { X, Image, Loader2, CheckCircle2, Clock, SmilePlus } from 'lucide-react'
import SetDisplayNameModal from './SetDisplayNameModal'
import { compressPostImage } from '@/lib/compressImage'

const FEELINGS = [
  'happy_results',
  'sad_hair',
  'surprised_recipes',
  'loving_journey',
  'excited_progress',
  'motivated',
  'hopeful',
]

export default function CreatePostModal({ currentUserId, displayName, authorAvatarUrl, onClose, onPosted }) {
  const { t } = useTranslation()
  const [content, setContent]               = useState('')
  const [imageFile, setImageFile]           = useState(null)
  const [imageFile2, setImageFile2]         = useState(null)
  const [imagePreview, setImagePreview]     = useState(null)
  const [imagePreview2, setImagePreview2]   = useState(null)
  const [feeling, setFeeling]               = useState(null)
  const [submitting, setSubmitting]         = useState(false)
  const [submitted, setSubmitted]           = useState(false)
  const [showNameModal, setShowNameModal]   = useState(!displayName)
  const [resolvedName, setResolvedName]     = useState(displayName)
  const fileRef  = useRef()
  const fileRef2 = useRef()

  function handleFileChange(e, slot) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 5 * 1024 * 1024) {
      toast.error(t('feed.imageTooLarge') || 'Imagem máx 5MB')
      return
    }
    if (slot === 1) {
      setImageFile(file)
      setImagePreview(URL.createObjectURL(file))
    } else {
      setImageFile2(file)
      setImagePreview2(URL.createObjectURL(file))
    }
  }

  async function uploadImage(file, path) {
    // Compress phone-sized photos (3-5MB) to Instagram-standard (~400KB max)
    // before upload. Falls back to original file if compression fails.
    const compressed = await compressPostImage(file)
    const { error } = await supabase.storage.from('feed-images').upload(path, compressed, { upsert: false })
    if (error) throw error
    const { data: { publicUrl } } = supabase.storage.from('feed-images').getPublicUrl(path)
    return publicUrl
  }

  async function handleSubmit() {
    if (!content.trim()) return
    setSubmitting(true)
    try {
      const ts = Date.now()
      const ext1 = imageFile?.name.split('.').pop()
      const ext2 = imageFile2?.name.split('.').pop()

      const [imageUrl, imageUrl2] = await Promise.all([
        imageFile  ? uploadImage(imageFile,  `${currentUserId}/${ts}.${ext1}`)     : Promise.resolve(null),
        imageFile2 ? uploadImage(imageFile2, `${currentUserId}/${ts + 1}.${ext2}`) : Promise.resolve(null),
      ])

      const { error } = await supabase.from('feed_posts').insert({
        user_id:           currentUserId,
        author_name:       resolvedName,
        author_avatar_url: authorAvatarUrl ?? null,
        content:           content.trim(),
        image_url:         imageUrl,
        image_url_2:       imageUrl2,
        feeling:           feeling,
        is_admin:          false,
        status:            'pending',
      })
      if (error) throw error

      setSubmitted(true)
      onPosted?.(resolvedName)
    } catch (err) {
      const msg = err?.message ?? ''
      if (msg.includes('daily_post_limit_exceeded')) {
        toast.error(t('feed.dailyLimitReached'), { description: t('feed.dailyLimitDesc') })
      } else {
        toast.error(t('feed.errorSubmitting') || 'Erro ao enviar post')
      }
    } finally {
      setSubmitting(false)
    }
  }

  if (submitted) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
        <div className="bg-white rounded-2xl w-full max-w-sm p-8 shadow-xl text-center">
          <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="w-8 h-8 text-emerald-500" />
          </div>
          <h2 className="text-lg font-bold text-stone-800 mb-2">{t('feed.submittedTitle')}</h2>
          <div className="flex items-center justify-center gap-1.5 text-xs text-amber-600 bg-amber-50 rounded-xl px-4 py-2.5 mb-4">
            <Clock className="w-3.5 h-3.5 flex-shrink-0" />
            <p>{t('feed.submittedDesc')}</p>
          </div>
          <button onClick={onClose} className="w-full py-3 rounded-xl bg-brand text-white text-sm font-semibold">
            {t('feed.submittedOk') || 'Entendido'}
          </button>
        </div>
      </div>
    )
  }

  if (showNameModal) {
    return (
      <SetDisplayNameModal
        onSaved={name => { setResolvedName(name); setShowNameModal(false) }}
        onClose={onClose}
      />
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-stone-100 flex-shrink-0">
          <h2 className="text-base font-bold text-stone-800">{t('feed.createPost')}</h2>
          <button onClick={onClose} className="p-1 rounded-lg text-stone-400 hover:bg-stone-100">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body — scrollable */}
        <div className="p-5 overflow-y-auto flex-1">
          {/* Author row */}
          <div className="flex items-center gap-2.5 mb-4">
            <div className={`w-8 h-8 rounded-full flex-shrink-0 overflow-hidden ${!authorAvatarUrl ? 'bg-brand/10 flex items-center justify-center' : ''}`}>
              {authorAvatarUrl ? (
                <img src={authorAvatarUrl} alt="" className="w-full h-full object-cover" />
              ) : (
                <span className="text-sm font-bold text-brand">{resolvedName?.[0]?.toUpperCase() ?? 'U'}</span>
              )}
            </div>
            <div>
              <span className="text-sm font-semibold text-stone-700">{resolvedName}</span>
              {feeling && (
                <p className="text-xs text-stone-400 leading-snug">{t('feed.feelingPrefix')} {t(`feed.feelings.${feeling}`)}</p>
              )}
            </div>
          </div>

          {/* Feeling picker */}
          <div className="mb-4">
            <p className="text-xs text-stone-400 mb-2 flex items-center gap-1.5">
              <SmilePlus className="w-3.5 h-3.5" />
              {t('feed.addFeeling')}
            </p>
            <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
              {FEELINGS.map(key => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setFeeling(feeling === key ? null : key)}
                  className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs border transition-all ${
                    feeling === key
                      ? 'border-brand bg-brand/10 text-brand font-semibold'
                      : 'border-stone-200 text-stone-500 hover:border-stone-300'
                  }`}
                >
                  {t(`feed.feelings.${key}`)}
                </button>
              ))}
            </div>
          </div>

          {/* Textarea */}
          <textarea
            value={content}
            onChange={e => setContent(e.target.value)}
            maxLength={1000}
            rows={4}
            placeholder={t('feed.publishPlaceholder')}
            className="w-full border border-stone-200 rounded-xl px-4 py-3 text-sm text-stone-800 resize-none outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand"
          />
          <p className="text-right text-xs text-stone-300 mt-1 mb-3">{content.length}/1000</p>

          {/* Image previews */}
          {(imagePreview || imagePreview2) ? (
            <div className={`mb-3 ${imagePreview && imagePreview2 ? 'grid grid-cols-2 gap-2' : ''}`}>
              {imagePreview && (
                <div className="relative aspect-square">
                  <img src={imagePreview} alt="" className="w-full h-full object-cover rounded-xl" />
                  <button
                    onClick={() => { setImageFile(null); setImagePreview(null) }}
                    className="absolute top-1.5 right-1.5 p-1 bg-black/50 rounded-full text-white"
                  >
                    <X className="w-3 h-3" />
                  </button>
                  {!imagePreview2 && (
                    <button
                      onClick={() => fileRef2.current?.click()}
                      className="absolute bottom-1.5 left-0 right-0 mx-auto w-fit px-2.5 py-1 bg-black/50 rounded-full text-white text-[10px] font-medium whitespace-nowrap"
                    >
                      + {t('feed.addSecondPhoto')}
                    </button>
                  )}
                </div>
              )}
              {imagePreview2 && (
                <div className="relative aspect-square">
                  <img src={imagePreview2} alt="" className="w-full h-full object-cover rounded-xl" />
                  <button
                    onClick={() => { setImageFile2(null); setImagePreview2(null) }}
                    className="absolute top-1.5 right-1.5 p-1 bg-black/50 rounded-full text-white"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              )}
            </div>
          ) : (
            <button
              onClick={() => fileRef.current?.click()}
              className="flex items-center gap-2 text-xs text-stone-400 hover:text-brand"
            >
              <Image className="w-4 h-4" />
              {t('feed.imageOptional')}
            </button>
          )}

          <input ref={fileRef}  type="file" accept="image/*" className="hidden" onChange={e => handleFileChange(e, 1)} />
          <input ref={fileRef2} type="file" accept="image/*" className="hidden" onChange={e => handleFileChange(e, 2)} />
        </div>

        {/* Footer */}
        <div className="px-5 pb-5 flex gap-2 flex-shrink-0">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl border border-stone-200 text-sm font-medium text-stone-500 hover:bg-stone-50"
          >
            {t('common.cancel') || 'Cancelar'}
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting || !content.trim()}
            className="flex-1 py-2.5 rounded-xl bg-brand text-white text-sm font-semibold disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
            {t('feed.publish')}
          </button>
        </div>
      </div>
    </div>
  )
}
