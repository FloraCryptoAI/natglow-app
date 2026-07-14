import React from 'react'
import { Card } from '@/components/quiz-new/ui'
import { COLORS, COPY } from '@/lib/quiz-new/quizNewCopy'
import { getProfileSummary, secondaryGoals } from '@/lib/quiz-new/quizNewPersonalization'

export default function ResultProfileSummary({ answers }) {
  const rows = getProfileSummary(answers)
  const extra = secondaryGoals(answers)
  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-lg font-extrabold" style={{ color: COLORS.ink }}>{COPY.results.profileTitle}</h2>
      <div className="grid grid-cols-2 gap-3">
        {rows.map((r, i) => (
          <Card key={i}>
            <p className="text-[11px] font-bold uppercase tracking-wide" style={{ color: COLORS.textMuted }}>{r.label}</p>
            <p className="text-[15px] font-bold mt-1" style={{ color: COLORS.ink }}>{r.value}</p>
          </Card>
        ))}
      </div>
      {extra.length > 0 && (
        <p className="text-sm" style={{ color: COLORS.textMuted }}>
          {COPY.results.secondaryPrefix}{' '}
          <span className="font-semibold" style={{ color: COLORS.ink }}>{extra.join(', ')}</span>.
        </p>
      )}
    </section>
  )
}
