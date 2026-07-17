import React, { useState, useRef, useEffect } from 'react'
import { useLocation, useNavigate, Navigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react'

import { PRICING_PLANS } from '@/config/pricing'
import { trackFunnelEvent, getFunnelSessionId } from '@/lib/trackFunnelEvent'
import { initFacebookPixel, trackFbEvent } from '@/lib/tracking/facebook-pixel'
import { initTikTokPixel, trackTtEvent } from '@/lib/tracking/tiktok-pixel'
import AnswerTable from '@/components/quiz-cabello/AnswerTable'
import { LockedRecipeCards, LockedHabitsCard } from '@/components/quiz-cabello/LockedCards'
import {
  getAnswerRows, getStartingPointText, displayName,
} from '@/lib/resultsCabello'

const STORE = 'cabello'
// Real before/after photos from the existing testimonials (temporary — to be
// swapped for an illustration).
const IMG_NATGLOW = '/images/quiz-natglow'

// Same pink identity as /quiz and the offer.
const P         = '#FB45A9'
const P_DARK    = '#E03594'
const PINK_GRAD = 'linear-gradient(135deg, #FB45A9, #E03594)'
const BG        = '#fafaf9'


function PinkButton({ children, onClick, pulse = true }) {
  return (
    <motion.button
      onClick={onClick}
      animate={pulse ? { scale: [1, 1.03, 1] } : {}}
      transition={pulse ? { duration: 1.8, repeat: Infinity, ease: 'easeInOut' } : {}}
      className="w-full py-4 font-extrabold text-white rounded-full text-[15px] flex items-center justify-center gap-2"
      style={{ background: PINK_GRAD, boxShadow: '0 4px 20px rgba(251,69,169,0.32)' }}
    >
      {children}
    </motion.button>
  )
}

// Pink marker highlight for keywords — same cue as the quiz titles.
const HL = ({ children }) => (
  <span
    style={{
      background: P,
      color: '#fff',
      padding: '1px 8px',
      borderRadius: '6px',
      WebkitBoxDecorationBreak: 'clone',
      boxDecorationBreak: 'clone',
    }}
  >
    {children}
  </span>
)

/**
 * Drag-to-compare slider. The "después" image is the base layer (so it shows on
 * the RIGHT) and the "antes" image is clipped from the left edge to the handle
 * (so it shows on the LEFT).
 *
 * Uses pointer events + setPointerCapture so a drag that leaves the element
 * keeps tracking, and `touch-action: none` so dragging never scrolls the page
 * on mobile. Arrow keys move the handle for keyboard users.
 */
function BeforeAfterSlider({ beforeUrl, afterUrl }) {
  const [pos, setPos] = useState(50)
  const ref = useRef(null)
  const dragging = useRef(false)

  const setFromClientX = (clientX) => {
    const el = ref.current
    if (!el) return
    const r = el.getBoundingClientRect()
    if (!r.width) return
    setPos(Math.max(0, Math.min(100, ((clientX - r.left) / r.width) * 100)))
  }

  const onPointerDown = (e) => {
    dragging.current = true
    e.currentTarget.setPointerCapture?.(e.pointerId)
    setFromClientX(e.clientX)
  }
  const onPointerMove = (e) => {
    if (!dragging.current) return
    setFromClientX(e.clientX)
  }
  const endDrag = (e) => {
    dragging.current = false
    e.currentTarget.releasePointerCapture?.(e.pointerId)
  }
  const onKeyDown = (e) => {
    if (e.key === 'ArrowLeft')  { e.preventDefault(); setPos(p => Math.max(0, p - 5)) }
    if (e.key === 'ArrowRight') { e.preventDefault(); setPos(p => Math.min(100, p + 5)) }
  }

  return (
    <div
      ref={ref}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      onKeyDown={onKeyDown}
      role="slider"
      aria-label="Comparar antes y después"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(pos)}
      tabIndex={0}
      className="relative w-full overflow-hidden rounded-2xl select-none cursor-ew-resize outline-none"
      style={{ aspectRatio: '3/4', background: '#f5f5f4', touchAction: 'none' }}
    >
      {/* Base layer — DESPUÉS (right side) */}
      <img
        src={afterUrl}
        alt="Después"
        draggable={false}
        loading="lazy"
        decoding="async"
        className="absolute inset-0 w-full h-full object-cover pointer-events-none"
      />
      {/* Clipped layer — ANTES (left side) */}
      <img
        src={beforeUrl}
        alt="Antes"
        draggable={false}
        loading="lazy"
        decoding="async"
        className="absolute inset-0 w-full h-full object-cover pointer-events-none"
        style={{ clipPath: `inset(0 ${100 - pos}% 0 0)` }}
      />

      {/* Divider + handle */}
      <div
        className="absolute top-0 bottom-0 pointer-events-none"
        style={{ left: `${pos}%`, transform: 'translateX(-50%)' }}
      >
        <div className="absolute top-0 bottom-0 left-1/2 w-0.5 -translate-x-1/2" style={{ background: '#fff', boxShadow: '0 0 6px rgba(0,0,0,0.35)' }} />
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white flex items-center justify-center gap-0.5"
          style={{ boxShadow: '0 2px 10px rgba(0,0,0,0.3)' }}
        >
          <ChevronLeft className="w-4 h-4" style={{ color: P_DARK }} strokeWidth={3} />
          <ChevronRight className="w-4 h-4" style={{ color: P_DARK }} strokeWidth={3} />
        </div>
      </div>
    </div>
  )
}

