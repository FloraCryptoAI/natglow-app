import React from 'react'
import { BackButton } from './ui'
import { COLORS, PROGRESS_LABEL, TOTAL_QUESTIONS } from '@/lib/quiz-new/quizNewCopy'

/**
 * Top bar: back button + badge + progress track. The bar fill reflects only the
 * 12 real questions (education/name/loading freeze it at the last question).
 * @param {{ fillIndex:number, badge?:string, questionIndex?:number, onBack?:(()=>void)|null }} props
 */
export default function QuizNewProgress({ fillIndex, badge, questionIndex, onBack }) {
  const pct = Math.max(0, Math.min(100, (fillIndex / TOTAL_QUESTIONS) * 100))
  const label = badge ?? `PASO ${questionIndex} DE ${TOTAL_QUESTIONS} · ${PROGRESS_LABEL}`
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between min-h-[24px]">
        <BackButton onClick={onBack} />
        <span className="text-[11px] font-bold tracking-wider uppercase" style={{ color: COLORS.green }}>
          {label}
        </span>
      </div>
      <div className="h-2 w-full rounded-full overflow-hidden" style={{ background: COLORS.greenLight }} role="progressbar" aria-valuenow={Math.round(pct)} aria-valuemin={0} aria-valuemax={100}>
        <div className="h-full rounded-full transition-all duration-300" style={{ width: `${pct}%`, background: COLORS.green }} />
      </div>
    </div>
  )
}
