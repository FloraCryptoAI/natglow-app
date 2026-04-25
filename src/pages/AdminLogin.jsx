import React, { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, Loader2, Lock, Mail, Shield, RotateCcw } from 'lucide-react'
import { supabase } from '@/api/supabaseClient'
import { useAdminAuth } from '@/lib/AdminAuthContext'

export default function AdminLogin() {
  const navigate = useNavigate()
  const { isAdmin, setAdminToken } = useAdminAuth()
  const [step, setStep] = useState(1)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [otp, setOtp] = useState(['', '', '', '', '', ''])
  const [sessionId, setSessionId] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const otpRefs = useRef([])

  useEffect(() => {
    if (isAdmin) navigate('/admin', { replace: true })
  }, [isAdmin, navigate])

  // Noindex — página não deve ser indexada
  useEffect(() => {
    const meta = document.createElement('meta')
    meta.name = 'robots'
    meta.content = 'noindex, nofollow'
    document.head.appendChild(meta)
    return () => document.head.removeChild(meta)
  }, [])

  const handleStep1 = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      const { data, error: fnErr } = await supabase.functions.invoke('admin-auth-step1', {
        body: { email: email.trim().toLowerCase(), password },
      })
      // supabase-js v2: data contém o body mesmo em respostas não-2xx
      const msg = data?.error ?? (fnErr?.message?.includes('non-2xx') ? null : fnErr?.message)
      if (msg) throw new Error(msg)
      if (!data?.sessionId) throw new Error('Credenciais inválidas')
      setSessionId(data.sessionId)
      setStep(2)
      setTimeout(() => otpRefs.current[0]?.focus(), 100)
    } catch (err) {
      setError(err.message || 'Credenciais inválidas')
    } finally {
      setLoading(false)
    }
  }

  const handleOtpChange = (index, value) => {
    if (!/^\d*$/.test(value)) return
    const next = [...otp]
    next[index] = value.slice(-1)
    setOtp(next)
    if (value && index < 5) otpRefs.current[index + 1]?.focus()
  }

  const handleOtpKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      otpRefs.current[index - 1]?.focus()
    }
  }

  const handleOtpPaste = (e) => {
    e.preventDefault()
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
    const next = [...otp]
    for (let i = 0; i < 6; i++) next[i] = pasted[i] ?? ''
    setOtp(next)
    otpRefs.current[Math.min(pasted.length, 5)]?.focus()
  }

  const handleStep2 = async (e) => {
    e.preventDefault()
    const code = otp.join('')
    if (code.length !== 6) return
    setLoading(true)
    setError(null)
    try {
      const { data, error: fnErr } = await supabase.functions.invoke('admin-auth-step2', {
        body: { sessionId, otp: code },
      })
      const msg = data?.error ?? (fnErr?.message?.includes('non-2xx') ? null : fnErr?.message)
      if (msg) throw new Error(msg)
      if (!data?.token) throw new Error('Código inválido')
      setAdminToken(data.token)
      navigate('/admin', { replace: true })
    } catch (err) {
      const msg = err.message || 'Código inválido'
      setError(msg)
      if (msg.includes('Reinicie')) resetFlow()
    } finally {
      setLoading(false)
    }
  }

  const resetFlow = () => {
    setStep(1)
    setOtp(['', '', '', '', '', ''])
    setSessionId(null)
    setError(null)
    setPassword('')
  }

  const otpFilled = otp.join('').length === 6

  return (
    <div className="min-h-screen bg-stone-50 flex flex-col" style={{ fontFamily: 'system-ui, sans-serif' }}>
      <style>{`
        .abtn { background: linear-gradient(135deg,#FB45A9,#E03594); color:#fff; border-radius:9999px; font-weight:700; transition:all .2s; }
        .abtn:hover:not(:disabled) { opacity:.9; box-shadow:0 8px 24px rgba(251,69,169,.35); transform:scale(1.02); }
        .abtn:disabled { opacity:.65; cursor:not-allowed; }
        .otp-box { width:46px; height:54px; border:2px solid #e7e5e4; border-radius:12px; text-align:center; font-size:22px; font-weight:800; color:#1c1917; outline:none; background:#fff; transition:border-color .15s; -webkit-text-security:none; }
        .otp-box:focus { border-color:#FB45A9; }
      `}</style>

      <header className="bg-white/90 backdrop-blur border-b border-stone-200/60">
        <div className="max-w-lg mx-auto px-4 h-14 flex items-center gap-2">
          <img src="/logo.png" alt="NatGlow" className="w-9 h-9 rounded-xl" />
          <span className="font-bold text-stone-800 text-sm">NatGlow</span>
        </div>
      </header>

      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-sm">
          <div className="bg-white rounded-2xl border border-stone-100 shadow-sm p-8 flex flex-col gap-5">

            <div className="text-center">
              <div className="w-12 h-12 bg-stone-900 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Shield className="w-6 h-6 text-white" />
              </div>
              <h1 className="text-2xl font-extrabold text-stone-900 mb-1">
                {step === 1 ? 'Acesso Admin' : 'Verificação'}
              </h1>
              <p className="text-stone-500 text-sm">
                {step === 1
                  ? 'Painel administrativo — acesso restrito'
                  : 'Digite o código de 6 dígitos enviado ao email do admin'}
              </p>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-100 rounded-xl px-4 py-3 text-center">
                <p className="text-red-600 text-sm font-medium">{error}</p>
              </div>
            )}

            {step === 1 ? (
              <form onSubmit={handleStep1} className="flex flex-col gap-3">
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
                  <input
                    type="email"
                    required
                    placeholder="Email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    autoComplete="username"
                    className="w-full border-2 border-stone-200 rounded-2xl pl-10 pr-4 py-3.5 text-stone-800 outline-none focus:border-pink-400 transition-colors text-sm"
                  />
                </div>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
                  <input
                    type="password"
                    required
                    placeholder="Senha"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="current-password"
                    className="w-full border-2 border-stone-200 rounded-2xl pl-10 pr-4 py-3.5 text-stone-800 outline-none focus:border-pink-400 transition-colors text-sm"
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading || !email.trim() || !password}
                  className="abtn py-4 text-base flex items-center justify-center gap-2"
                >
                  {loading
                    ? <><Loader2 className="w-4 h-4 animate-spin" /> Verificando...</>
                    : <>Continuar <ArrowRight className="w-4 h-4" /></>}
                </button>
              </form>
            ) : (
              <form onSubmit={handleStep2} className="flex flex-col gap-5">
                <div className="flex gap-2 justify-center" onPaste={handleOtpPaste}>
                  {otp.map((digit, i) => (
                    <input
                      key={i}
                      ref={(el) => (otpRefs.current[i] = el)}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => handleOtpChange(i, e.target.value)}
                      onKeyDown={(e) => handleOtpKeyDown(i, e)}
                      autoComplete="off"
                      className="otp-box"
                      placeholder="·"
                    />
                  ))}
                </div>

                <button
                  type="submit"
                  disabled={loading || !otpFilled}
                  className="abtn py-4 text-base flex items-center justify-center gap-2"
                >
                  {loading
                    ? <><Loader2 className="w-4 h-4 animate-spin" /> Verificando...</>
                    : <>Entrar <ArrowRight className="w-4 h-4" /></>}
                </button>

                <button
                  type="button"
                  onClick={resetFlow}
                  className="flex items-center justify-center gap-2 text-sm text-stone-400 hover:text-stone-600 transition-colors"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Reiniciar login
                </button>
              </form>
            )}

            {/* Indicador de etapa */}
            <div className="flex justify-center gap-2">
              {[1, 2].map((n) => (
                <div
                  key={n}
                  className={`h-1.5 rounded-full transition-all ${
                    step >= n ? 'bg-pink-400 w-8' : 'bg-stone-200 w-4'
                  }`}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
