import React from 'react'
import { ChevronLeft } from 'lucide-react'
import { COLORS, MAX_W, COPY } from '@/lib/quiz-new/quizNewCopy'

// Page shell: warm-white bg, centered narrow column (mobile-first, not a wide landing).
export function Shell({ children }) {
  return (
    <div className="min-h-screen w-full" style={{ background: COLORS.bg, color: COLORS.ink, fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      <div className="mx-auto w-full px-4 pt-4 pb-10 flex flex-col gap-6" style={{ maxWidth: MAX_W }}>
        {children}
      </div>
    </div>
  )
}

export function PrimaryButton({ children, onClick, disabled, type = 'button', ariaLabel }) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel}
      className="w-full rounded-full font-bold text-white py-4 px-5 text-[15px] tracking-wide transition-all active:scale-[0.99] disabled:opacity-40 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-4"
      style={{ background: disabled ? '#9CA3AF' : COLORS.green, boxShadow: disabled ? 'none' : '0 6px 16px rgba(31,148,79,0.25)' }}
    >
      {children}
    </button>
  )
}

export function BackButton({ onClick }) {
  if (!onClick) return <div className="h-6" />
  return (
    <button
      onClick={onClick}
      aria-label="Volver a la pregunta anterior"
      className="inline-flex items-center gap-1 text-sm font-semibold rounded-lg py-1 pr-2 focus:outline-none focus-visible:ring-2"
      style={{ color: COLORS.textMuted }}
    >
      <ChevronLeft className="w-4 h-4" /> Volver
    </button>
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

// Highlight given phrases within a title using a soft yellow background.
export function Highlighted({ text, phrases = [] }) {
  if (!phrases.length) return <>{text}</>
  // Build a regex that matches any phrase (case-insensitive), keep delimiters.
  const escaped = phrases.map(p => p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
  const re = new RegExp(`(${escaped.join('|')})`, 'gi')
  const parts = text.split(re)
  return (
    <>
      {parts.map((part, i) =>
        phrases.some(p => p.toLowerCase() === part.toLowerCase())
          ? <mark key={i} style={{ background: COLORS.yellow, color: COLORS.ink, padding: '0 4px', borderRadius: 6 }}>{part}</mark>
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

// Slide transition props for framer-motion.
export const slide = {
  initial: { opacity: 0, x: 16 },
  animate: { opacity: 1, x: 0 },
  exit:    { opacity: 0, x: -16 },
  transition: { duration: 0.22, ease: 'easeOut' },
}
