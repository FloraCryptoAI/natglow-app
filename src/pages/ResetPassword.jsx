import React, { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Loader2, Lock, ChevronLeft, CheckCircle } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { supabase } from '@/api/supabaseClient'
import LegalLine from '@/components/LegalLine'

function Banner({ type, children }) {
  const base = 'rounded-xl px-4 py-3 text-sm leading-relaxed'
  const styles = {
    red:   `${base} bg-red-50   border border-red-100   text-red-700`,
    green: `${base} bg-emerald-50 border border-emerald-200 text-emerald-800`,
  }
  return <div className={styles[type] ?? styles.red}>{children}</div>
}

export default function ResetPassword() {
  const { t }      = useTranslation()
  const navigate   = useNavigate()

  // 'loading' while waiting for PASSWORD_RECOVERY event from Supabase
  // 'form'    once the recovery session is confirmed
  // 'success' after password was updated
  // 'invalid' if the link is expired or was never valid
  const [mode,     setMode]     = useState('loading')
  const [password, setPassword] = useState('')
  const [confirm,  setConfirm]  = useState('')
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState(null)

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setMode('form')
      }
    })

    // Fallback timeout: if Supabase never fires PASSWORD_RECOVERY within 5 s,
    // the link is expired or the user navigated here directly without a token.
    const timer = setTimeout(() => {
      setMode(prev => prev === 'loading' ? 'invalid' : prev)
    }, 5000)

    return () => {
      subscription.unsubscribe()
      clearTimeout(timer)
    }
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (password.length < 8) { setError(t('resetPassword.tooShort')); return }
    if (password !== confirm)  { setError(t('resetPassword.mismatch')); return }
    setLoading(true)
    setError(null)
    try {
      const { error: updateErr } = await supabase.auth.updateUser({ password })
      if (updateErr) throw updateErr
      setMode('success')
    } catch (err) {
      setError(err?.message ?? t('resetPassword.errorGeneric'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-stone-50 flex flex-col" style={{ fontFamily: 'system-ui, sans-serif' }}>
      <style>{`
        .btn-primary { background:linear-gradient(135deg,#FB45A9,#E03594); color:#fff; border-radius:9999px; font-weight:700; transition:all .2s; }
        .btn-primary:hover:not(:disabled) { opacity:.9; box-shadow:0 8px 24px rgba(251,69,169,.35); transform:scale(1.02); }
        .btn-primary:disabled { opacity:.7; cursor:not-allowed; }
      `}</style>

      <header className="bg-white/90 backdrop-blur border-b border-stone-200/60">
        <div className="max-w-lg mx-auto px-4 h-14 flex items-center gap-2">
          <Link to="/Login" className="flex items-center gap-2">
            <img src="/logo.png" alt="NatGlow" className="w-9 h-9 rounded-xl" />
            <span className="font-bold text-stone-800 text-sm">NatGlow</span>
          </Link>
        </div>
      </header>

      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-sm">

          {mode === 'loading' && (
            <div className="flex justify-center">
              <Loader2 className="w-8 h-8 animate-spin" style={{ color: '#FB45A9' }} />
            </div>
          )}

          {mode === 'invalid' && (
            <div className="bg-white rounded-2xl border border-stone-100 shadow-sm p-8 flex flex-col gap-5 text-center">
              <Banner type="red">{t('resetPassword.invalidLink')}</Banner>
              <Link
                to="/Login"
                className="flex items-center gap-1 text-xs text-stone-400 hover:text-stone-600 mx-auto"
              >
                <ChevronLeft className="w-3.5 h-3.5" /> {t('resetPassword.backToLogin')}
              </Link>
            </div>
          )}

          {mode === 'form' && (
            <div className="bg-white rounded-2xl border border-stone-100 shadow-sm p-8 flex flex-col gap-5">
              <div className="text-center">
                <div className="w-14 h-14 rounded-full mx-auto flex items-center justify-center mb-3" style={{ background: 'linear-gradient(135deg,#FB45A9,#E03594)' }}>
                  <Lock className="w-7 h-7 text-white" />
                </div>
                <h1 className="text-2xl font-extrabold text-stone-900 mb-1">{t('resetPassword.title')}</h1>
                <p className="text-stone-500 text-sm">{t('resetPassword.subtitle')}</p>
              </div>

              {error && <Banner type="red">{error}</Banner>}

              <form onSubmit={handleSubmit} className="flex flex-col gap-3">
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
                  <input
                    type="password"
                    required
                    placeholder={t('resetPassword.placeholder')}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    className="w-full border-2 border-stone-200 rounded-2xl pl-10 pr-4 py-3.5 text-stone-800 outline-none focus:border-pink-400 transition-colors text-sm"
                  />
                </div>

                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
                  <input
                    type="password"
                    required
                    placeholder={t('resetPassword.confirmPlaceholder')}
                    value={confirm}
                    onChange={e => setConfirm(e.target.value)}
                    className="w-full border-2 border-stone-200 rounded-2xl pl-10 pr-4 py-3.5 text-stone-800 outline-none focus:border-pink-400 transition-colors text-sm"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading || !password || !confirm}
                  className="btn-primary w-full py-4 text-sm flex items-center justify-center gap-2"
                >
                  {loading
                    ? <><Loader2 className="w-4 h-4 animate-spin" /> {t('resetPassword.saving')}</>
                    : t('resetPassword.submit')}
                </button>
              </form>
            </div>
          )}

          {mode === 'success' && (
            <div className="bg-white rounded-2xl border border-stone-100 shadow-sm p-8 flex flex-col gap-5 text-center">
              <div className="w-14 h-14 rounded-full mx-auto flex items-center justify-center" style={{ background: 'linear-gradient(135deg,#FB45A9,#E03594)' }}>
                <CheckCircle className="w-7 h-7 text-white" />
              </div>
              <h2 className="text-xl font-extrabold text-stone-900">{t('resetPassword.success')}</h2>
              <button
                onClick={() => navigate('/Login?passwordSet=true')}
                className="btn-primary w-full py-4 text-sm"
              >
                {t('resetPassword.backToLogin')}
              </button>
            </div>
          )}

        </div>
      </div>
      <LegalLine />
    </div>
  )
}
