import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { MessageCircle, Trash2 } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { enUS, es } from 'date-fns/locale'
import { supabase } from '@/api/supabaseClient'
import { toast } from 'sonner'
import ReactionBar from './ReactionBar'
import CommentList from './CommentList'

function timeAgo(dateStr, lang) {
  return formatDistanceToNow(new Date(dateStr), {
    addSuffix: true,
    locale: lang?.startsWith('es') ? es : enUS,
  })
}

export default function PostCard({ post, currentUserId, lang, onDelete }) {
  const { t } = useTranslation()
  const [showComments, setShowComments] = useState(false)
  const [reactions, setReactions]       = useState(post.reactions ?? { heart: 0, love: 0, clap: 0, wow: 0 })
  const [userReaction, setUserReaction] = useState(post.user_reaction ?? null)

  const authorName = post.is_admin ? 'NatGlow' : (post.author_name ?? post.display_name ?? 'Usuária')
  const initials   = authorName[0].toUpperCase()

  function handleReactionChange(result) {
    const { action, reaction: key } = result
    const prevReaction = userReaction

    setReactions(prev => {
      const next = { ...prev }
      if (action === 'removed') {
        next[key] = Math.max((next[key] ?? 0) - 1, 0)
      } else if (action === 'added') {
        next[key] = (next[key] ?? 0) + 1
      } else {
        if (prevReaction) next[prevReaction] = Math.max((next[prevReaction] ?? 0) - 1, 0)
        next[key] = (next[key] ?? 0) + 1
      }
      return next
    })

    setUserReaction(action === 'removed' ? null : key)
  }

  async function handleDeleteOwn() {
    try {
      const { error } = await supabase
        .from('feed_posts')
        .delete()
        .eq('id', post.id)
        .eq('status', 'pending')
      if (error) throw error
      onDelete?.(post.id)
    } catch {
      toast.error('Erro ao excluir post')
    }
  }

  const canDelete = post.user_id === currentUserId && post.status === 'pending'
  const hasDualImages = post.image_url && post.image_url_2

  return (
    <div className="bg-white rounded-2xl border border-stone-100 p-4 shadow-sm">
      {/* Header */}
      <div className="flex items-start gap-3 mb-3">
        {/* Avatar */}
        <div className={`w-9 h-9 rounded-full flex-shrink-0 overflow-hidden ${!post.author_avatar_url ? (post.is_admin ? 'bg-brand' : 'bg-brand/10') : ''}`}>
          {post.author_avatar_url ? (
            <img src={post.author_avatar_url} alt="" className="w-full h-full object-cover" />
          ) : (
            <span className={`w-full h-full flex items-center justify-center text-sm font-bold ${post.is_admin ? 'text-white' : 'text-brand'}`}>
              {initials}
            </span>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold text-stone-800">
              {authorName}
              {post.feeling && (
                <span className="font-normal"> {t('feed.feelingPrefix')} {t(`feed.feelings.${post.feeling}`)}</span>
              )}
            </span>
            {post.is_admin && (
              <span className="px-1.5 py-0.5 bg-brand/10 text-brand text-[10px] font-bold rounded-full">
                {t('feed.adminBadge')}
              </span>
            )}
            {post.status === 'pending' && (
              <span className="px-1.5 py-0.5 bg-amber-100 text-amber-600 text-[10px] font-semibold rounded-full">
                {t('feed.pendingBadge') || 'Pendente'}
              </span>
            )}
          </div>
          <p className="text-[11px] text-stone-400">{timeAgo(post.created_at, lang)}</p>
        </div>

        {canDelete && (
          <button
            onClick={handleDeleteOwn}
            className="p-1.5 rounded-lg text-stone-300 hover:text-red-400 hover:bg-red-50"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Content */}
      <p className="text-sm text-stone-700 leading-relaxed mb-3 whitespace-pre-wrap">{post.content}</p>

      {/* Images */}
      {post.image_url && (
        <div className={`mb-3 rounded-xl overflow-hidden ${hasDualImages ? 'grid grid-cols-2 gap-1' : ''}`}>
          <div className={`${hasDualImages ? '' : 'w-full'} aspect-square overflow-hidden`}>
            <img src={post.image_url} alt="" className="w-full h-full object-cover" loading="lazy" />
          </div>
          {post.image_url_2 && (
            <div className="aspect-square overflow-hidden">
              <img src={post.image_url_2} alt="" className="w-full h-full object-cover" loading="lazy" />
            </div>
          )}
        </div>
      )}

      {/* Reactions + comments toggle */}
      <div className="flex items-center gap-3 flex-wrap">
        <ReactionBar
          postId={post.id}
          reactions={reactions}
          userReaction={userReaction}
          onReactionChange={handleReactionChange}
        />
        <button
          onClick={() => setShowComments(v => !v)}
          className="flex items-center gap-1.5 text-xs text-stone-400 hover:text-brand ml-auto"
        >
          <MessageCircle className="w-4 h-4" />
          <span>{post.comments_count > 0 ? post.comments_count : t('feed.comments')}</span>
        </button>
      </div>

      {/* Comments */}
      {showComments && (
        <CommentList postId={post.id} currentUserId={currentUserId} lang={lang} />
      )}
    </div>
  )
}
