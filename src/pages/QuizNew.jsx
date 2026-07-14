import React, { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'

import { captureAttribution, getAttribution } from '@/lib/tracking/attribution'
import { captureCountry, getCountryOffer } from '@/config/countryOffers'
import { FLOW, QUESTIONS } from '@/lib/quiz-new/quizNewQuestions'
import { NEW_QUIZ_RESULTS_ROUTE } from '@/lib/quiz-new/quizNewRoutes'
import {
  loadSession, startNewAttempt, setStep, setAnswer, toggleMulti, setName,
  markCompleted,
} from '@/lib/quiz-new/quizNewStorage'
import { post, postOnce } from '@/lib/quiz-new/quizNewAnalytics'

import { Shell, slide } from '@/components/quiz-new/ui'
import QuizNewProgress from '@/components/quiz-new/QuizNewProgress'
import QuizNewLanding from '@/components/quiz-new/QuizNewLanding'
import QuizNewSingleChoice from '@/components/quiz-new/QuizNewSingleChoice'
import QuizNewMultiChoice from '@/components/quiz-new/QuizNewMultiChoice'
import QuizNewEducation from '@/components/quiz-new/QuizNewEducation'
import QuizNewName from '@/components/quiz-new/QuizNewName'
import QuizNewLoading from '@/components/quiz-new/QuizNewLoading'

// Fire the per-step "viewed" event (deduped) when entering a flow step.
function fireViewed(session, phaseIndex) {
  const entry = FLOW[phaseIndex]
  if (!entry) return session
  if (entry.kind === 'question') {
    return postOnce(session, `sv_${entry.key}`, 'quiz_new_step_viewed', { step: entry.questionIndex, step_key: entry.key })
  }
  if (entry.kind === 'education') {
    return postOnce(session, `ev_${entry.eduKey}`, 'quiz_new_education_viewed', { step_key: entry.eduKey })
  }
  return session
}

// The bar fill = the questionIndex of the current (or most recent) question.
function fillIndexFor(phaseIndex) {
  let fill = 0
  for (let i = 0; i <= phaseIndex && i < FLOW.length; i++) {
    if (FLOW[i]?.kind === 'question') fill = FLOW[i].questionIndex
  }
  return fill
}

export default function QuizNew() {
  const navigate = useNavigate()
  // Resume synchronously from storage (avoids a landing flash on mid-quiz refresh).
  const initRef = useRef(null)
  if (initRef.current === null) {
    const s = loadSession()
    const resume = s && !s.completedAt
    initRef.current = {
      session: resume ? s : null,
      phase: resume ? (typeof s.currentStep === 'number' ? s.currentStep : 0) : 'landing',
    }
  }
  const [session, setSession] = useState(initRef.current.session)
  const [phase, setPhase] = useState(initRef.current.phase)   // 'landing' | number (FLOW index)
  const advancingRef = useRef(false)
  const landingFiredRef = useRef(false)

  // Mount: capture attribution/country + fire landing_view once.
  useEffect(() => {
    captureAttribution()
    captureCountry()
    if (!landingFiredRef.current) {
      landingFiredRef.current = true
      const a = getAttribution() ?? {}
      let country; try { country = getCountryOffer().code } catch { country = null }
      // ephemeral landing id (no stored attempt yet — attempt is minted on start)
      post('quiz_new_landing_view', { attemptId: crypto.randomUUID(), country,
        utmSource: a.utm_source, utmMedium: a.utm_medium, utmCampaign: a.utm_campaign,
        utmContent: a.utm_content, utmTerm: a.utm_term, fbclid: a.fbclid })
    }
  }, [])

  useEffect(() => { window.scrollTo(0, 0) }, [phase])

  const goToResults = () => navigate(NEW_QUIZ_RESULTS_ROUTE + window.location.search)

  const handleStart = () => {
    let s = startNewAttempt()
    s = postOnce(s, 'started', 'quiz_new_started')
    s = setStep(s, 0)
    s = fireViewed(s, 0)
    setSession(s)
    setPhase(0)
  }

  const advance = (fromSession, nextPhase) => {
    advancingRef.current = false
    let s = setStep(fromSession, nextPhase)
    s = fireViewed(s, nextPhase)
    setSession(s)
    setPhase(nextPhase)
  }

  const goBack = () => {
    if (typeof phase !== 'number' || phase <= 0) return
    const prev = phase - 1
    const s = setStep(session, prev)
    setSession(s)
    setPhase(prev)
  }

  const entry = typeof phase === 'number' ? FLOW[phase] : null

  // ── Handlers per step kind ────────────────────────────────────────────────
  const handleSinglePick = (q, value) => {
    if (advancingRef.current) return
    let s = setAnswer(session, q.field, value)
    post('quiz_new_step_answered', s, { step: entry.questionIndex, step_key: entry.key })
    setSession(s)
    advancingRef.current = true
    setTimeout(() => advance(s, phase + 1), 250)
  }

  const handleMultiToggle = (q, value) => {
    setSession(toggleMulti(session, q.field, value, q.options))
  }

  const handleMultiContinue = (q) => {
    post('quiz_new_step_answered', session, { step: entry.questionIndex, step_key: entry.key })
    advance(session, phase + 1)
  }

  const handleEducationContinue = () => advance(session, phase + 1)

  const handleNameChange = (name) => setSession(setName(session, name))

  const handleNameSubmit = () => {
    let s = markCompleted(session)
    s = postOnce(s, 'completed', 'quiz_new_completed')
    setSession(s)
    advance(s, phase + 1)   // → loading
  }

  // ── Render ────────────────────────────────────────────────────────────────
  if (phase === 'landing' || !session) {
    return <QuizNewLanding onStart={handleStart} />
  }

  const isQuestion = entry?.kind === 'question'
  const isEducation = entry?.kind === 'education'
  const canGoBack = typeof phase === 'number' && phase > 0 && entry?.kind !== 'loading'

  return (
    <Shell>
      {/* Progress: questions show "PASO X DE 12"; education shows the tag; name/loading hidden */}
      {(isQuestion || isEducation) && (
        <QuizNewProgress
          fillIndex={fillIndexFor(phase)}
          questionIndex={isQuestion ? entry.questionIndex : undefined}
          badge={isEducation ? (entry.eduKey === 'edu3' ? 'TU GUÍA ESTÁ TOMANDO FORMA' : 'INFORMACIÓN ÚTIL') : undefined}
          onBack={canGoBack ? goBack : null}
        />
      )}

      <AnimatePresence mode="wait">
        <motion.div key={String(phase)} {...slide}>
          {isQuestion && QUESTIONS[entry.key].type === 'single' && (
            <QuizNewSingleChoice
              question={QUESTIONS[entry.key]}
              value={session.answers[QUESTIONS[entry.key].field]}
              onPick={(v) => handleSinglePick(QUESTIONS[entry.key], v)}
            />
          )}

          {isQuestion && QUESTIONS[entry.key].type === 'multi' && (
            <QuizNewMultiChoice
              question={QUESTIONS[entry.key]}
              values={session.answers[QUESTIONS[entry.key].field]}
              onToggle={(v) => handleMultiToggle(QUESTIONS[entry.key], v)}
              onContinue={() => handleMultiContinue(QUESTIONS[entry.key])}
            />
          )}

          {isEducation && (
            <QuizNewEducation eduKey={entry.eduKey} answers={session.answers} onContinue={handleEducationContinue} />
          )}

          {entry?.kind === 'name' && (
            <QuizNewName value={session.answers.name} onChange={handleNameChange} onSubmit={handleNameSubmit} />
          )}

          {entry?.kind === 'loading' && (
            <QuizNewLoading answers={session.answers} onDone={goToResults} />
          )}
        </motion.div>
      </AnimatePresence>
    </Shell>
  )
}
