import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { MessageCircle, Trash2 } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { enUS, es } from 'date-fns/locale'
import { supabase } from '@/api/supabaseClient'
import { toast } from 'sonner'
import ReactionBar from './ReactionBar'
import CommentList from './CommentList'
import LazyImage from './LazyImage'

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
  const [expanded, setExpanded]         = useState(false)

  const totalReactions = Object.values(reactions ?? {}).reduce((a, b) => a + (b || 0), 0)
  const contentLines = post.content.split('\n')
  const isLong = contentLines.length > 3 || post.content.length > 130
  const truncated = isLong
    ? contentLines.length > 3
      ? contentLines.slice(0, 3).join('\n')
      : post.content.slice(0, 120).replace(/\s\S*$/, '')
    : post.content

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
      // Remove images from Storage before deleting the row
      const paths = [post.image_url, post.image_url_2]
        .filter(Boolean)
        .map(url => url.split('/feed-images/')[1])
        .filter(Boolean)
      if (paths.length > 0) {
        await supabase.storage.from('feed-images').remove(paths)
      }

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
    <article className="bg-white border-b border-stone-100 mb-2">
      {/* Header */}
      <div className="flex items-start gap-3 px-4 pt-4 pb-2">
        {/* Avatar */}
        <div className={`w-10 h-10 rounded-full flex-shrink-0 overflow-hidden ${!post.author_avatar_url ? (post.is_admin ? 'bg-brand' : 'bg-brand/10') : ''}`}>
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
      <div className="px-4 pb-3">
        <p className="text-sm text-stone-700 leading-relaxed whitespace-pre-wrap">
          {expanded ? post.content : truncated}
          {isLong && !expanded && (
            <span>{'... '}
              <button
                onClick={() => setExpanded(true)}
                className="text-sm font-semibold text-brand hover:text-brand/80"
              >
                {t('feed.readMore') || 'ler más'}
              </button>
            </span>
          )}
        </p>
      </div>

      {/* Images — full bleed, sem padding horizontal.
          LazyImage reserves the aspect ratio with a stone-100 skeleton so the
          feed doesn't reflow as each photo decodes. Single image uses 4/5
          (Instagram portrait); dual uses 1/1 in a 2-col grid. */}
      {post.image_url && (
        <div className={hasDualImages ? 'grid grid-cols-2 gap-px mb-0' : 'mb-0'}>
          <LazyImage
            src={post.image_url}
            alt=""
            aspectRatio={hasDualImages ? '1/1' : '4/5'}
            className="w-full"
          />
          {post.image_url_2 && (
            <LazyImage
              src={post.image_url_2}
              alt=""
              aspectRatio="1/1"
              className="w-full"
            />
          )}
        </div>
      )}

      {/* Reactions bar — bigger touch targets, prominent below image (Instagram-style) */}
      <div className="px-4 pt-3">
        <ReactionBar
          postId={post.id}
          reactions={reactions}
          userReaction={userReaction}
          onReactionChange={handleReactionChange}
        />
      </div>

      {/* Social proof line — total reactions + comments */}
      {(totalReactions > 0 || post.comments_count > 0) && (
        <div className="flex items-center gap-3 px-4 pt-2 text-xs text-stone-500">
          {totalReactions > 0 && (
            <span className="font-semibold text-stone-700">
              {totalReactions} {totalReactions === 1
                ? (t('feed.oneReaction') || 'reacción')
                : (t('feed.manyReactions') || 'reacciones')}
            </span>
          )}
          {post.comments_count > 0 && (
            <button
              onClick={() => setShowComments(v => !v)}
              className="hover:text-stone-700"
            >
              {post.comments_count === 1
                ? (t('feed.oneComment') || `${post.comments_count} comentario`)
                : `${post.comments_count} ${t('feed.manyComments') || 'comentarios'}`}
            </button>
          )}
        </div>
      )}

      {/* Comments toggle button */}
      <div className="flex items-center px-4 pt-2 pb-3">
        <button
          onClick={() => setShowComments(v => !v)}
          className="flex items-center gap-1.5 text-xs text-stone-400 hover:text-brand"
        >
          <MessageCircle className="w-4 h-4" />
          <span>
            {showComments
              ? (t('feed.hideComments') || 'Ocultar comentarios')
              : (post.comments_count > 0
                  ? (t('feed.viewComments') || 'Ver comentarios')
                  : (t('feed.addComment') || 'Comentar'))}
          </span>
        </button>
      </div>

      {/* Comments — separator line for visual breathing */}
      {showComments && (
        <div className="px-4 pb-3 border-t border-stone-100 pt-3">
          <CommentList postId={post.id} currentUserId={currentUserId} lang={lang} />
        </div>
      )}
    </article>
  )
}
