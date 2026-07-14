import React from 'react'
import { Shell, PrimaryButton, Card, Highlighted, Footer } from './ui'
import { COLORS, COPY } from '@/lib/quiz-new/quizNewCopy'

export default function QuizNewLanding({ onStart }) {
  const c = COPY.landing
  return (
    <Shell>
      <div className="flex flex-col gap-5 pt-2">
        <div className="text-center">
          <span className="inline-flex items-center gap-1.5 text-xs font-extrabold px-3.5 py-1.5 rounded-full"
                style={{ background: COLORS.greenLight, color: COLORS.greenDark }}>
            {c.tag}
          </span>
        </div>

        <div className="text-center flex flex-col gap-3">
          <h1 className="text-3xl leading-tight font-extrabold" style={{ color: COLORS.ink }}>
            <Highlighted text={c.title} phrases={c.highlights} />
          </h1>
          <p className="text-base leading-snug" style={{ color: COLORS.textMuted }}>{c.text}</p>
        </div>

        <div className="flex flex-col gap-3">
          {c.cards.map((card, i) => (
            <Card key={i} className="flex items-start gap-3">
              <span className="text-2xl leading-none flex-shrink-0" aria-hidden>{card.icon}</span>
              <div>
                <p className="font-bold text-[15px]" style={{ color: COLORS.ink }}>{card.title}</p>
                <p className="text-sm mt-0.5" style={{ color: COLORS.textMuted }}>{card.text}</p>
              </div>
            </Card>
          ))}
        </div>

        <div className="flex flex-col gap-2 pt-1">
          <PrimaryButton onClick={onStart} ariaLabel="Comenzar mi evaluación">{c.cta}</PrimaryButton>
          <p className="text-center text-xs" style={{ color: COLORS.textMuted }}>{c.micro}</p>
        </div>

        <Footer />
      </div>
    </Shell>
  )
}
