import React, { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { CheckCircle, Loader2, ArrowRight } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/lib/AuthContext'

export default function SubscriptionSuccess() {
  const navigate = useNavigate()
  const { user, isSubscribed, fetchSubscription } = useAuth()
  const [attempts, setAttempts] = useState(0)
  const [timedOut, setTimedOut] = useState(false)

  useEffect(() => {
    if (isSubscribed) {
      const timer = setTimeout(() => navigate('/HairDashboard'), 2000)
      return () => clearTimeout(timer)
    }

    if (attempts >= 10) {
      setTimedOut(true)
      return
    }

    // Polling: verifica a assinatura a cada 3 segundos
    const timer = setTimeout(async () => {
      if (user?.id) {
        await fetchSubscription(user.id)
        setAttempts(a => a + 1)
      }
    }, 3000)

    return () => clearTimeout(timer)
  }, [isSubscribed, attempts, user, fetchSubscription, navigate])

  return (
    <div className="min-h-screen bg-stone-50 flex flex-col items-center justify-center px-4"
      style={{ fontFamily: 'system-ui, sans-serif' }}>

      {isSubscribed ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center flex flex-col items-center gap-4"
        >
          <div className="w-20 h-20 rounded-full bg-emerald-100 flex items-center justify-center">
            <CheckCircle className="w-12 h-12 text-emerald-500" />
          </div>
          <h1 className="text-2xl font-extrabold text-stone-900">Pagamento confirmado!</h1>
          <p className="text-stone-500 text-sm">Redirecionando para sua rotina...</p>
          <div className="w-6 h-6 border-2 border-stone-200 border-t-emerald-500 rounded-full animate-spin mt-2" />
        </motion.div>
      ) : timedOut ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center flex flex-col items-center gap-4 max-w-sm"
        >
          <div className="w-20 h-20 rounded-full bg-amber-100 flex items-center justify-center text-4xl">⏳</div>
          <h1 className="text-xl font-extrabold text-stone-900">Processando seu pagamento</h1>
          <p className="text-stone-500 text-sm leading-relaxed">
            O pagamento foi recebido, mas a confirmação está demorando um pouco.
            Aguarde alguns minutos e tente acessar novamente.
          </p>
          <button
            onClick={() => navigate('/HairDashboard')}
            className="flex items-center gap-2 px-6 py-3 rounded-full font-bold text-white text-sm"
            style={{ background: '#FB45A9' }}
          >
            Tentar acessar agora
            <ArrowRight className="w-4 h-4" />
          </button>
        </motion.div>
      ) : (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center flex flex-col items-center gap-4"
        >
          <Loader2 className="w-12 h-12 text-emerald-500 animate-spin" />
          <h1 className="text-xl font-extrabold text-stone-900">Confirmando pagamento...</h1>
          <p className="text-stone-400 text-sm">Isso leva apenas alguns segundos</p>
        </motion.div>
      )}
    </div>
  )
}
