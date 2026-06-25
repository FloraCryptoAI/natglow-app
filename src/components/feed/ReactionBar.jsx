import React from 'react'
import { supabase } from '@/api/supabaseClient'
import { toast } from 'sonner'

const REACTIONS = [
  { key: 'heart', emoji: '❤️' },
  { key: 'love',  emoji: '😍' },
  { key: 'clap',  emoji: '👏' },
  { key: 'wow',   emoji: '😮' },
]

export default function ReactionBar({ postId, reactions, userReaction, onReactionChange }) {
  async function handleClick(key) {
    try {
      const { data, error } = await supabase.rpc('toggle_feed_reaction', {
        p_post_id:  postId,
        p_reaction: key,
      })
      if (error) throw error
      onReactionChange(data)
    } catch {
      toast.error('Erro ao reagir')
    }
  }

  return (
    <div className="flex items-center gap-1.5">
      {REACTIONS.map(({ key, emoji }) => {
        const count   = reactions?.[key] ?? 0
        const active  = userReaction === key
        return (
          <button
            key={key}
            onClick={() => handleClick(key)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-full text-sm font-semibold transition-all active:scale-90 ${
              active
                ? 'bg-brand/10 text-brand ring-2 ring-brand/30 shadow-sm'
                : 'bg-stone-50 text-stone-500 hover:bg-stone-100'
            }`}
          >
            <span className={`leading-none transition-transform ${active ? 'text-lg scale-110' : 'text-base'}`}>
              {emoji}
            </span>
            {count > 0 && <span className="tabular-nums text-xs">{count}</span>}
          </button>
        )
      })}
    </div>
  )
}
