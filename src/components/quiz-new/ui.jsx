import React from 'react'
import { ChevronLeft, Check, ArrowRight } from 'lucide-react'
import { motion } from 'framer-motion'
import { COLORS, MAX_W, COPY, PROGRESS_LABEL, TOTAL_QUESTIONS } from '@/lib/quiz-new/quizNewCopy'

const GREEN_GRAD = `linear-gradient(135deg, ${COLORS.green}, ${COLORS.greenDark})`

// Page shell: warm-white bg, narrow centered column (mirrors /quiz's max-w-lg).
// The <style> block defines the green card-option / img-card option styles used
// across the funnel — same structure as /quiz, green instead of pink.
export function Shell({ children }) {
  return (
    <div className="min-h-screen w-full" style={{ background: '#FAFAF8', color: COLORS.ink, fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      <style>{`
        .qn-card-option { border:1px solid #e7e5e4; border-radius:16px; cursor:pointer; transition:all .2s; background:#fff; }
        .qn-card-option:active { border-color:${COLORS.green}; background:${COLORS.greenLight}; }
        .qn-card-option.selected { border-color:${COLORS.green}; background:${COLORS.greenLight}; }
        .qn-img-card { border:1px solid #e7e5e4; border-radius:16px; cursor:pointer; transition:all .2s; background:#fff; overflow:hidden; }
        .qn-img-card:hover { border-color:${COLORS.green}; }
        .qn-img-card.selected { border-color:${COLORS.green}; }
      `}</style>
      <div className="mx-auto w-full px-3 pt-5 pb-8 flex flex-col gap-6" style={{ maxWidth: MAX_W }}>
        {children}
      </div>
    </div>
  )
}

export function PrimaryButton({ children, onClick, disabled, type = 'button', ariaLabel, pulse = false }) {
  return (
    <motion.button
      type={type}
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel}
      animate={pulse && !disabled ? { scale: [1, 1.03, 1] } : {}}
      transition={pulse && !disabled ? { duration: 1.8, repeat: Infinity, ease: 'easeInOut' } : {}}
      className="w-full py-4 font-extrabold text-white rounded-full text-[15px] flex items-center justify-center gap-2 focus:outline-none focus-visible:ring-4"
      style={{ background: disabled ? '#9CA3AF' : GREEN_GRAD, boxShadow: disabled ? 'none' : '0 6px 20px rgba(31,148,79,0.30)', opacity: disabled ? 0.6 : 1, cursor: disabled ? 'not-allowed' : 'pointer' }}
    >
      {children}
    </motion.button>
  )
}

export function BackButton({ onClick }) {
  if (!onClick) return <div className="h-6" />
  return (
    <button onClick={onClick} aria-label="Volver a la pregunta anterior"
      className="inline-flex items-center gap-1 text-sm font-semibold rounded-lg py-1 pr-2 focus:outline-none focus-visible:ring-2"
      style={{ color: COLORS.textMuted }}>
      <ChevronLeft className="w-4 h-4" /> Volver
    </button>
  )
}

// Green pill badge (matches /quiz's step badge).
export function Badge({ children }) {
  return (
    <span className="self-center inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-white text-[10px] font-extrabold tracking-wider" style={{ background: COLORS.green }}>
      {children}
    </span>
  )
}

export function ProgressBar({ fillIndex }) {
  const pct = Math.max(0, Math.min(100, (fillIndex / TOTAL_QUESTIONS) * 100))
  return (
    <div className="w-full rounded-full h-1.5" style={{ background: COLORS.greenLight }} role="progressbar" aria-valuenow={Math.round(pct)} aria-valuemin={0} aria-valuemax={100}>
      <motion.div className="h-1.5 rounded-full" style={{ background: COLORS.green }} initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.4 }} />
    </div>
  )
}

// Question header: back + green badge "PASO X DE 12 · ..." + bar + CENTERED title/subtitle.
export function StepHead({ questionIndex, fillIndex, title, subtitle, highlight, onBack }) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between min-h-[24px]">
        <BackButton onClick={onBack} />
        <div className="w-10" />
      </div>
      <Badge>{`PASO ${questionIndex} DE ${TOTAL_QUESTIONS} · ${PROGRESS_LABEL}`}</Badge>
      <ProgressBar fillIndex={fillIndex} />
      <div className="text-center flex flex-col gap-2.5 pt-1">
        <h2 className="text-2xl font-extrabold leading-snug" style={{ color: COLORS.ink }}>
          <Highlighted text={title} phrases={highlight ? [highlight] : []} />
        </h2>
        {subtitle && <p className="text-sm leading-relaxed" style={{ color: COLORS.textMuted }}>{subtitle}</p>}
      </div>
    </div>
  )
}

