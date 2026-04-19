import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { Check, Sparkles, Shield, ArrowRight, Loader2 } from 'lucide-react'
import { useAuth } from '@/lib/AuthContext'
import { supabase } from '@/api/supabaseClient'

const BENEFITS = [
  'Rotina capilar personalizada de 21 dias',
  'Plano progressivo de 4 fases (84+ dias)',
  'Biblioteca com 25 receitas naturais',
  'Filtro por ingrediente e tipo de problema',
  'Acompanhamento de progresso e conquistas',
  'Acesso em qualquer dispositivo',
]

const TESTIMONIALS = [
  { name: 'Ana Paula', text: 'Em 3 semanas meu cabelo parou de quebrar. Não acreditava que seria tão rápido!', stars: 5 },
  { name: 'Camila S.', text: 'As receitas são simples e com ingredientes que já tenho em casa. Adorei!', stars: 5 },
  { name: 'Júlia M.', text: 'Meu frizz diminuiu muito. O plano é muito fácil de seguir.', stars: 5 },
]

export default function Upgrade() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const handleSubscribe = async () => {
    setLoading(true)
    setError(null)
    try {
      const { data, error: fnError } = await supabase.functions.invoke('create-checkout-session', {
        body: {
          priceId: import.meta.env.VITE_STRIPE_PRICE_ID,
          successUrl: window.location.origin + '/success',
          cancelUrl: window.location.origin + '/Upgrade',
        },
      })
      if (fnError) throw fnError
      window.location.href = data.url
    } catch (err) {
      console.error('Checkout error:', err)
      setError(`Erro: ${err?.message ?? JSON.stringify(err)}`)
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-stone-50" style={{ fontFamily: 'system-ui, sans-serif' }}>
      <style>{`
        .btn-primary { background: #FB45A9; color: #fff; border-radius: 9999px; font-weight: 700; transition: all .2s; }
        .btn-primary:hover:not(:disabled) { background: #E03594; box-shadow: 0 8px 24px rgba(251,69,169,.35); transform: scale(1.02); }
        .btn-primary:disabled { opacity: 0.7; cursor: not-allowed; }
      `}</style>

      {/* Header */}
      <header className="bg-white/90 backdrop-blur border-b border-stone-200/60">
        <div className="max-w-lg mx-auto px-4 h-14 flex items-center gap-2">
          <img
            src="/logo.png"
            alt="NatGlow"
            className="w-9 h-9 rounded-xl"
          />
          <span className="font-bold text-stone-800 text-sm">NatGlow</span>
        </div>
      </header>

      <div className="max-w-lg mx-auto px-4 py-10 flex flex-col gap-8">

        {/* Hero */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center"
        >
          <div className="inline-flex items-center gap-2 bg-emerald-50 text-emerald-700 px-4 py-1.5 rounded-full text-xs font-bold mb-4 border border-emerald-200">
            <Sparkles className="w-3.5 h-3.5" /> Seu plano está pronto
          </div>
          <h1 className="text-3xl font-extrabold text-stone-900 leading-tight mb-3">
            Acesse sua rotina capilar completa
          </h1>
          <p className="text-stone-500 text-sm leading-relaxed">
            {user?.user_metadata?.full_name
              ? `${user.user_metadata.full_name.split(' ')[0]}, seu`
              : 'Seu'} plano personalizado está esperando por você.
            Comece sua transformação capilar hoje.
          </p>
        </motion.div>

        {/* Benefits */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-2xl border border-stone-100 shadow-sm p-6"
        >
          <p className="font-bold text-stone-800 mb-4">O que você recebe:</p>
          <ul className="space-y-3">
            {BENEFITS.map((b, i) => (
              <li key={i} className="flex items-center gap-3">
                <div className="w-5 h-5 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0">
                  <Check className="w-3 h-3 text-emerald-600" />
                </div>
                <span className="text-stone-700 text-sm font-medium">{b}</span>
              </li>
            ))}
          </ul>
        </motion.div>

        {/* Pricing card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white rounded-2xl border-2 border-emerald-500 shadow-lg p-6 text-center"
        >
          <p className="text-xs font-bold text-emerald-600 uppercase tracking-wider mb-2">Acesso Completo</p>
          <div className="flex items-baseline justify-center gap-1 mb-1">
            <span className="text-4xl font-extrabold text-stone-900">
              {import.meta.env.VITE_PLAN_PRICE ?? 'R$ 19,90'}
            </span>
            <span className="text-stone-400 text-sm">/mês</span>
          </div>
          <p className="text-xs text-stone-400 mb-6">Cancele quando quiser · Sem fidelidade</p>

          {error && (
            <p className="text-red-500 text-sm mb-4 bg-red-50 rounded-xl px-4 py-2">{error}</p>
          )}

          <button
            onClick={handleSubscribe}
            disabled={loading}
            className="btn-primary w-full py-5 text-lg flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Aguarde...
              </>
            ) : (
              <>
                Assinar agora
                <ArrowRight className="w-5 h-5" />
              </>
            )}
          </button>

          <div className="flex items-center justify-center gap-2 mt-4 text-xs text-stone-400">
            <Shield className="w-3.5 h-3.5" />
            Pagamento seguro via Stripe · Cartão de crédito
          </div>
        </motion.div>

        {/* Testimonials */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="flex flex-col gap-3"
        >
          {TESTIMONIALS.map((t, i) => (
            <div key={i} className="bg-white rounded-xl border border-stone-100 p-4">
              <div className="flex items-center gap-1 mb-2">
                {Array.from({ length: t.stars }).map((_, s) => (
                  <span key={s} className="text-amber-400 text-sm">★</span>
                ))}
              </div>
              <p className="text-stone-600 text-sm italic">"{t.text}"</p>
              <p className="text-stone-400 text-xs mt-1 font-medium">— {t.name}</p>
            </div>
          ))}
        </motion.div>

        <p className="text-center text-xs text-stone-400 pb-4">
          Ao assinar você concorda com os termos de uso. Cobrança recorrente mensal. Cancele a qualquer momento pelo portal do cliente.
        </p>
      </div>
    </div>
  )
}
