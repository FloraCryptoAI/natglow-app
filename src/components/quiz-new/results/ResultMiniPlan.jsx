import React from 'react'
import { Card } from '@/components/quiz-new/ui'
import { COLORS, COPY } from '@/lib/quiz-new/quizNewCopy'

export default function ResultMiniPlan() {
  const c = COPY.results
  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-lg font-extrabold" style={{ color: COLORS.ink }}>{c.miniPlanTitle}</h2>
      <div className="flex flex-col gap-3">
        {c.miniPlan.map((m, i) => (
          <Card key={i} className="flex items-start gap-3">
            <span className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-extrabold flex-shrink-0"
                  style={{ background: COLORS.green, color: '#fff' }}>{i + 1}</span>
            <div>
              <p className="font-bold text-[15px]" style={{ color: COLORS.ink }}>{m.title}</p>
              <p className="text-sm mt-0.5" style={{ color: COLORS.textMuted }}>{m.text}</p>
            </div>
          </Card>
        ))}
      </div>
      <p className="text-xs leading-relaxed" style={{ color: COLORS.textMuted }}>{c.miniPlanNote}</p>
    </section>
  )
}
