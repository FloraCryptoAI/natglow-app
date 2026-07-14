import React from 'react'
import { Lock } from 'lucide-react'
import { Card } from '@/components/quiz-new/ui'
import { COLORS, COPY } from '@/lib/quiz-new/quizNewCopy'
import { getPreparedContentBlocks } from '@/lib/quiz-new/quizNewPersonalization'

export default function ResultPreparedContent({ answers }) {
  const c = COPY.results
  const blocks = getPreparedContentBlocks(answers)
  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-lg font-extrabold" style={{ color: COLORS.ink }}>{c.preparedTitle}</h2>
      <p className="text-sm leading-relaxed" style={{ color: COLORS.textMuted }}>{c.preparedText}</p>
      <div className="flex flex-col gap-3">
        {blocks.map((b, i) => (
          <Card key={i} className="flex items-start gap-3 relative overflow-hidden">
            <span className="w-9 h-9 rounded-xl flex items-center justify-center text-lg flex-shrink-0" style={{ background: COLORS.greenLight }} aria-hidden>{b.icon}</span>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-[15px]" style={{ color: COLORS.ink }}>{b.title}</p>
              <p className="text-sm mt-0.5" style={{ color: COLORS.textMuted }}>{b.text}</p>
            </div>
            <Lock className="w-4 h-4 flex-shrink-0 mt-1" style={{ color: '#C9C3BC' }} aria-hidden />
          </Card>
        ))}
      </div>
    </section>
  )
}
