import React, { useEffect, useRef, useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'

import { loadSession, isValidCompleted } from '@/lib/quiz-new/quizNewStorage'
import { postOnce } from '@/lib/quiz-new/quizNewAnalytics'
import { NEW_QUIZ_ROUTE, buildOfferUrl, preservedSearch } from '@/lib/quiz-new/quizNewRoutes'
import { trackFbEvent } from '@/lib/tracking/facebook-pixel'
import { trackTtEvent } from '@/lib/tracking/tiktok-pixel'

import { Shell, PrimaryButton, Footer } from '@/components/quiz-new/ui'
import { COPY } from '@/lib/quiz-new/quizNewCopy'
import ResultHeader from '@/components/quiz-new/results/ResultHeader'
import ResultProfileSummary from '@/components/quiz-new/results/ResultProfileSummary'
import ResultObservations from '@/components/quiz-new/results/ResultObservations'
import ResultStartingPoint from '@/components/quiz-new/results/ResultStartingPoint'
import ResultMiniPlan from '@/components/quiz-new/results/ResultMiniPlan'
import ResultPreparedContent from '@/components/quiz-new/results/ResultPreparedContent'
import ResultCTA from '@/components/quiz-new/results/ResultCTA'

export default function QuizNewResults() {
  const navigate = useNavigate()
  const initial = loadSession()
  const [session, setSession] = useState(initial)
  const [showSticky, setShowSticky] = useState(false)
  const ctaFiredRef = useRef(false)

  const valid = isValidCompleted(session)
  const viewedRef = useRef(false)

  // results_viewed once per attempt (only on the results page mount, not loading).
  useEffect(() => {
    if (!valid || viewedRef.current) return
    viewedRef.current = true
    setSession(postOnce(loadSession(), 'results_viewed', 'quiz_new_results_viewed'))
    // Optional pixel ViewContent (no PII — only aggregate content name/category).
    try {
      trackFbEvent('ViewContent', { content_name: 'quiz_new_results', content_category: session?.country ?? 'intl' })
      trackTtEvent('ViewContent', { content_name: 'quiz_new_results', content_id: 'quiz_new', content_type: 'product' })
    } catch { /* non-fatal */ }
  }, [valid]) // eslint-disable-line react-hooks/exhaustive-deps

  // Sticky CTA appears only after the user scrolls part of the page.
  useEffect(() => {
    const onScroll = () => setShowSticky(window.scrollY > 480)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  if (!valid) return <Navigate to={NEW_QUIZ_ROUTE + preservedSearch()} replace />

  const handleCta = () => {
    // Count the CTA once per attempt even across multiple clicks.
    if (!ctaFiredRef.current) {
      ctaFiredRef.current = true
      setSession(postOnce(loadSession(), 'results_cta_clicked', 'quiz_new_results_cta_clicked'))
    }
    // Bridge to the CURRENT offer, forwarding country / UTMs / fbclid / attempt id.
    navigate(buildOfferUrl(session), { state: { answers: session.answers } })
  }

  const answers = session.answers

  return (
    <>
      <Shell>
        <div className="flex flex-col gap-8 pt-2">
          <ResultHeader answers={answers} />
          <ResultProfileSummary answers={answers} />
          <ResultObservations answers={answers} />
          <ResultStartingPoint answers={answers} />
          <ResultMiniPlan />
          <ResultPreparedContent answers={answers} />
          <ResultCTA onCta={handleCta} />
          <Footer />
        </div>
      </Shell>

      {/* Discreet fixed CTA — only after scrolling */}
      {showSticky && (
        <div className="fixed bottom-0 left-0 right-0 z-40 px-4 pb-3 pt-2"
             style={{ background: 'linear-gradient(to top, rgba(255,254,251,0.98), rgba(255,254,251,0))' }}>
          <div className="mx-auto w-full" style={{ maxWidth: 560 }}>
            <PrimaryButton onClick={handleCta} ariaLabel="Ver el plan que preparamos">
              {COPY.results.ctaButton}
            </PrimaryButton>
          </div>
        </div>
      )}
    </>
  )
}