function Card({ children, className = '', tinted = false }) {
  return (
    <div
      className={`rounded-2xl border ${className}`}
      style={tinted
        ? { borderColor: '#FFB3DD', background: '#FFF5FA' }
        : { borderColor: '#f0eeec', background: '#fff', boxShadow: '0 1px 3px rgba(23,23,23,0.04)' }}
    >
      {children}
    </div>
  )
}

export default function ResultsCabello({ pricingPlan = 'natglow' }) {
  const planConfig = PRICING_PLANS[pricingPlan] ?? PRICING_PLANS.natglow
  const { plan_key } = planConfig
  const { state } = useLocation()
  const navigate = useNavigate()

  // Answers: navigation state first, then the key the quiz writes on completion
  // (so a refresh keeps the result).
  const storedAnswers = (() => {
    try { return JSON.parse(sessionStorage.getItem(`glow_results_answers_${STORE}`) ?? '') } catch { return null }
  })()
  const answers = state?.answers ?? storedAnswers

  // quiz_cabello_results_viewed — once per attempt (survives a refresh).
  useEffect(() => {
    if (!answers) return
    const attemptId = getFunnelSessionId()
    const key = `cabello_results_viewed_${attemptId}`
    try {
      if (sessionStorage.getItem(key)) return
      sessionStorage.setItem(key, '1')
    } catch { /* storage blocked — fall through and fire once per mount */ }
    trackFunnelEvent('quiz_cabello_results_viewed', null, plan_key)
  }, [answers, plan_key])

  // ViewContent only. No Lead here (this funnel fires none) and no
  // InitiateCheckout on the CTA — Hotmart's pixel raises that on its own
  // checkout page, so firing it here would double-count.
  useEffect(() => {
    if (!answers) return
    Promise.all([initFacebookPixel(), initTikTokPixel()]).then(() => {
      trackFbEvent('ViewContent', { content_name: 'results_cabello', content_category: plan_key })
      trackTtEvent('ViewContent', { content_name: 'results_cabello', content_category: plan_key, content_id: plan_key, content_type: 'product' })
    })
  }, [answers, plan_key])

  // No answers (direct access) → back to the quiz.
  if (!answers) return <Navigate to="/quiz-cabello" replace />

  // CTA → this funnel's own offer, preserving the URL params the project uses
  // (country / UTMs / fbclid all travel in window.location.search; the attempt
  // id lives in sessionStorage and is read again on the offer).
  const goToOffer = () => {
    const attemptId = getFunnelSessionId()
    const key = `cabello_results_cta_${attemptId}`
    let alreadySent = false
    try { alreadySent = !!sessionStorage.getItem(key) } catch { /* ignore */ }
    if (!alreadySent) {
      try { sessionStorage.setItem(key, '1') } catch { /* ignore */ }
      trackFunnelEvent('quiz_cabello_results_cta_clicked', { source: 'results_cabello' }, plan_key)
    }
    navigate(`/offer-cabello${window.location.search}`, { state: { answers } })
  }

  const name = displayName(answers)
  const rows = getAnswerRows(answers)

  return (
    <div className="min-h-screen" style={{ background: BG, fontFamily: 'system-ui, sans-serif' }}>
      <div className="mx-auto w-full px-4 pt-6 pb-12 flex flex-col gap-10" style={{ maxWidth: 560 }}>

        {/* ═══ 1 · HEADER ═══ */}
        <section className="flex flex-col gap-4">
          <span className="self-center inline-flex items-center px-3 py-1 rounded-full text-white text-[10px] font-extrabold tracking-wider" style={{ background: P }}>
            ✅ EVALUACIÓN COMPLETADA
          </span>

          <h1 className="text-[26px] font-extrabold text-stone-900 leading-snug text-center">
            {name ? `${name}, encontramos ` : 'Encontramos '}
            <HL>3 recetas caseras</HL>
            {' que pueden encajar con tus principales objetivos 😲'}
          </h1>
          <p className="text-[15px] text-stone-500 leading-relaxed text-center">
            Tomamos en cuenta lo que nos contaste sobre tu tipo de cabello, tono, hábitos y objetivos para mostrarte un punto de partida sencillo.
          </p>

          {/* Answer table — what the person actually told us, labelled, so the
              result reads as built from real answers. Shared with the quiz's
              analysis screen so both stay identical. */}
          <div className="mt-1">
            <AnswerTable rows={rows} />
          </div>

          <Card tinted className="p-5 flex flex-col gap-2 mt-1">
            <h2 className="text-base font-extrabold" style={{ color: P_DARK }}>🌿 Tu punto de partida</h2>
            <p className="text-sm text-stone-700 leading-relaxed">{getStartingPointText(answers)}</p>
          </Card>
        </section>

        {/* ═══ 2 · THE 3 LOCKED RECIPES ═══ */}
        <section className="flex flex-col gap-3">
            <div className="text-center flex flex-col gap-2">
              <h2 className="text-xl font-extrabold text-stone-900 leading-snug">
                {name ? `${name}, estas 3 recetas caseras ` : 'Estas 3 recetas caseras '}
                las seleccionamos <HL>especialmente para ti</HL>
              </h2>
              <p className="text-sm text-stone-600 leading-relaxed">
                Normalmente encontramos solo una receta compatible por persona. Según tus respuestas, en tu caso hay <span className="font-bold" style={{ color: P_DARK }}>3 recetas compatibles</span>. Puedes empezar por la que prefieras o probar cuál se adapta mejor a tu cabello.
              </p>
              <p className="text-xs text-stone-400 leading-relaxed">
                Los ingredientes, cantidades, preparación y frecuencia se desbloquean dentro de NatGlow.
              </p>
            </div>

            <LockedRecipeCards answers={answers} />
        </section>

        {/* ═══ 3 · HABITS FOUND IN THE ANSWERS ═══ */}
        <section className="flex flex-col gap-3">
          <div className="text-center flex flex-col gap-1.5">
            <h2 className="text-xl font-extrabold text-stone-900">
              Encontramos algunos <HL>hábitos</HL> en tus respuestas que pueden estar afectando tu cabello
            </h2>
            <p className="text-sm text-stone-500 leading-relaxed">
              Son pequeños ajustes en tu rutina que, según tus respuestas, podrían ayudarte a acercarte a tus objetivos. Los verás detallados dentro de NatGlow.
            </p>
          </div>
          <LockedHabitsCard answers={answers} />
        </section>

        {/* ═══ 4 · WHY START WITH THREE ═══ */}
        <section className="flex flex-col gap-3">
          <h2 className="text-xl font-extrabold text-stone-900 text-center">¿Por qué comenzar por las recetas que elegimos para ti?</h2>
          <Card className="p-5">
            <div className="flex flex-col gap-3">
              {[
                'Pueden ser las recetas más compatibles con tu cabello en su situación actual.',
                'Evita probar demasiadas cosas al mismo tiempo.',
                'Facilita entender qué cuidado estás utilizando.',
                'Hace que la rutina sea más sencilla de mantener.',
                'Después podrás consultar la biblioteca completa con 26 recetas.',
              ].map((text, i) => (
                <div key={i} className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5" style={{ background: P }} aria-hidden>
                    <svg viewBox="0 0 20 20" fill="none" className="w-3 h-3">
                      <path d="M4 10.5l4 4 8-9" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </span>
                  <p className="text-sm text-stone-600 leading-snug">{text}</p>
                </div>
              ))}
            </div>
          </Card>
        </section>

        {/* ═══ 5 · BEFORE / AFTER COMPARISON ═══ */}
        <section className="flex flex-col gap-3">
          <div className="text-center flex flex-col gap-1.5">
            <h2 className="text-xl font-extrabold text-stone-900">
              Lo que una <HL>rutina constante</HL> puede cambiar
            </h2>
            <p className="text-sm text-stone-500 leading-relaxed">
              Arrastra la barra para comparar. Experiencia individual: los resultados pueden variar.
            </p>
          </div>
          <BeforeAfterSlider
            beforeUrl={`${IMG_NATGLOW}/foto-a-1.webp`}
            afterUrl={`${IMG_NATGLOW}/foto-b-1.webp`}
          />
        </section>

        {/* ═══ 6 · CTA TO THE OFFER ═══ */}
        <Card tinted className="p-5 flex flex-col items-center gap-3 text-center">
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-white text-[10px] font-extrabold tracking-wider" style={{ background: P }}>
            ✨ TUS 3 RECETAS ESTÁN LISTAS
          </span>
          <h2 className="text-xl font-extrabold text-stone-900 leading-snug">
            {name ? `${name}, ya puedes ver las ` : 'Ya puedes ver las '}
            <HL>recetas completas</HL>
            {' y todo lo que incluye NatGlow'}
          </h2>
          <p className="text-sm text-stone-700 leading-relaxed">
            En la siguiente página podrás conocer el contenido de tu acceso, las herramientas disponibles y cómo desbloquear las recetas.
          </p>
          <PinkButton onClick={goToOffer}>
            QUIERO MI RUTINA COMPLETA <ArrowRight className="w-4 h-4" />
          </PinkButton>
          <p className="text-xs text-stone-400 font-medium">
            Pago único · Sin mensualidades · Acceso desde el celular
          </p>
        </Card>
      </div>
    </div>
  )
}
