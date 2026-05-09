import React, { useEffect, useState, useRef } from 'react'
import { useAdminFetch } from './hooks/useAdminFetch'
import { formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Loader2, CheckCircle, XCircle, Send, Image, X, Trash2, Clock, LayoutList, PenLine } from 'lucide-react'
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
function PostTab({ apiFetch }) {
  const [content, setContent]     = useState('')
  const [imageFile, setImageFile] = useState(null)
  const [imagePreview, setImagePreview] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const fileRef = useRef()

  function handleFileChange(e) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 5 * 1024 * 1024) { toast.error('Imagem máx 5MB'); return }
    setImageFile(file)
    setImagePreview(URL.createObjectURL(file))
  }

  async function handleSubmit() {
    if (!content.trim()) return
    setSubmitting(true)
    try {
      let imageUrl = null
      if (imageFile) {
        const ext  = imageFile.name.split('.').pop()
        const path = `admin/${Date.now()}.${ext}`
        const { error: uploadError } = await supabase.storage
          .from('feed-images')
          .upload(path, imageFile, { upsert: false })
        if (uploadError) throw uploadError
        const { data: { publicUrl } } = supabase.storage
          .from('feed-images')
          .getPublicUrl(path)
        imageUrl = publicUrl
      }

      await apiFetch('/admin-feed?mode=post', {
        method: 'POST',
        body: JSON.stringify({ content: content.trim(), image_url: imageUrl }),
      })
      toast.success('Post publicado!')
      setContent('')
      setImageFile(null)
      setImagePreview(null)
    } catch (e) {
      toast.error(e.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="bg-white rounded-2xl border border-stone-100 p-5 shadow-sm max-w-lg">
      <div className="flex items-center gap-2.5 mb-4">
        <div className="w-8 h-8 rounded-full bg-brand flex items-center justify-center">
          <span className="text-xs font-bold text-white">N</span>
        </div>
        <span className="text-sm font-semibold text-stone-700">NatGlow</span>
        <span className="px-1.5 py-0.5 bg-brand/10 text-brand text-[10px] font-bold rounded-full">Admin</span>
      </div>

      <textarea
        value={content}
        onChange={e => setContent(e.target.value)}
        maxLength={1000}
        rows={5}
        placeholder="Escreva o conteúdo do post..."
        className="w-full border border-stone-200 rounded-xl px-4 py-3 text-sm text-stone-800 resize-none outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand mb-1"
      />
      <p className="text-right text-xs text-stone-300 mb-3">{content.length}/1000</p>

      {imagePreview ? (
        <div className="relative mb-3">
          <img src={imagePreview} alt="" className="w-full rounded-xl max-h-48 object-cover" />
          <button
            onClick={() => { setImageFile(null); setImagePreview(null) }}
            className="absolute top-2 right-2 p-1 bg-black/50 rounded-full text-white"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ) : (
        <button
          onClick={() => fileRef.current?.click()}
          className="flex items-center gap-2 text-xs text-stone-400 hover:text-brand mb-4"
        >
          <Image className="w-4 h-4" />
          Adicionar foto (opcional)
        </button>
      )}
      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />

      <button
        onClick={handleSubmit}
        disabled={submitting || !content.trim()}
        className="flex items-center gap-2 px-6 py-2.5 bg-brand text-white text-sm font-semibold rounded-xl disabled:opacity-50"
      >
        {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
        Publicar
      </button>
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
                  <button
                    onClick={() => handleDelete(post.id)}
                    disabled={deleting === post.id}
                    className="flex-shrink-0 p-1.5 text-stone-300 hover:text-red-400 rounded-lg"
                  >
                    {deleting === post.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                  </button>
                </div>
              )
            })}
          </div>

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