// Education / non-question header: back + tag badge + bar (no title — the screen renders its own centered title).
export function StepProgress({ badge, fillIndex, onBack }) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between min-h-[24px]">
        <BackButton onClick={onBack} />
        <div className="w-10" />
      </div>
      <Badge>{badge}</Badge>
      <ProgressBar fillIndex={fillIndex} />
    </div>
  )
}

// Option row — the /quiz card-option style (emoji + label + desc + check).
export function OptionRow({ emoji, label, desc, selected, onClick }) {
  return (
    <div className={`qn-card-option px-5 py-4 flex items-center gap-4 ${selected ? 'selected' : ''}`} onClick={onClick} role="button" tabIndex={0}
         onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick() } }} aria-pressed={selected}>
      {emoji && <span className="text-3xl leading-none flex-shrink-0" aria-hidden>{emoji}</span>}
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-base leading-snug" style={{ color: '#44403C' }}>{label}</p>
        {desc && <p className="text-sm mt-0.5 leading-snug" style={{ color: COLORS.textMuted }}>{desc}</p>}
      </div>
      {selected && <Check className="w-5 h-5 flex-shrink-0" style={{ color: COLORS.green }} />}
    </div>
  )
}

// Image tile — the /quiz img-card style. Shows the image when it loads; falls
// back to a big emoji in a tinted box when there's no image OR the file doesn't
// exist yet (so nothing looks broken before the art is dropped in).
export function ImgCard({ image, emoji, label, selected, onClick }) {
  const [imgOk, setImgOk] = React.useState(true)
  const showImg = image && imgOk
  return (
    <div className={`qn-img-card ${selected ? 'selected' : ''}`} onClick={onClick} role="button" tabIndex={0}
         onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick() } }} aria-pressed={selected}>
      <div className="w-full h-32 overflow-hidden flex items-center justify-center" style={{ background: COLORS.greenLight }}>
        {showImg
          ? <img src={image} alt={label} loading="lazy" decoding="async" className="block w-full h-full object-cover" onError={() => setImgOk(false)} />
          : <span className="text-5xl" aria-hidden>{emoji}</span>}
      </div>
      <div className="px-3 py-3.5 flex items-center justify-center gap-2">
        <span className="text-sm font-semibold text-center" style={{ color: '#44403C' }}>{label}</span>
        {selected && <Check className="w-4 h-4 flex-shrink-0" style={{ color: COLORS.green }} />}
      </div>
    </div>
  )
}

// Card with subtle border/shadow.
export function Card({ children, tone, className = '', style = {} }) {
  const bg = tone === 'green' ? COLORS.greenLight : tone === 'yellow' ? COLORS.yellowLight : '#fff'
  const border = tone === 'green' ? '#CDEBD8' : tone === 'yellow' ? '#F5E9A8' : COLORS.border
  return (
    <div className={`rounded-2xl p-4 ${className}`} style={{ background: bg, border: `1px solid ${border}`, boxShadow: '0 1px 3px rgba(23,23,23,0.04)', ...style }}>
      {children}
    </div>
  )
}

// Filled green pill highlight for keywords (matches /quiz's HL, green not pink).
export function Highlighted({ text, phrases = [] }) {
  if (!phrases.length) return <>{text}</>
  const escaped = phrases.map(p => p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
  const re = new RegExp(`(${escaped.join('|')})`, 'gi')
  const parts = text.split(re)
  return (
    <>
      {parts.map((part, i) =>
        phrases.some(p => p.toLowerCase() === part.toLowerCase())
          ? <span key={i} style={{ background: COLORS.green, color: '#fff', padding: '1px 8px', borderRadius: 6, WebkitBoxDecorationBreak: 'clone', boxDecorationBreak: 'clone' }}>{part}</span>
          : <React.Fragment key={i}>{part}</React.Fragment>
      )}
    </>
  )
}

export function Footer() {
  return (
    <p className="text-center text-xs mt-2" style={{ color: COLORS.textMuted }}>
      {COPY.footer.legal}{' '}
      <a href="/terms" className="underline">{COPY.footer.terms}</a>{' y '}
      <a href="/privacy" className="underline">{COPY.footer.privacy}</a>.
    </p>
  )
}

export { ArrowRight }

export const slide = {
  initial: { opacity: 0, x: 16 },
  animate: { opacity: 1, x: 0 },
  exit:    { opacity: 0, x: -16 },
  transition: { duration: 0.22, ease: 'easeOut' },
}
