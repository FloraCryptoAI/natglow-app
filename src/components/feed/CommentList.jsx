import React, { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { supabase } from '@/api/supabaseClient'
import { formatDistanceToNow } from 'date-fns'
import { enUS, es } from 'date-fns/locale'
import { Send, Trash2 } from 'lucide-react'

function timeAgo(dateStr, lang) {
  return formatDistanceToNow(new Date(dateStr), {
    addSuffix: true,
    locale: lang?.startsWith('es') ? es : enUS,
  })
}

function CommentItem({ comment, currentUserId, onReply, onDelete, lang, replies }) {
  const { t } = useTranslation()
  const [showReplyForm, setShowReplyForm] = useState(false)
  const [replyText, setReplyText]         = useState('')
  const [submitting, setSubmitting]       = useState(false)

  async function submitReply() {
    if (!replyText.trim()) return
    setSubmitting(true)
    try {
      const { error } = await supabase.from('feed_comments').insert({
        post_id:   comment.post_id,
        user_id:   currentUserId,
        parent_id: comment.id,
        content:   replyText.trim(),
      })
      if (error) throw error
      onReply()
      setReplyText('')
      setShowReplyForm(false)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div>
      <div className="flex gap-2.5">
        <div className="w-7 h-7 rounded-full bg-brand/10 flex items-center justify-center flex-shrink-0 mt-0.5">
          <span className="text-[10px] font-bold text-brand">
            {(comment.display_name ?? 'U')[0].toUpperCase()}
          </span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="bg-stone-50 rounded-2xl rounded-tl-none px-3 py-2">
            <p className="text-xs font-semibold text-stone-700 mb-0.5">
              {comment.display_name ?? 'Usuária'}
            </p>
            <p className="text-sm text-stone-700 leading-relaxed">{comment.content}</p>
          </div>
          <div className="flex items-center gap-3 mt-1 px-1">
            <span className="text-[10px] text-stone-400">{timeAgo(comment.created_at, lang)}</span>
            {/* Only allow replies on top-level comments */}
            {!comment.parent_id && (
              <button
                onClick={() => setShowReplyForm(v => !v)}
                className="text-[10px] font-semibold text-stone-400 hover:text-brand"
              >
                {t('feed.reply')}
              </button>
            )}
            {comment.user_id === currentUserId && (
              <button
                onClick={() => onDelete(comment.id)}
                className="text-[10px] text-stone-300 hover:text-red-400"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            )}
          </div>

          {showReplyForm && (
            <div className="flex gap-2 mt-2">
              <input
                type="text"
                value={replyText}
                onChange={e => setReplyText(e.target.value)}
                maxLength={500}
                placeholder={t('feed.replyPlaceholder')}
                onKeyDown={e => e.key === 'Enter' && !e.shiftKey && submitReply()}
                className="flex-1 bg-stone-100 rounded-full px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-brand/30"
              />
              <button
                onClick={submitReply}
                disabled={submitting || !replyText.trim()}
                className="p-1.5 rounded-full bg-brand text-white disabled:opacity-40"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Replies */}
      {replies?.length > 0 && (
        <div className="ml-9 mt-2 space-y-3">
          {replies.map(r => (
            <CommentItem
              key={r.id}
              comment={r}
              currentUserId={currentUserId}
              onReply={onReply}
              onDelete={onDelete}
              lang={lang}
              replies={[]}
            />
          ))}
        </div>
      )}
    </div>
  )
}

export default function CommentList({ postId, currentUserId, lang }) {
  const { t, i18n } = useTranslation()
  const effectiveLang = lang ?? i18n.language
  const [comments, setComments] = useState([])
  const [text, setText]         = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [nameMap, setNameMap]   = useState({})

  async function loadComments() {
    const { data, error } = await supabase
      .from('feed_comments')
      .select('*')
      .eq('post_id', postId)
      .order('created_at', { ascending: true })
    if (error || !data) return
    setComments(data)

    // Fetch display_names for all unique users
    const uids = [...new Set(data.map(c => c.user_id))]
    if (!uids.length) return
    const { data: subs } = await supabase
      .from('subscriptions')
      .select('user_id, display_name')
      .in('user_id', uids)
    if (subs) {
      setNameMap(Object.fromEntries(subs.map(s => [s.user_id, s.display_name ?? 'Usuária'])))
    }
  }

  useEffect(() => { loadComments() }, [postId])

  async function handleSubmit() {
    if (!text.trim()) return
    setSubmitting(true)
    try {
      const { error } = await supabase.from('feed_comments').insert({
        post_id: postId,
        user_id: currentUserId,
        content: text.trim(),
      })
      if (error) throw error
      setText('')
      loadComments()
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDelete(commentId) {
    await supabase.from('feed_comments').delete().eq('id', commentId)
    setComments(prev => prev.filter(c => c.id !== commentId))
  }

  const topLevel = comments.filter(c => !c.parent_id).map(c => ({
    ...c,
    display_name: nameMap[c.user_id] ?? 'Usuária',
  }))
  const repliesFor = (parentId) => comments
    .filter(c => c.parent_id === parentId)
    .map(c => ({ ...c, display_name: nameMap[c.user_id] ?? 'Usuária' }))

  return (
    <div className="mt-3 border-t border-stone-100 pt-3">
      <div className="space-y-3 mb-3">
        {topLevel.map(c => (
          <CommentItem
            key={c.id}
            comment={c}
            currentUserId={currentUserId}
            onReply={loadComments}
            onDelete={handleDelete}
            lang={effectiveLang}
            replies={repliesFor(c.id)}
          />
        ))}
      </div>

      {/* New comment input */}
      <div className="flex gap-2">
        <input
          type="text"
          value={text}
          onChange={e => setText(e.target.value)}
          maxLength={500}
          placeholder={t('feed.commentPlaceholder')}
          onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSubmit()}
          className="flex-1 bg-stone-100 rounded-full px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-brand/30"
        />
        <button
          onClick={handleSubmit}
          disabled={submitting || !text.trim()}
          className="p-2 rounded-full bg-brand text-white disabled:opacity-40"
        >
          <Send className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}
