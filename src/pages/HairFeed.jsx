import React, { useEffect, useState, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { supabase } from '@/api/supabaseClient'
import { Plus, Loader2, Newspaper, RefreshCw } from 'lucide-react'
import PostCard from '@/components/feed/PostCard'
import CreatePostModal from '@/components/feed/CreatePostModal'
import { profileCache, updateProfileCache } from '@/lib/profileCache'

const PAGE_SIZE = 10
const MAX_POSTS = 50          // cap total visible posts
const CACHE_TTL = 3 * 60 * 1000  // don't reload if data is < 3 min old

// Module-level cache — survives component remounts within the same browser session
let _cache = { posts: [], offset: 0, hasMore: false, uid: null, ts: 0 }

export default function HairFeed() {
  const { t, i18n } = useTranslation()
  const lang = i18n.language?.startsWith('es') ? 'es' : 'en'

  const [posts, setPosts]             = useState(_cache.posts)
  const [loading, setLoading]         = useState(_cache.posts.length === 0)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore]         = useState(_cache.hasMore)
  const [offset, setOffset]           = useState(_cache.offset)
  const [showCreate, setShowCreate]   = useState(false)
  const [currentUserId, setCurrentUserId] = useState(profileCache.uid)
  const [displayName, setDisplayName]     = useState(profileCache.displayName)
  const [avatarUrl, setAvatarUrl]         = useState(profileCache.avatarUrl)
  const loadingRef = useRef(false)

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return
      setCurrentUserId(user.id)
      // Skip profile fetch if shared cache already has data for this user
      if (profileCache.uid === user.id && profileCache.displayName !== null) return
      supabase
        .from('subscriptions')
        .select('display_name, avatar_url')
        .eq('user_id', user.id)
        .single()
        .then(({ data }) => {
          const name   = data?.display_name ?? null
          const avatar = data?.avatar_url   ?? null
          setDisplayName(name)
          setAvatarUrl(avatar)
          updateProfileCache({ uid: user.id, displayName: name, avatarUrl: avatar })
        })
    })
  }, [])

  useEffect(() => {
    if (!currentUserId) return
    // Skip if cache is fresh for this user
    if (
      _cache.uid === currentUserId &&
      _cache.posts.length > 0 &&
      Date.now() - _cache.ts < CACHE_TTL
    ) {
      setPosts(_cache.posts)
      setOffset(_cache.offset)
      setHasMore(_cache.hasMore)
      setLoading(false)
      return
    }
    loadPosts(true)
  }, [currentUserId])

  async function loadPosts(reset = false) {
    if (loadingRef.current) return
    loadingRef.current = true

    const from = reset ? 0 : offset
    if (reset) setLoading(true); else setLoadingMore(true)

    try {
      const { data, error } = await supabase
        .from('feed_posts')
        .select('*')
        .eq('status', 'approved')
        .order('created_at', { ascending: false })
        .range(from, from + PAGE_SIZE - 1)
      if (error) throw error

      // Fetch current user's reactions for this page
      let reactionMap = {}
      if (currentUserId && data?.length) {
        const { data: reactions } = await supabase
          .from('feed_reactions')
          .select('post_id, reaction')
          .in('post_id', data.map(p => p.id))
          .eq('user_id', currentUserId)
        if (reactions) reactionMap = Object.fromEntries(reactions.map(r => [r.post_id, r.reaction]))
      }

      const enriched = (data ?? []).map(p => ({
        ...p,
        user_reaction: reactionMap[p.id] ?? null,
      }))

      const newOffset   = from + PAGE_SIZE
      const moreAvailable = (data ?? []).length === PAGE_SIZE && newOffset < MAX_POSTS

      if (reset) {
        setPosts(enriched)
        setOffset(newOffset)
        setHasMore(moreAvailable)
        _cache = { posts: enriched, offset: newOffset, hasMore: moreAvailable, uid: currentUserId, ts: Date.now() }
      } else {
        setPosts(prev => {
          const merged = [...prev, ...enriched]
          _cache = { posts: merged, offset: newOffset, hasMore: moreAvailable, uid: currentUserId, ts: Date.now() }
          return merged
        })
        setOffset(newOffset)
        setHasMore(moreAvailable)
      }
    } finally {
      setLoading(false)
      setLoadingMore(false)
      loadingRef.current = false
    }
  }

  function handlePostDeleted(id) {
    const updated = posts.filter(p => p.id !== id)
    setPosts(updated)
    _cache = { ..._cache, posts: updated }
  }

  function handleRefresh() {
    _cache = { posts: [], offset: 0, hasMore: false, uid: null, ts: 0 }
    loadPosts(true)
  }

  return (
    <div className="max-w-xl mx-auto pb-10">
      {/* Header */}
      <div className="flex items-center justify-between mb-5 pt-2">
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-bold text-stone-800">{t('feed.title')}</h1>
          <button
            onClick={handleRefresh}
            disabled={loading}
            className="p-1.5 rounded-lg text-stone-400 hover:text-brand hover:bg-brand/5 disabled:opacity-30"
            title={t('feed.refresh') || 'Atualizar'}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-1.5 px-4 py-2 bg-brand text-white text-sm font-semibold rounded-full shadow-sm hover:bg-brand/90 active:scale-95 transition-all"
        >
          <Plus className="w-4 h-4" />
          {t('feed.publish')}
        </button>
      </div>

      {/* Loading skeleton */}
      {loading && (
        <div className="flex justify-center py-12">
          <Loader2 className="w-6 h-6 text-brand animate-spin" />
        </div>
      )}

      {/* Empty */}
      {!loading && posts.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-14 h-14 rounded-2xl bg-brand/10 flex items-center justify-center mb-4">
            <Newspaper className="w-7 h-7 text-brand" />
          </div>
          <p className="text-base font-semibold text-stone-700 mb-1">{t('feed.noPostsYet')}</p>
        </div>
      )}

      {/* Posts */}
      {!loading && (
        <div className="space-y-4">
          {posts.map(post => (
            <PostCard
              key={post.id}
              post={post}
              currentUserId={currentUserId}
              lang={lang}
              onDelete={handlePostDeleted}
            />
          ))}
        </div>
      )}

      {/* Load more — only if under MAX_POSTS cap */}
      {hasMore && !loading && posts.length < MAX_POSTS && (
        <div className="flex justify-center mt-6">
          <button
            onClick={() => loadPosts(false)}
            disabled={loadingMore}
            className="flex items-center gap-2 px-6 py-2.5 rounded-full border border-stone-200 text-sm text-stone-600 font-medium hover:bg-stone-50 disabled:opacity-50"
          >
            {loadingMore && <Loader2 className="w-4 h-4 animate-spin" />}
            {t('feed.loadMore')}
          </button>
        </div>
      )}

      {/* End of feed message when cap reached */}
      {!hasMore && !loading && posts.length >= PAGE_SIZE && (
        <p className="text-center text-xs text-stone-300 mt-8">{t('feed.endOfFeed') || '— fim do feed —'}</p>
      )}

      {/* Create post modal */}
      {showCreate && (
        <CreatePostModal
          currentUserId={currentUserId}
          displayName={displayName}
          authorAvatarUrl={avatarUrl}
          onClose={() => setShowCreate(false)}
          onPosted={(newName) => {
            if (newName) {
              setDisplayName(newName)
              updateProfileCache({ displayName: newName })
            }
          }}
        />
      )}
    </div>
  )
}
