import React, { useEffect, useState, useRef } from 'react'
import { useAdminFetch } from './hooks/useAdminFetch'
import { formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Loader2, CheckCircle, XCircle, Send, Image, X, Trash2, Clock, LayoutList, PenLine, User, Sparkles, SmilePlus, ImagePlus, MessageSquare, Heart, Calendar } from 'lucide-react'
import { toast } from 'sonner'
import { supabase } from '@/api/supabaseClient'

const TABS = [
  { key: 'queue', label: 'Fila de Moderação', icon: Clock },
  { key: 'post',  label: 'Publicar',          icon: PenLine },
  { key: 'list',  label: 'Todos os Posts',    icon: LayoutList },
]

function timeAgo(d) {
  return formatDistanceToNow(new Date(d), { addSuffix: true, locale: ptBR })
}

// Format a Date as the value that <input type="datetime-local"> expects:
// 'YYYY-MM-DDTHH:MM' in the BROWSER's local timezone.
function toDatetimeLocal(d) {
  const p = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`
}

// Reusable datetime picker for backdating fake posts/comments. Shows the
// current value as 'time ago' so admin can see what the visitor will see.
// onChange receives an ISO string (or null when admin clears and uses 'agora').
const BACKDATE_PRESETS = [
  { label: 'Agora',         deltaMin: 0 },
  { label: '−1h',           deltaMin: 60 },
  { label: '−3h',           deltaMin: 60 * 3 },
  { label: '−6h',           deltaMin: 60 * 6 },
  { label: 'Ontem',         deltaMin: 60 * 24 },
  { label: '−2 dias',       deltaMin: 60 * 24 * 2 },
  { label: '−5 dias',       deltaMin: 60 * 24 * 5 },
  { label: '−1 semana',     deltaMin: 60 * 24 * 7 },
  { label: '−2 semanas',    deltaMin: 60 * 24 * 14 },
]

function DateTimePicker({ value, onChange, accent = 'violet' }) {
  // value is ISO string or null. We display it as 'datetime-local' format.
  const localVal = value ? toDatetimeLocal(new Date(value)) : ''
  const accentBorder = accent === 'violet' ? 'focus:border-violet-400 focus:ring-violet-200' : 'focus:border-brand focus:ring-brand/30'
  const accentChip   = accent === 'violet' ? 'hover:border-violet-300 hover:text-violet-700' : 'hover:border-brand hover:text-brand'

  function applyPreset(deltaMin) {
    if (deltaMin === 0) { onChange(null); return }  // 'Agora' → use server default
    const d = new Date(Date.now() - deltaMin * 60 * 1000)
    onChange(d.toISOString())
  }

  function handleInput(e) {
    const v = e.target.value
    if (!v) { onChange(null); return }
    // datetime-local string ('YYYY-MM-DDTHH:MM') is interpreted as LOCAL time
    const d = new Date(v)
    if (!isNaN(d.getTime())) onChange(d.toISOString())
  }

  const preview = value
    ? formatDistanceToNow(new Date(value), { addSuffix: true, locale: ptBR })
    : 'Agora (data atual)'

  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-2 text-[11px] text-stone-500">
        <Calendar className="w-3 h-3" />
        <span>Data de publicação · <span className="text-stone-700 font-semibold">{preview}</span></span>
      </div>
      <div className="flex gap-2 items-center">
        <input
          type="datetime-local"
          value={localVal}
          onChange={handleInput}
          className={`flex-1 bg-white border border-stone-200 rounded-lg px-3 py-1.5 text-xs outline-none focus:ring-2 ${accentBorder}`}
        />
      </div>
      <div className="flex flex-wrap gap-1">
        {BACKDATE_PRESETS.map(p => (
          <button
            key={p.label}
            type="button"
            onClick={() => applyPreset(p.deltaMin)}
            className={`px-2 py-0.5 text-[10px] font-semibold border border-stone-200 text-stone-500 rounded-full transition-colors ${accentChip}`}
          >
            {p.label}
          </button>
        ))}
      </div>
    </div>
  )
}

// ── Moderation Queue ─────────────────────────────────────────────────────────
function QueueTab({ apiFetch }) {
  const [posts, setPosts]           = useState([])
  const [loading, setLoading]       = useState(true)
  const [rejecting, setRejecting]   = useState(null) // post id
  const [reason, setReason]         = useState('')
  const [acting, setActing]         = useState(null)

  async function load() {
    setLoading(true)
    try {
      const data = await apiFetch('/admin-feed?mode=queue')
      setPosts(data?.posts ?? [])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  async function approve(id) {
    setActing(id)
    try {
      await apiFetch('/admin-feed?mode=approve', {
        method: 'POST',
        body: JSON.stringify({ id }),
      })
      toast.success('Post aprovado')
      setPosts(prev => prev.filter(p => p.id !== id))
    } catch (e) {
      toast.error(e.message)
    } finally {
      setActing(null)
    }
  }

  async function reject(id) {
    setActing(id)
    try {
      await apiFetch('/admin-feed?mode=reject', {
        method: 'POST',
        body: JSON.stringify({ id, reason: reason.trim() || null }),
      })
      toast.success('Post rejeitado')
      setPosts(prev => prev.filter(p => p.id !== id))
      setRejecting(null)
      setReason('')
    } catch (e) {
      toast.error(e.message)
    } finally {
      setActing(null)
    }
  }

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="w-5 h-5 text-brand animate-spin" /></div>

  if (!posts.length) return (
    <div className="text-center py-12 text-stone-400 text-sm">Nenhum post aguardando aprovação.</div>
  )

  return (
    <div className="max-w-lg mx-auto space-y-6">
      {posts.map(post => {
        const authorName = post.display_name ?? 'Usuária'
        const initials   = authorName[0].toUpperCase()
        const hasDual    = post.image_url && post.image_url_2

        return (
          <div key={post.id} className="bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden">
            {/* Label do preview */}
            <div className="px-4 pt-3 pb-2 border-b border-stone-100 flex items-center gap-2">
              <span className="text-[10px] font-semibold text-stone-400 uppercase tracking-wide">Prévia do post</span>
              <span className="text-[10px] text-stone-300">· {timeAgo(post.created_at)}</span>
            </div>

            {/* Post preview — idêntico ao feed real */}
            <div>
              {/* Header */}
              <div className="flex items-start gap-3 px-4 pt-4 pb-2">
                <div className={`w-10 h-10 rounded-full flex-shrink-0 overflow-hidden ${post.author_avatar_url ? '' : 'bg-brand/10'}`}>
                  {post.author_avatar_url
                    ? <img src={post.author_avatar_url} alt="" className="w-full h-full object-cover" />
                    : <span className="w-full h-full flex items-center justify-center text-sm font-bold text-brand">{initials}</span>
                  }
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-stone-800">{authorName}</p>
                  <p className="text-[11px] text-stone-400">{timeAgo(post.created_at)}</p>
                </div>
              </div>

              {/* Texto */}
              <p className="text-sm text-stone-700 leading-relaxed px-4 pb-3 whitespace-pre-wrap">{post.content}</p>

              {/* Imagens — full-width */}
              {post.image_url && (
                <div className={hasDual ? 'grid grid-cols-2 gap-px mb-0' : 'mb-0'}>
                  <img
                    src={post.image_url}
                    alt=""
                    className={`w-full object-cover ${hasDual ? 'aspect-square' : 'max-h-[420px]'}`}
                  />
                  {post.image_url_2 && (
                    <img src={post.image_url_2} alt="" className="w-full aspect-square object-cover" />
                  )}
                </div>
              )}
            </div>

            {/* Ações */}
            <div className="px-4 py-4 border-t border-stone-100 bg-stone-50 space-y-3">
              {rejecting === post.id && (
                <input
                  type="text"
                  value={reason}
                  onChange={e => setReason(e.target.value)}
                  placeholder="Motivo da rejeição (opcional)"
                  className="w-full border border-stone-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-red-200 bg-white"
                />
              )}
              <div className="flex gap-2">
                <button
                  onClick={() => approve(post.id)}
                  disabled={acting === post.id}
                  className="flex items-center gap-1.5 px-5 py-2 bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-semibold rounded-xl disabled:opacity-50"
                >
                  {acting === post.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                  Aprovar
                </button>
                {rejecting === post.id ? (
                  <>
                    <button
                      onClick={() => reject(post.id)}
                      disabled={acting === post.id}
                      className="flex items-center gap-1.5 px-5 py-2 bg-red-500 hover:bg-red-600 text-white text-sm font-semibold rounded-xl disabled:opacity-50"
                    >
                      {acting === post.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
                      Confirmar
                    </button>
                    <button
                      onClick={() => { setRejecting(null); setReason('') }}
                      className="px-3 py-2 border border-stone-200 rounded-xl text-sm text-stone-500 bg-white"
                    >
                      Cancelar
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => setRejecting(post.id)}
                    className="flex items-center gap-1.5 px-5 py-2 border border-stone-200 text-stone-600 text-sm font-semibold rounded-xl hover:bg-white bg-white"
                  >
                    <XCircle className="w-4 h-4" />
                    Rejeitar
                  </button>
                )}
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ── Create Admin Post ─────────────────────────────────────────────────────────
// Same feeling keys as user-side CreatePostModal — the DB column has a CHECK
// constraint, must match exactly.
const ADMIN_FEELINGS = [
  { key: 'happy_results',     label: '😊 Feliz com os resultados' },
  { key: 'sad_hair',          label: '😔 Triste com o cabelo' },
  { key: 'surprised_recipes', label: '😲 Surpresa com as receitas' },
  { key: 'loving_journey',    label: '🥰 Amando a jornada' },
  { key: 'excited_progress',  label: '🤩 Animada com o progresso' },
  { key: 'motivated',         label: '💪 Motivada' },
  { key: 'hopeful',           label: '🌱 Esperançosa' },
]

function PostTab({ apiFetch }) {
  // 'natglow' (official admin badge) | 'user' (fake testimonial — looks like a real user)
  const [mode, setMode] = useState('natglow')

  // Shared
  const [content, setContent] = useState('')
  const [submitting, setSubmitting] = useState(false)

  // Images (both modes — natglow uses only image 1, user mode uses both)
  const [imageFile,    setImageFile]    = useState(null)
  const [imageFile2,   setImageFile2]   = useState(null)
  const [imagePreview, setImagePreview] = useState(null)
  const [imagePreview2,setImagePreview2]= useState(null)

  // User-mode only
  const [authorName,   setAuthorName]   = useState('')
  const [avatarFile,   setAvatarFile]   = useState(null)
  const [avatarPreview,setAvatarPreview]= useState(null)
  const [feeling,      setFeeling]      = useState(null)
  const [createdAt,    setCreatedAt]    = useState(null)  // ISO or null (=now)

  const fileRef       = useRef()
  const fileRef2      = useRef()
  const avatarFileRef = useRef()

  function reset() {
    setContent(''); setImageFile(null); setImageFile2(null)
    setImagePreview(null); setImagePreview2(null)
    setAuthorName(''); setAvatarFile(null); setAvatarPreview(null); setFeeling(null)
    setCreatedAt(null)
  }

  function handleFile(e, target) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 5 * 1024 * 1024) { toast.error('Imagem máx 5MB'); return }
    if (target === 'image1')  { setImageFile(file);  setImagePreview(URL.createObjectURL(file)) }
    if (target === 'image2')  { setImageFile2(file); setImagePreview2(URL.createObjectURL(file)) }
    if (target === 'avatar')  { setAvatarFile(file); setAvatarPreview(URL.createObjectURL(file)) }
  }

  async function uploadOne(file, subfolder) {
    const ext  = file.name.split('.').pop()
    const path = `admin/${subfolder}/${Date.now()}-${Math.random().toString(36).slice(2, 7)}.${ext}`
    const { error } = await supabase.storage
      .from('feed-images')
      .upload(path, file, { upsert: false })
    if (error) throw error
    const { data: { publicUrl } } = supabase.storage.from('feed-images').getPublicUrl(path)
    return publicUrl
  }

  async function handleSubmit() {
    if (!content.trim()) return
    if (mode === 'user' && !authorName.trim()) {
      toast.error('Preencha o nome da usuária'); return
    }
    setSubmitting(true)
    try {
      const [imageUrl, imageUrl2, avatarUrl] = await Promise.all([
        imageFile  ? uploadOne(imageFile,  'posts')   : Promise.resolve(null),
        imageFile2 ? uploadOne(imageFile2, 'posts')   : Promise.resolve(null),
        avatarFile ? uploadOne(avatarFile, 'avatars') : Promise.resolve(null),
      ])

      const payload = mode === 'user'
        ? {
            content:           content.trim(),
            image_url:         imageUrl,
            image_url_2:       imageUrl2,
            author_name:       authorName.trim(),
            author_avatar_url: avatarUrl,
            feeling:           feeling,
            is_admin:          false,
            created_at:        createdAt,  // null = use server now()
          }
        : {
            content:   content.trim(),
            image_url: imageUrl,
            is_admin:  true,
          }

      await apiFetch('/admin-feed?mode=post', {
        method: 'POST',
        body:   JSON.stringify(payload),
      })
      toast.success(mode === 'user' ? 'Depoimento publicado!' : 'Post oficial publicado!')
      reset()
    } catch (e) {
      toast.error(e.message)
    } finally {
      setSubmitting(false)
    }
  }

  const submitDisabled = submitting || !content.trim() || (mode === 'user' && !authorName.trim())

  return (
    <div className="max-w-lg space-y-4">
      {/* Mode switcher */}
      <div className="bg-white rounded-2xl border border-stone-100 p-1 flex gap-1">
        <button
          onClick={() => setMode('natglow')}
          className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all ${
            mode === 'natglow'
              ? 'bg-brand text-white shadow-sm'
              : 'text-stone-500 hover:text-stone-800'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5" />
          NatGlow Oficial
        </button>
        <button
          onClick={() => setMode('user')}
          className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all ${
            mode === 'user'
              ? 'bg-violet-600 text-white shadow-sm'
              : 'text-stone-500 hover:text-stone-800'
          }`}
        >
          <User className="w-3.5 h-3.5" />
          Modo Usuária (Fake)
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-stone-100 p-5 shadow-sm">
        {/* Author preview */}
        {mode === 'natglow' ? (
          <div className="flex items-center gap-2.5 mb-4">
            <div className="w-9 h-9 rounded-full bg-brand flex items-center justify-center">
              <span className="text-xs font-bold text-white">N</span>
            </div>
            <span className="text-sm font-semibold text-stone-700">NatGlow</span>
            <span className="px-1.5 py-0.5 bg-brand/10 text-brand text-[10px] font-bold rounded-full">Admin</span>
          </div>
        ) : (
          <div className="space-y-3 mb-4 pb-4 border-b border-stone-100">
            <p className="text-[10px] font-bold uppercase tracking-wider text-violet-600">Identidade da usuária fake</p>
            <div className="flex items-start gap-3">
              {/* Avatar upload */}
              <button
                type="button"
                onClick={() => avatarFileRef.current?.click()}
                className="w-14 h-14 rounded-full bg-stone-100 hover:bg-stone-200 flex-shrink-0 flex items-center justify-center overflow-hidden border-2 border-dashed border-stone-300 hover:border-violet-400 transition-colors"
              >
                {avatarPreview
                  ? <img src={avatarPreview} alt="" className="w-full h-full object-cover" />
                  : <ImagePlus className="w-5 h-5 text-stone-400" />
                }
              </button>
              <input ref={avatarFileRef} type="file" accept="image/*" className="hidden" onChange={e => handleFile(e, 'avatar')} />

              <div className="flex-1 space-y-1.5">
                <input
                  type="text"
                  value={authorName}
                  onChange={e => setAuthorName(e.target.value)}
                  maxLength={40}
                  placeholder="Nome (ex: Camila R.)"
                  className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-violet-200 focus:border-violet-400"
                />
                {avatarPreview && (
                  <button
                    type="button"
                    onClick={() => { setAvatarFile(null); setAvatarPreview(null) }}
                    className="text-[11px] text-stone-400 hover:text-red-500"
                  >
                    Remover avatar
                  </button>
                )}
              </div>
            </div>

            {/* Feeling picker */}
            <div>
              <p className="text-xs text-stone-400 mb-1.5 flex items-center gap-1.5">
                <SmilePlus className="w-3 h-3" />
                Como ela está se sentindo (opcional)
              </p>
              <div className="flex gap-1.5 flex-wrap">
                {ADMIN_FEELINGS.map(({ key, label }) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setFeeling(feeling === key ? null : key)}
                    className={`px-3 py-1.5 rounded-full text-xs border transition-all whitespace-nowrap ${
                      feeling === key
                        ? 'border-violet-500 bg-violet-50 text-violet-700 font-semibold'
                        : 'border-stone-200 text-stone-500 hover:border-stone-300'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Backdating */}
            <DateTimePicker value={createdAt} onChange={setCreatedAt} accent="violet" />
          </div>
        )}

        {/* Content textarea */}
        <textarea
          value={content}
          onChange={e => setContent(e.target.value)}
          maxLength={1000}
          rows={5}
          placeholder={mode === 'user' ? 'Escreva o depoimento como se fosse a usuária...' : 'Escreva o conteúdo do post oficial...'}
          className={`w-full border border-stone-200 rounded-xl px-4 py-3 text-sm text-stone-800 resize-none outline-none focus:ring-2 ${
            mode === 'user' ? 'focus:ring-violet-200 focus:border-violet-400' : 'focus:ring-brand/30 focus:border-brand'
          } mb-1`}
        />
        <p className="text-right text-xs text-stone-300 mb-3">{content.length}/1000</p>

        {/* Image previews */}
        {(imagePreview || imagePreview2) ? (
          <div className={`mb-4 ${imagePreview && imagePreview2 ? 'grid grid-cols-2 gap-2' : ''}`}>
            {imagePreview && (
              <div className="relative aspect-square">
                <img src={imagePreview} alt="" className="w-full h-full object-cover rounded-xl" />
                <button
                  type="button"
                  onClick={() => { setImageFile(null); setImagePreview(null) }}
                  className="absolute top-1.5 right-1.5 p-1 bg-black/50 rounded-full text-white"
                >
                  <X className="w-3 h-3" />
                </button>
                {mode === 'user' && !imagePreview2 && (
                  <button
                    type="button"
                    onClick={() => fileRef2.current?.click()}
                    className="absolute bottom-1.5 left-0 right-0 mx-auto w-fit px-2.5 py-1 bg-black/50 rounded-full text-white text-[10px] font-medium whitespace-nowrap"
                  >
                    + Segunda foto
                  </button>
                )}
              </div>
            )}
            {imagePreview2 && (
              <div className="relative aspect-square">
                <img src={imagePreview2} alt="" className="w-full h-full object-cover rounded-xl" />
                <button
                  type="button"
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
            type="button"
            onClick={() => fileRef.current?.click()}
            className="flex items-center gap-2 text-xs text-stone-400 hover:text-brand mb-4"
          >
            <Image className="w-4 h-4" />
            {mode === 'user' ? 'Adicionar foto (até 2)' : 'Adicionar foto (opcional)'}
          </button>
        )}
        <input ref={fileRef}  type="file" accept="image/*" className="hidden" onChange={e => handleFile(e, 'image1')} />
        <input ref={fileRef2} type="file" accept="image/*" className="hidden" onChange={e => handleFile(e, 'image2')} />

        <button
          onClick={handleSubmit}
          disabled={submitDisabled}
          className={`w-full flex items-center justify-center gap-2 px-6 py-3 text-white text-sm font-semibold rounded-xl disabled:opacity-50 transition-colors ${
            mode === 'user' ? 'bg-violet-600 hover:bg-violet-700' : 'bg-brand hover:bg-brand/90'
          }`}
        >
          {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          {mode === 'user' ? 'Publicar depoimento' : 'Publicar como NatGlow'}
        </button>
      </div>
    </div>
  )
}

// ── Engagement modal — fake comments + reaction counts for a post ───────────
const REACTION_EMOJI = { heart: '❤️', love: '😍', clap: '👏', wow: '😮' }

function EngagementModal({ post, apiFetch, onClose, onChanged }) {
  const [comments, setComments]     = useState([])
  const [loading, setLoading]       = useState(true)
  const [reactions, setReactions]   = useState({
    heart: post.reactions?.heart ?? 0,
    love:  post.reactions?.love  ?? 0,
    clap:  post.reactions?.clap  ?? 0,
    wow:   post.reactions?.wow   ?? 0,
  })
  const [savingReactions, setSavingReactions] = useState(false)

  // New-comment form
  const [cName,   setCName]   = useState('')
  const [cText,   setCText]   = useState('')
  const [cAvatarFile,    setCAvatarFile]    = useState(null)
  const [cAvatarPreview, setCAvatarPreview] = useState(null)
  const [cCreatedAt, setCCreatedAt] = useState(null)  // ISO or null (=now)
  const [cSubmitting, setCSubmitting] = useState(false)
  const [cDeleting, setCDeleting]     = useState(null)
  const cAvatarRef = useRef()

  async function loadComments() {
    setLoading(true)
    try {
      const data = await apiFetch(`/admin-feed?mode=get_comments&post_id=${post.id}`)
      setComments(data?.comments ?? [])
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => { loadComments() }, [post.id]) // eslint-disable-line react-hooks/exhaustive-deps

  function handleAvatar(e) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 5 * 1024 * 1024) { toast.error('Imagem máx 5MB'); return }
    setCAvatarFile(file)
    setCAvatarPreview(URL.createObjectURL(file))
  }

  async function uploadAvatar(file) {
    const ext  = file.name.split('.').pop()
    const path = `admin/avatars/${Date.now()}-${Math.random().toString(36).slice(2, 7)}.${ext}`
    const { error } = await supabase.storage.from('feed-images').upload(path, file, { upsert: false })
    if (error) throw error
    const { data: { publicUrl } } = supabase.storage.from('feed-images').getPublicUrl(path)
    return publicUrl
  }

  async function addComment() {
    if (!cName.trim() || !cText.trim()) return
    setCSubmitting(true)
    try {
      const avatarUrl = cAvatarFile ? await uploadAvatar(cAvatarFile) : null
      await apiFetch('/admin-feed?mode=add_comment', {
        method: 'POST',
        body:   JSON.stringify({
          post_id:           post.id,
          author_name:       cName.trim(),
          author_avatar_url: avatarUrl,
          content:           cText.trim(),
          created_at:        cCreatedAt,  // null = use server now()
        }),
      })
      toast.success('Comentário fake adicionado')
      setCName(''); setCText(''); setCAvatarFile(null); setCAvatarPreview(null); setCCreatedAt(null)
      loadComments()
      onChanged?.()
    } catch (e) {
      toast.error(e.message)
    } finally {
      setCSubmitting(false)
    }
  }

  async function deleteComment(id) {
    setCDeleting(id)
    try {
      await apiFetch('/admin-feed?mode=delete_comment', {
        method: 'POST',
        body:   JSON.stringify({ id }),
      })
      setComments(prev => prev.filter(c => c.id !== id))
      onChanged?.()
    } catch (e) {
      toast.error(e.message)
    } finally {
      setCDeleting(null)
    }
  }

  async function saveReactions() {
    setSavingReactions(true)
    try {
      await apiFetch('/admin-feed?mode=set_reactions', {
        method: 'POST',
        body:   JSON.stringify({ post_id: post.id, reactions }),
      })
      toast.success('Reações atualizadas')
      onChanged?.()
    } catch (e) {
      toast.error(e.message)
    } finally {
      setSavingReactions(false)
    }
  }

  const totalReactions = reactions.heart + reactions.love + reactions.clap + reactions.wow
  const addDisabled    = cSubmitting || !cName.trim() || !cText.trim()

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-2xl w-full max-w-2xl shadow-xl max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-stone-100 flex-shrink-0">
          <div>
            <h2 className="text-base font-bold text-stone-800">Engajamento do post</h2>
            <p className="text-xs text-stone-400 mt-0.5 truncate max-w-md">"{post.content.slice(0, 80)}{post.content.length > 80 ? '...' : ''}"</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-stone-400 hover:bg-stone-100">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 overflow-y-auto flex-1 space-y-6">
          {/* Reactions configurator */}
          <section>
            <div className="flex items-center gap-2 mb-3">
              <Heart className="w-4 h-4 text-rose-500" />
              <h3 className="text-sm font-bold text-stone-800">Reações ({totalReactions})</h3>
            </div>
            <p className="text-xs text-stone-500 mb-3">Defina contagens absolutas. Salvo direto na contagem do post (não cria registros reais em feed_reactions).</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mb-3">
              {(['heart','love','clap','wow']).map(key => (
                <div key={key} className="bg-stone-50 rounded-xl p-3 flex items-center gap-2">
                  <span className="text-xl flex-shrink-0">{REACTION_EMOJI[key]}</span>
                  <input
                    type="number"
                    min={0}
                    value={reactions[key]}
                    onChange={e => setReactions(r => ({ ...r, [key]: Math.max(0, parseInt(e.target.value) || 0) }))}
                    className="flex-1 min-w-0 bg-white border border-stone-200 rounded-lg px-2 py-1.5 text-sm tabular-nums outline-none focus:ring-2 focus:ring-violet-200 focus:border-violet-400"
                  />
                </div>
              ))}
            </div>
            <button
              onClick={saveReactions}
              disabled={savingReactions}
              className="flex items-center gap-1.5 px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold rounded-xl disabled:opacity-50"
            >
              {savingReactions ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle className="w-3.5 h-3.5" />}
              Salvar reações
            </button>
          </section>

          {/* Comments section */}
          <section>
            <div className="flex items-center gap-2 mb-3">
              <MessageSquare className="w-4 h-4 text-violet-500" />
              <h3 className="text-sm font-bold text-stone-800">Comentários ({comments.length})</h3>
            </div>

            {/* Existing comments */}
            {loading ? (
              <div className="flex justify-center py-6"><Loader2 className="w-5 h-5 text-stone-300 animate-spin" /></div>
            ) : comments.length === 0 ? (
              <p className="text-xs text-stone-400 italic mb-4">Ainda sem comentários. Adicione abaixo.</p>
            ) : (
              <div className="space-y-2 mb-4">
                {comments.map(c => {
                  const name = c.author_name ?? 'Usuária real'
                  const isFake = !c.user_id
                  return (
                    <div key={c.id} className="bg-stone-50 rounded-xl p-3 flex gap-3 items-start">
                      <div className={`w-8 h-8 rounded-full flex-shrink-0 overflow-hidden ${!c.author_avatar_url ? 'bg-violet-100 flex items-center justify-center' : ''}`}>
                        {c.author_avatar_url
                          ? <img src={c.author_avatar_url} alt="" className="w-full h-full object-cover" />
                          : <span className="text-xs font-bold text-violet-600">{name[0]?.toUpperCase()}</span>
                        }
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap mb-0.5">
                          <span className="text-xs font-semibold text-stone-700">{name}</span>
                          {isFake && <span className="px-1.5 py-0.5 bg-violet-100 text-violet-700 text-[9px] font-bold rounded-full">FAKE</span>}
                          {!isFake && <span className="px-1.5 py-0.5 bg-emerald-100 text-emerald-700 text-[9px] font-bold rounded-full">REAL</span>}
                        </div>
                        <p className="text-sm text-stone-600 leading-relaxed break-words">{c.content}</p>
                      </div>
                      <button
                        onClick={() => deleteComment(c.id)}
                        disabled={cDeleting === c.id}
                        className="p-1.5 text-stone-300 hover:text-red-400 rounded-lg flex-shrink-0"
                      >
                        {cDeleting === c.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  )
                })}
              </div>
            )}

            {/* Add fake comment form */}
            <div className="bg-violet-50/40 border border-violet-100 rounded-xl p-3 space-y-2.5">
              <p className="text-[10px] font-bold uppercase tracking-wider text-violet-600">Adicionar comentário fake</p>
              <div className="flex items-start gap-2.5">
                <button
                  type="button"
                  onClick={() => cAvatarRef.current?.click()}
                  className="w-10 h-10 rounded-full bg-white hover:bg-stone-50 flex-shrink-0 flex items-center justify-center overflow-hidden border-2 border-dashed border-stone-300 hover:border-violet-400"
                >
                  {cAvatarPreview
                    ? <img src={cAvatarPreview} alt="" className="w-full h-full object-cover" />
                    : <ImagePlus className="w-4 h-4 text-stone-400" />
                  }
                </button>
                <input ref={cAvatarRef} type="file" accept="image/*" className="hidden" onChange={handleAvatar} />

                <div className="flex-1 space-y-1.5">
                  <input
                    type="text"
                    value={cName}
                    onChange={e => setCName(e.target.value)}
                    maxLength={40}
                    placeholder="Nome (ex: María F.)"
                    className="w-full bg-white border border-stone-200 rounded-lg px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-violet-200 focus:border-violet-400"
                  />
                  <textarea
                    value={cText}
                    onChange={e => setCText(e.target.value)}
                    maxLength={500}
                    rows={2}
                    placeholder="Conteúdo do comentário..."
                    className="w-full bg-white border border-stone-200 rounded-lg px-3 py-1.5 text-sm resize-none outline-none focus:ring-2 focus:ring-violet-200 focus:border-violet-400"
                  />
                  <DateTimePicker value={cCreatedAt} onChange={setCCreatedAt} accent="violet" />

                  <div className="flex items-center gap-2 pt-1">
                    {cAvatarPreview && (
                      <button
                        type="button"
                        onClick={() => { setCAvatarFile(null); setCAvatarPreview(null) }}
                        className="text-[11px] text-stone-400 hover:text-red-500"
                      >
                        Remover avatar
                      </button>
                    )}
                    <button
                      onClick={addComment}
                      disabled={addDisabled}
                      className="ml-auto flex items-center gap-1.5 px-4 py-1.5 bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold rounded-lg disabled:opacity-50"
                    >
                      {cSubmitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                      Adicionar
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}

// ── All Posts ─────────────────────────────────────────────────────────────────
const STATUS_LABELS = {
  approved: { label: 'Aprovado', cls: 'bg-emerald-100 text-emerald-700' },
  pending:  { label: 'Pendente', cls: 'bg-amber-100 text-amber-600' },
  rejected: { label: 'Rejeitado', cls: 'bg-red-100 text-red-600' },
}

function ListTab({ apiFetch }) {
  const [posts, setPosts]   = useState([])
  const [loading, setLoading] = useState(true)
  const [total, setTotal]   = useState(0)
  const [page, setPage]     = useState(1)
  const [deleting, setDeleting] = useState(null)
  const [engagementPost, setEngagementPost] = useState(null)

  async function load(p = 1) {
    setLoading(true)
    try {
      const data = await apiFetch(`/admin-feed?mode=list&page=${p}`)
      setPosts(data?.posts ?? [])
      setTotal(data?.total ?? 0)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load(page) }, [page])

  async function handleDelete(id) {
    if (!confirm('Excluir este post permanentemente?')) return
    setDeleting(id)
    try {
      await apiFetch('/admin-feed?mode=delete', { method: 'POST', body: JSON.stringify({ id }) })
      toast.success('Post excluído')
      load(page)
    } catch (e) {
      toast.error(e.message)
    } finally {
      setDeleting(null)
    }
  }

  const pageSize = 20
  const totalPages = Math.ceil(total / pageSize)

  return (
    <div>
      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-5 h-5 text-brand animate-spin" /></div>
      ) : (
        <>
          <div className="space-y-3">
            {posts.map(post => {
              const { label, cls } = STATUS_LABELS[post.status] ?? STATUS_LABELS.pending
              return (
                <div key={post.id} className="bg-white rounded-xl border border-stone-100 p-4 flex gap-3 items-start">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="text-xs font-semibold text-stone-600">
                        {post.is_admin ? 'NatGlow (Admin)' : 'Usuária'}
                      </span>
                      <span className={`px-1.5 py-0.5 text-[10px] font-semibold rounded-full ${cls}`}>{label}</span>
                      <span className="text-[10px] text-stone-400 ml-auto">{timeAgo(post.created_at)}</span>
                    </div>
                    <p className="text-sm text-stone-600 line-clamp-2">{post.content}</p>
                    {post.rejection_reason && (
                      <p className="text-xs text-red-500 mt-1">Motivo: {post.rejection_reason}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-0.5 flex-shrink-0">
                    {post.status === 'approved' && (
                      <button
                        onClick={() => setEngagementPost(post)}
                        className="p-1.5 text-stone-300 hover:text-violet-500 rounded-lg"
                        title="Adicionar comentários fake / ajustar reações"
                      >
                        <MessageSquare className="w-4 h-4" />
                      </button>
                    )}
                    <button
                      onClick={() => handleDelete(post.id)}
                      disabled={deleting === post.id}
                      className="p-1.5 text-stone-300 hover:text-red-400 rounded-lg"
                    >
                      {deleting === post.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              )
            })}
          </div>

          {engagementPost && (
            <EngagementModal
              post={engagementPost}
              apiFetch={apiFetch}
              onClose={() => setEngagementPost(null)}
              onChanged={() => load(page)}
            />
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-3 mt-6">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1.5 rounded-lg border border-stone-200 text-sm disabled:opacity-40"
              >
                ← Anterior
              </button>
              <span className="text-sm text-stone-500">{page} / {totalPages}</span>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-3 py-1.5 rounded-lg border border-stone-200 text-sm disabled:opacity-40"
              >
                Próxima →
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function AdminFeed() {
  const { apiFetch }  = useAdminFetch()
  const [tab, setTab] = useState('queue')

  return (
    <div className="flex flex-col gap-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-extrabold text-gray-900">Feed</h1>
          <p className="text-sm text-gray-400 mt-0.5">Moderação e publicação de conteúdo da comunidade</p>
        </div>
      </div>

      {/* Sub-tabs */}
      <div className="flex bg-white border border-gray-200 rounded-xl p-1 gap-0.5 w-fit">
        {TABS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
              tab === key
                ? 'bg-violet-600 text-white shadow-sm'
                : 'text-gray-500 hover:text-gray-800 hover:bg-gray-50'
            }`}
          >
            <Icon className="w-3.5 h-3.5" />
            {label}
          </button>
        ))}
      </div>

      {/* Content */}
      {tab === 'queue' && <QueueTab apiFetch={apiFetch} />}
      {tab === 'post'  && <PostTab  apiFetch={apiFetch} />}
      {tab === 'list'  && <ListTab  apiFetch={apiFetch} />}
    </div>
  )
}
