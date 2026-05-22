import React, { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import { ArrowRight, Loader2, Mail, KeyRound, ChevronLeft, Lock } from 'lucide-react'
import LegalLine from '@/components/LegalLine'
import { useTranslation } from 'react-i18next'
import { useAuth } from '@/lib/AuthContext'
import { supabase } from '@/api/supabaseClient'

const RESEND_COOLDOWN = 30 // seconds

// ── Helpers ────────────────────────────────────────────────────────────────

function Banner({ type, children }) {
  const base = 'rounded-xl px-4 py-3 text-sm leading-relaxed'
  const styles = {
    yellow: `${base} bg-amber-50 border border-amber-200 text-amber-800`,
    red:    `${base} bg-red-50   border border-red-100   text-red-700`,
    green:  `${base} bg-emerald-50 border border-emerald-200 text-emerald-800`,
  }
  return <div className={styles[type] ?? styles.red}>{children}</div>
}

// ── Code input (6 individual boxes) ────────────────────────────────────────

function CodeInput({ value, onChange, disabled }) {
  const refs = useRef([])

  const digits = value.split('').concat(Array(6).fill('')).slice(0, 6)

  function handleKey(e, i) {
    if (e.key === 'Backspace') {
      if (digits[i]) {
        const next = [...digits]
        next[i] = ''
        onChange(next.join(''))
      } else if (i > 0) {
        refs.current[i - 1]?.focus()
      }
    }
  }

  function handleChange(e, i) {
    const raw = e.target.value.replace(/\D/g, '')
    if (!raw) return
    const next = [...digits]
    next[i] = raw[raw.length - 1]
    const joined = next.join('')
    onChange(joined)
    if (i < 5 && raw) refs.current[i + 1]?.focus()
  }

  function handlePaste(e) {
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
    if (pasted.length > 0) {
      onChange(pasted.padEnd(6, '').slice(0, 6).replace(/ /g, ''))
      refs.current[Math.min(pasted.length, 5)]?.focus()
    }
    e.preventDefault()
  }

  return (
    <div className="flex gap-2 justify-center">
      {digits.map((d, i) => (
        <input
          key={i}
          ref={el => { refs.current[i] = el }}
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={1}
          value={d}
          disabled={disabled}
          onChange={e => handleChange(e, i)}
          onKeyDown={e => handleKey(e, i)}
          onPaste={handlePaste}
          className="w-11 h-14 text-center text-xl font-extrabold border-2 border-stone-200 rounded-xl outline-none focus:border-pink-400 transition-colors text-stone-800 disabled:opacity-50 disabled:cursor-not-allowed"
          style={{ caretColor: 'transparent' }}
        />
      ))}
    </div>
  )
}

// ── Resend button with cooldown ─────────────────────────────────────────────

function ResendButton({ onResend, loading, label, cooldownLabel }) {
  const [secs, setSecs] = useState(RESEND_COOLDOWN)

  useEffect(() => {
    if (secs <= 0) return
    const t = setInterval(() => setSecs(s => Math.max(0, s - 1)), 1000)
    return () => clearInterval(t)
  }, [secs])

  function handleClick() {
    setSecs(RESEND_COOLDOWN)
    onResend()
  }

  if (secs > 0) {
    return (
      <p className="text-center text-xs text-stone-400">
        {cooldownLabel.replace('{{s}}', secs)}
      </p>
    )
  }

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      className="text-center text-xs text-pink-600 hover:text-pink-700 font-semibold disabled:opacity-50"
    >
      {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin inline" /> : label}
    </button>
  )
}

// ── Main component ──────────────────────────────────────────────────────────

export default function Login() {
  const { t, i18n } = useTranslation()
  const navigate      = useNavigate()
  const [searchParams] = useSearchParams()
  const { user, isSubscribed, subscriptionLoading } = useAuth()

  const ADMIN_EMAIL = import.meta.env.VITE_ADMIN_EMAIL

  // Query-param state
  const expired     = searchParams.get('expired')     === 'true'
  const invalid     = searchParams.get('invalid')     === 'true'
  const used        = searchParams.get('used')        === 'true'
  const passwordSet = searchParams.get('passwordSet') === 'true'
  const paramEmail  = searchParams.get('email') ?? ''

  // View: 'form' | 'magic-sent' | 'code-input' | 'password-form'
  const [view,         setView]         = useState('form')
  const [email,        setEmail]        = useState(paramEmail)
  const [codeDigits,   setCodeDigits]   = useState('')
  const [loadingML,    setLoadingML]    = useState(false)   // magic link sending
  const [loadingCode,  setLoadingCode]  = useState(false)   // code sending
  const [loadingVerify,setLoadingVerify]= useState(false)   // code verifying
  const [error,        setError]        = useState(null)
  // Password login state
  const [password,     setPassword]     = useState('')
  const [loadingPwd,   setLoadingPwd]   = useState(false)
  const [resetSent,    setResetSent]    = useState(false)

  // Redirect when already logged in
  useEffect(() => {
    if (user && !subscriptionLoading) {
      if (user.email === ADMIN_EMAIL) {
        navigate('/admin', { replace: true })
      } else {
        navigate(isSubscribed ? '/HairDashboard' : '/Upgrade', { replace: true })
      }
    }
  }, [user, isSubscribed, subscriptionLoading, navigate, ADMIN_EMAIL])

  // ── Magic link flow ───────────────────────────────────────────────────────

  const sendMagicLink = useCallback(async () => {
    if (!email.trim()) return
    setLoadingML(true)
    setError(null)
    try {
      const { error: fnErr } = await supabase.functions.invoke('send-magic-link', {
        body: { email: email.trim().toLowerCase(), locale: i18n.language },
      })
      if (fnErr) throw fnErr
      setView('magic-sent')
    } catch (err) {
      setError(err?.message ?? t('login.errorGeneric'))
    } finally {
      setLoadingML(false)
    }
  }, [email, i18n.language, t])

  const handleMagicLink = async (e) => {
    e.preventDefault()
    await sendMagicLink()
  }

  // ── Code flow ─────────────────────────────────────────────────────────────

  const sendCode = useCallback(async () => {
    if (!email.trim()) return
    setLoadingCode(true)
    setError(null)
    try {
      const { data, error: fnErr } = await supabase.functions.invoke('send-login-code', {
        body: { email: email.trim().toLowerCase(), locale: i18n.language },
      })
      if (fnErr) throw fnErr
      if (data?.success === false) throw new Error(t('login.errorGeneric'))
      setView('code-input')
      setCodeDigits('')
    } catch (err) {
      setError(err?.message ?? t('login.errorGeneric'))
    } finally {
      setLoadingCode(false)
    }
  }, [email, i18n.language, t])

  const handleSendCode = async (e) => {
    e.preventDefault()
    await sendCode()
  }

  const handleVerifyCode = async () => {
    if (codeDigits.replace(/\s/g, '').length < 6) return
    setLoadingVerify(true)
    setError(null)
    try {
      const { data, error: fnErr } = await supabase.functions.invoke('verify-login-code', {
        body: { email: email.trim().toLowerCase(), code: codeDigits.slice(0, 6) },
      })
      if (fnErr) throw fnErr

      if (data?.error === 'invalid_or_expired') {
        setError(t('login.invalidOrExpired'))
        return
      }
      if (data?.error === 'too_many_attempts') {
        setError(t('login.tooManyAttempts'))
        return
      }
      if (data?.error === 'invalid_code') {
        const n = data.attempts_remaining ?? 0
        setError(t('login.invalidCode', { n }))
        return
      }
      if (data?.error) {
        setError(t('login.errorGeneric'))
        return
      }

      if (!data?.access_token) throw new Error('No session returned')

      const { error: sessionErr } = await supabase.auth.setSession({
        access_token:  data.access_token,
        refresh_token: data.refresh_token,
      })
      if (sessionErr) throw sessionErr
      // AuthContext onAuthStateChange will fire → useEffect above redirects
    } catch (err) {
      setError(err?.message ?? t('login.errorGeneric'))
    } finally {
      setLoadingVerify(false)
    }
  }

  // ── Password login flow ───────────────────────────────────────────────────

  const handlePasswordLogin = async (e) => {
    e.preventDefault()
    if (password.length < 8) { setError(t('login.passwordTooShort')); return }
    setLoadingPwd(true)
    setError(null)
    try {
      const { error: authErr } = await supabase.auth.signInWithPassword({
        email:    email.trim().toLowerCase(),
        password,
      })
      if (authErr) throw authErr
      // AuthContext onAuthStateChange fires → useEffect above redirects
    } catch (err) {
      const msg = (err?.message ?? '').toLowerCase()
      if (msg.includes('invalid') || msg.includes('credentials') || msg.includes('wrong')) {
        setError(t('login.invalidCredentials'))
      } else {
        setError(err?.message || t('login.errorGeneric'))
      }
    } finally {
      setLoadingPwd(false)
    }
  }

  const handleForgotPassword = async () => {
    if (!email.trim()) { setError(t('login.noEmailForReset')); return }
    setLoadingPwd(true)
    setError(null)
    try {
      const { error: authErr } = await supabase.auth.resetPasswordForEmail(
        email.trim().toLowerCase(),
        { redirectTo: `${window.location.origin}/reset-password` },
      )
      if (authErr) throw authErr
      setResetSent(true)
    } catch (err) {
      setError(err?.message ?? t('login.errorGeneric'))
    } finally {
      setLoadingPwd(false)
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────

  const emailTrimmed = email.trim()

  return (
    <div className="min-h-screen bg-stone-50 flex flex-col" style={{ fontFamily: 'system-ui, sans-serif' }}>
      <style>{`
        .btn-primary { background:linear-gradient(135deg,#FB45A9,#E03594); color:#fff; border-radius:9999px; font-weight:700; transition:all .2s; }
        .btn-primary:hover:not(:disabled) { opacity:.9; box-shadow:0 8px 24px rgba(251,69,169,.35); transform:scale(1.02); }
        .btn-primary:disabled { opacity:.7; cursor:not-allowed; }
        .btn-outline { background:#fff; color:#374151; border:2px solid #e7e5e4; border-radius:9999px; font-weight:600; transition:all .2s; }
        .btn-outline:hover:not(:disabled) { border-color:#FB45A9; background:#FFF5FA; }
        .btn-outline:disabled { opacity:.7; cursor:not-allowed; }
      `}</style>

      {/* Header */}
      <header className="bg-white/90 backdrop-blur border-b border-stone-200/60">
        <div className="max-w-lg mx-auto px-4 h-14 flex items-center gap-2">
          <Link to="/Landing" className="flex items-center gap-2">
            <img src="/logo.png" alt="NatGlow" className="w-9 h-9 rounded-xl" />
            <span className="font-bold text-stone-800 text-sm">NatGlow</span>
          </Link>
        </div>
      </header>

      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-sm">

          {/* ── VIEW: Email form ── */}
          {view === 'form' && (
            <div className="bg-white rounded-2xl border border-stone-100 shadow-sm p-8 flex flex-col gap-5">

              {/* Error / info banners from query params */}
              {passwordSet && (
                <Banner type="green">
                  {t('login.passwordSet')}
                </Banner>
              )}
              {expired && (
                <Banner type="yellow">
                  {t('login.expiredBanner')}
                </Banner>
              )}
              {invalid && (
                <Banner type="red">
                  {t('login.invalidBanner')}
                </Banner>
              )}
              {used && (
                <Banner type="yellow">
                  {t('login.usedBanner')}
                </Banner>
              )}

              <div className="text-center">
                <h1 className="text-2xl font-extrabold text-stone-900 mb-1">{t('login.title')}</h1>
                <p className="text-stone-500 text-sm">{t('login.subtitle')}</p>
              </div>

              {error && <Banner type="red">{error}</Banner>}

              {/* Email input */}
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
                <input
                  type="email"
                  required
                  placeholder={t('login.placeholder')}
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="w-full border-2 border-stone-200 rounded-2xl pl-10 pr-4 py-3.5 text-stone-800 outline-none focus:border-pink-400 transition-colors text-sm"
                />
              </div>

              {/* Primary button — swaps when link is expired */}
              {!expired ? (
                <>
                  <form onSubmit={handleMagicLink}>
                    <button
                      type="submit"
                      disabled={loadingML || !emailTrimmed}
                      className="btn-primary w-full py-4 text-sm flex items-center justify-center gap-2"
                    >
                      {loadingML
                        ? <><Loader2 className="w-4 h-4 animate-spin" /> {t('login.sending')}</>
                        : <><Mail className="w-4 h-4" /> {t('login.sendMagicLink')} <ArrowRight className="w-4 h-4" /></>}
                    </button>
                  </form>

                  <div className="flex items-center gap-3">
                    <div className="flex-1 h-px bg-stone-200" />
                    <span className="text-xs text-stone-400">{t('login.or')}</span>
                    <div className="flex-1 h-px bg-stone-200" />
                  </div>

                  <form onSubmit={handleSendCode}>
                    <button
                      type="submit"
                      disabled={loadingCode || !emailTrimmed}
                      className="btn-outline w-full py-3.5 text-sm flex items-center justify-center gap-2"
                    >
                      {loadingCode
                        ? <><Loader2 className="w-4 h-4 animate-spin" /> {t('login.sending')}</>
                        : <><KeyRound className="w-4 h-4" /> {t('login.sendCode')}</>}
                    </button>
                  </form>
                </>
              ) : (
                /* Expired: swap priorities */
                <>
                  <form onSubmit={handleSendCode}>
                    <button
                      type="submit"
                      disabled={loadingCode || !emailTrimmed}
                      className="btn-primary w-full py-4 text-sm flex items-center justify-center gap-2"
                    >
                      {loadingCode
                        ? <><Loader2 className="w-4 h-4 animate-spin" /> {t('login.sending')}</>
                        : <><KeyRound className="w-4 h-4" /> {t('login.sendCode')} <ArrowRight className="w-4 h-4" /></>}
                    </button>
                  </form>

                  <div className="flex items-center gap-3">
                    <div className="flex-1 h-px bg-stone-200" />
                    <span className="text-xs text-stone-400">{t('login.or')}</span>
                    <div className="flex-1 h-px bg-stone-200" />
                  </div>

                  <form onSubmit={handleMagicLink}>
                    <button
                      type="submit"
                      disabled={loadingML || !emailTrimmed}
                      className="btn-outline w-full py-3.5 text-sm flex items-center justify-center gap-2"
                    >
                      {loadingML
                        ? <><Loader2 className="w-4 h-4 animate-spin" /> {t('login.sending')}</>
                        : <><Mail className="w-4 h-4" /> {t('login.sendMagicLink')}</>}
                    </button>
                  </form>
                </>
              )}

              <button
                type="button"
                onClick={() => { setView('password-form'); setError(null); setPassword(''); setResetSent(false) }}
                className="flex items-center justify-center gap-1.5 text-xs text-stone-400 hover:text-stone-600 mx-auto"
              >
                <Lock className="w-3 h-3" /> {t('login.withPassword')}
              </button>

              <p className="text-center text-xs text-stone-400">
                {t('login.noAccount')}{' '}
                <Link to="/Landing" className="underline text-stone-600 hover:text-stone-800">
                  {t('login.noAccountLink')}
                </Link>
              </p>
            </div>
          )}

          {/* ── VIEW: Magic link sent ── */}
          {view === 'magic-sent' && (
            <div className="bg-white rounded-2xl border border-stone-100 shadow-sm p-8 flex flex-col gap-5 text-center">
              <div className="w-14 h-14 rounded-full mx-auto flex items-center justify-center" style={{ background: 'linear-gradient(135deg,#FB45A9,#E03594)' }}>
                <Mail className="w-7 h-7 text-white" />
              </div>

              <div>
                <h2 className="text-xl font-extrabold text-stone-900 mb-1">{t('login.magicLinkSent')}</h2>
                <p className="text-sm text-stone-500 leading-relaxed">
                  {t('login.magicLinkSentDesc')}{' '}
                  <strong className="text-stone-700">{email}</strong>
                </p>
              </div>

              <p className="text-xs text-stone-400 leading-relaxed">{t('login.magicLinkSentNote')}</p>

              {error && <Banner type="red">{error}</Banner>}

              <div className="flex flex-col gap-2">
                <ResendButton
                  onResend={sendMagicLink}
                  loading={loadingML}
                  label={t('login.resend')}
                  cooldownLabel={t('login.resendIn')}
                />
                <button
                  onClick={() => { setView('code-input'); setCodeDigits(''); setError(null); sendCode() }}
                  className="text-xs text-stone-500 hover:text-stone-700 underline"
                >
                  {t('login.useCodeInstead')}
                </button>
              </div>

              <button
                onClick={() => { setView('form'); setError(null) }}
                className="flex items-center gap-1 text-xs text-stone-400 hover:text-stone-600 mx-auto"
              >
                <ChevronLeft className="w-3.5 h-3.5" /> {t('login.back')}
              </button>
            </div>
          )}

          {/* ── VIEW: Code input ── */}
          {view === 'code-input' && (
            <div className="bg-white rounded-2xl border border-stone-100 shadow-sm p-8 flex flex-col gap-5">
              <div className="text-center">
                <div className="w-14 h-14 rounded-full mx-auto flex items-center justify-center mb-3" style={{ background: 'linear-gradient(135deg,#FB45A9,#E03594)' }}>
                  <KeyRound className="w-7 h-7 text-white" />
                </div>
                <h2 className="text-xl font-extrabold text-stone-900 mb-1">{t('login.enterCode')}</h2>
                <p className="text-sm text-stone-500">
                  {t('login.enterCodeDesc')}{' '}
                  <strong className="text-stone-700">{email}</strong>
                </p>
              </div>

              {error && <Banner type="red">{error}</Banner>}

              <CodeInput
                value={codeDigits}
                onChange={setCodeDigits}
                disabled={loadingVerify}
              />

              <button
                onClick={handleVerifyCode}
                disabled={loadingVerify || codeDigits.replace(/\s/g, '').length < 6}
                className="btn-primary w-full py-4 text-sm flex items-center justify-center gap-2"
              >
                {loadingVerify
                  ? <><Loader2 className="w-4 h-4 animate-spin" /> {t('login.verifying')}</>
                  : <>{t('login.verify')} <ArrowRight className="w-4 h-4" /></>}
              </button>

              <div className="flex flex-col gap-2 items-center">
                <ResendButton
                  onResend={sendCode}
                  loading={loadingCode}
                  label={t('login.resend')}
                  cooldownLabel={t('login.resendIn')}
                />
                <button
                  onClick={() => { setView('magic-sent'); setError(null); sendMagicLink() }}
                  className="text-xs text-stone-500 hover:text-stone-700 underline"
                >
                  {t('login.useMagicLinkInstead')}
                </button>
              </div>

              <button
                onClick={() => { setView('form'); setError(null) }}
                className="flex items-center gap-1 text-xs text-stone-400 hover:text-stone-600 mx-auto"
              >
                <ChevronLeft className="w-3.5 h-3.5" /> {t('login.back')}
              </button>
            </div>
          )}

          {/* ── VIEW: Password login ── */}
          {view === 'password-form' && (
            <div className="bg-white rounded-2xl border border-stone-100 shadow-sm p-8 flex flex-col gap-5">
              <div className="text-center">
                <div className="w-14 h-14 rounded-full mx-auto flex items-center justify-center mb-3" style={{ background: 'linear-gradient(135deg,#FB45A9,#E03594)' }}>
                  <Lock className="w-7 h-7 text-white" />
                </div>
                <h1 className="text-2xl font-extrabold text-stone-900 mb-1">{t('login.withPasswordTitle')}</h1>
                <p className="text-stone-500 text-sm">{t('login.subtitle')}</p>
              </div>

              {resetSent ? (
                <Banner type="green">{t('login.resetSent', { email: emailTrimmed })}</Banner>
              ) : (
                <>
                  {error && <Banner type="red">{error}</Banner>}

                  <form onSubmit={handlePasswordLogin} className="flex flex-col gap-3">
                    <div className="relative">
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
                      <input
                        type="email"
                        required
                        placeholder={t('login.placeholder')}
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        className="w-full border-2 border-stone-200 rounded-2xl pl-10 pr-4 py-3.5 text-stone-800 outline-none focus:border-pink-400 transition-colors text-sm"
                      />
                    </div>

                    <div className="relative">
                      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
                      <input
                        type="password"
                        required
                        placeholder={t('login.passwordPlaceholder')}
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        className="w-full border-2 border-stone-200 rounded-2xl pl-10 pr-4 py-3.5 text-stone-800 outline-none focus:border-pink-400 transition-colors text-sm"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={loadingPwd || !emailTrimmed || !password}
                      className="btn-primary w-full py-4 text-sm flex items-center justify-center gap-2"
                    >
                      {loadingPwd
                        ? <><Loader2 className="w-4 h-4 animate-spin" /> {t('login.sending')}</>
                        : <><Lock className="w-4 h-4" /> {t('login.withPassword')} <ArrowRight className="w-4 h-4" /></>}
                    </button>
                  </form>

                  <button
                    type="button"
                    onClick={handleForgotPassword}
                    disabled={loadingPwd}
                    className="text-center text-xs text-pink-600 hover:text-pink-700 font-semibold disabled:opacity-50"
                  >
                    {t('login.forgotPassword')}
                  </button>
                </>
              )}

              <button
                onClick={() => { setView('form'); setError(null); setResetSent(false) }}
                className="flex items-center gap-1 text-xs text-stone-400 hover:text-stone-600 mx-auto"
              >
                <ChevronLeft className="w-3.5 h-3.5" /> {t('login.back')}
              </button>
            </div>
          )}

        </div>
      </div>
      <LegalLine />
    </div>
  )
}
