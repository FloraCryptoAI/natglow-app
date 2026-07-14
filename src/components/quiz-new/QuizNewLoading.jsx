import React, { useEffect, useState, useRef } from 'react'
import { Check } from 'lucide-react'
import { COLORS, COPY } from '@/lib/quiz-new/quizNewCopy'
import { getAnswerChips } from '@/lib/quiz-new/quizNewPersonalization'

/**
 * Personalized loading screen (~5–7s). Always calls onDone even if timers lag —
 * the user is never stuck.
 * @param {{ answers:object, onDone:()=>void }} props
 */
export default function QuizNewLoading({ answers, onDone }) {
  const c = COPY.loading
  const chips = getAnswerChips(answers).slice(0, 4)
  const [done, setDone] = useState(0)     // how many steps completed
  const finishedRef = useRef(false)

  useEffect(() => {
    const finish = () => { if (!finishedRef.current) { finishedRef.current = true; onDone() } }
    const timers = [
      setTimeout(() => setDone(1), 1200),
      setTimeout(() => setDone(2), 2600),
      setTimeout(() => setDone(3), 4000),
      setTimeout(() => setDone(4), 5400),
      setTimeout(finish, 6400),
    ]
    // Safety net: never leave the user hanging.
    const safety = setTimeout(finish, 9000)
    return () => { timers.forEach(clearTimeout); clearTimeout(safety) }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const allDone = done >= c.steps.length
  return (
    <div className="flex flex-col gap-6 pt-8">
      <h2 className="text-[22px] leading-snug font-extrabold text-center" style={{ color: COLORS.ink }}>
        {allDone ? c.done : c.title}
      </h2>

      {chips.length > 0 && (
        <div className="flex flex-wrap gap-2 justify-center">
          {chips.map((chip, i) => (
            <span key={i} className="text-xs font-semibold rounded-full px-3 py-1.5" style={{ background: COLORS.greenLight, color: COLORS.greenDark }}>
              {chip}
            </span>
          ))}
        </div>
      )}

      <div className="flex flex-col gap-3 pt-2">
        {c.steps.map((label, i) => {
          const complete = i < done
          const active = i === done
          return (
            <div key={i} className="flex items-center gap-3 transition-opacity" style={{ opacity: complete || active ? 1 : 0.4 }}>
              <span className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0"
                    style={{ background: complete ? COLORS.green : COLORS.greenLight, border: `2px solid ${complete ? COLORS.green : '#CDEBD8'}` }}>
                {complete
                  ? <Check className="w-3.5 h-3.5 text-white" strokeWidth={3} />
                  : active ? <span className="w-2 h-2 rounded-full animate-pulse" style={{ background: COLORS.green }} /> : null}
              </span>
              <span className="text-sm font-medium" style={{ color: complete ? COLORS.ink : COLORS.textMuted }}>{label}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
