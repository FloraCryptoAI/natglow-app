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
    <div className="flex items-center gap-1">
      {REACTIONS.map(({ key, emoji }) => {
        const count   = reactions?.[key] ?? 0
        const active  = userReaction === key
        return (
          <button
            key={key}
            onClick={() => handleClick(key)}
            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-full text-xs font-medium transition-all ${
              active
                ? 'bg-brand/10 text-brand ring-1 ring-brand/20'
                : 'bg-stone-100 text-stone-500 hover:bg-stone-200'
            }`}
          >
            <span className="text-sm leading-none">{emoji}</span>
            {count > 0 && <span>{count}</span>}
          </button>
        )
      })}
    </div>
  )
}
