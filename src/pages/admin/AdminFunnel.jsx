import React, { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAdminAuth } from '@/lib/AdminAuthContext'
import { AlertCircle, TrendingDown } from 'lucide-react'
import { ArrowClockwise } from '@phosphor-icons/react'

const FUNNEL_STEPS = [
  { key: 'quiz_started',      label: 'Iniciaram o quiz',      color: 'bg-violet-500', light: 'bg-violet-50', text: 'text-violet-600' },
  { key: 'quiz_completed',    label: 'Completaram o quiz',    color: 'bg-blue-500',   light: 'bg-blue-50',   text: 'text-blue-600' },
  { key: 'results_viewed',    label: 'Viram os resultados',   color: 'bg-violet-400', light: 'bg-violet-50', text: 'text-violet-600' },
  { key: 'cta_clicked',       label: 'Clicaram em Assinar',   color: 'bg-amber-500',  light: 'bg-amber-50',  text: 'text-amber-600' },
  { key: 'payment_completed', label: 'Pagamento confirmado',  color: 'bg-emerald-500',light: 'bg-emerald-50',text: 'text-emerald-600' },
]

const PERIODS = [
  { key: 'today', label: 'Hoje' },
  { key: '7d',    label: '7 dias' },
  { key: '30d',   label: '30 dias' },
  { key: 'custom', label: 'Personalizado' },
]

function dropColor(pct) {
  if (pct <= 20) return 'text-emerald-600 bg-emerald-50'
  if (pct <= 40) return 'text-amber-600 bg-amber-50'
  return 'text-red-600 bg-red-50'
}

export default function AdminFunnel() {
  const { adminToken, clearAdminToken } = useAdminAuth()
  const navigate = useNavigate()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [period, setPeriod] = useState('30d')
  const [customStart, setCustomStart] = useState('')
  const [customEnd, setCustomEnd] = useState('')

  const load = useCallback(async (p = period, cs = customStart, ce = customEnd) => {
    setLoading(true)
    setError(null)
    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
      const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY
      const params = new URLSearchParams({ period: p })
      if (p === 'custom' && cs) params.set('start', cs)
      if (p === 'custom' && ce) params.set('end', ce)

      const res = await fetch(`${supabaseUrl}/functions/v1/admin-funnel?${params}`, {
        headers: {
          Authorization: `Bearer ${supabaseAnonKey}`,
          apikey: supabaseAnonKey,
          'x-admin-token': adminToken,
        },
      })
      if (res.status === 401 || res.status === 403) {
        clearAdminToken(); navigate('/admin/login', { replace: true }); return
      }
      const result = await res.json()
      if (result?.error) throw new Error(result.error)
      setData(result)
    } catch (e) {
      setError(e?.message ?? 'Erro ao carregar dados')
    } finally {
      setLoading(false)
    }
  }, [adminToken, clearAdminToken, navigate, period, customStart, customEnd])

  useEffect(() => { load() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const handlePeriod = (p) => {
    setPeriod(p)
    if (p !== 'custom') load(p, '', '')
  }

  const handleCustomApply = () => {
    if (customStart && customEnd) load('custom', customStart, customEnd)
  }

  const steps = data?.steps ?? []
  const first = steps[0]?.count ?? 0

  let maxDropIdx = -1
  let maxDropPct = 0
  for (let i = 1; i < steps.length; i++) {
    const prev = steps[i - 1]?.count ?? 0
    const curr = steps[i]?.count ?? 0
    const dropPct = prev > 0 ? ((prev - curr) / prev) * 100 : 0
    if (dropPct > maxDropPct) { maxDropPct = dropPct; maxDropIdx = i }
  }

  const totalConversion = first > 0 && steps[4]?.count > 0
    ? ((steps[4].count / first) * 100).toFixed(1)
    : '0.0'

  return (
    <div className="flex flex-col gap-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-extrabold text-gray-900">Funil de Conversão</h1>
          <p className="text-sm text-gray-400 mt-0.5">Acompanhe onde as usuárias abandonam o fluxo</p>
        </div>
        <button
          onClick={() => load()}
          disabled={loading}
          className="flex items-center justify-center w-10 h-10 bg-white border border-gray-200 rounded-xl text-gray-400 hover:text-gray-700 hover:border-gray-300 transition-all disabled:opacity-40"
        >
          <ArrowClockwise size={16} weight="fill" className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* Period filters */}
      <div className="flex flex-wrap gap-2 items-center">
        <div className="flex bg-white border border-gray-200 rounded-xl p-1 gap-0.5">
          {PERIODS.map(p => (
            <button
              key={p.key}
              onClick={() => handlePeriod(p.key)}
              className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-all ${
                period === p.key
                  ? 'bg-violet-600 text-white'
                  : 'text-gray-500 hover:text-gray-800'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
        {period === 'custom' && (
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={customStart}
              onChange={e => setCustomStart(e.target.value)}
              className="border border-gray-200 rounded-xl px-3 py-1.5 text-sm text-gray-700 bg-white outline-none focus:border-violet-400"
            />
            <span className="text-gray-400 text-sm">até</span>
            <input
              type="date"
              value={customEnd}
              onChange={e => setCustomEnd(e.target.value)}
              className="border border-gray-200 rounded-xl px-3 py-1.5 text-sm text-gray-700 bg-white outline-none focus:border-violet-400"
            />
            <button
              onClick={handleCustomApply}
              disabled={!customStart || !customEnd}
              className="px-3 py-1.5 bg-violet-600 text-white text-sm font-semibold rounded-xl disabled:opacity-40"
            >
              Aplicar
            </button>
          </div>
        )}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-4 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      {/* Summary cards */}
      {!loading && data && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="bg-white rounded-2xl border border-gray-100 p-5">
            <p className="text-sm text-gray-500 font-medium mb-2">Conversão início → fim</p>
            <p className="text-3xl font-extrabold text-gray-900">{totalConversion}%</p>
            <p className="text-xs text-gray-400 mt-1">
              {steps[4]?.count ?? 0} pagamentos de {first} inícios
            </p>
          </div>
          {maxDropIdx > 0 && (
            <div className="bg-white rounded-2xl border border-gray-100 p-5">
              <div className="flex items-center gap-2 mb-2">
                <TrendingDown className="w-4 h-4 text-red-400" />
                <p className="text-sm text-gray-500 font-medium">Maior abandono</p>
              </div>
              <p className="text-base font-bold text-gray-900">
                {FUNNEL_STEPS[maxDropIdx]?.label}
              </p>
              <p className="text-xs text-red-500 font-semibold mt-1">
                -{maxDropPct.toFixed(1)}% das usuárias da etapa anterior
              </p>
            </div>
          )}
        </div>
      )}

      {/* Funnel bars */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5 sm:p-6">
        {loading ? (
          <div className="space-y-6 animate-pulse">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="space-y-2">
                <div className="flex justify-between">
                  <div className="h-4 bg-gray-100 rounded w-40" />
                  <div className="h-4 bg-gray-100 rounded w-12" />
                </div>
                <div className="h-8 bg-gray-100 rounded-xl" style={{ width: `${100 - i * 12}%` }} />
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-1">
            {FUNNEL_STEPS.map((step, i) => {
              const count = steps.find(s => s.event_type === step.key)?.count ?? 0
              const widthPct = first > 0 ? Math.max((count / first) * 100, 0) : 0
              const prevCount = i > 0 ? (steps.find(s => s.event_type === FUNNEL_STEPS[i - 1].key)?.count ?? 0) : count
              const fromPrev = prevCount > 0 ? (count / prevCount) * 100 : 0
              const dropPct = 100 - fromPrev
              const fromTotal = first > 0 ? (count / first) * 100 : 0
              const isBiggestDrop = i === maxDropIdx

              return (
                <div key={step.key}>
                  {i > 0 && (
                    <div className="flex items-center gap-2 py-2 px-1">
                      <div className="w-0.5 h-6 bg-gray-200 ml-2 flex-shrink-0" />
                      <span
                        className={`inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full ${
                          isBiggestDrop
                            ? 'text-red-600 bg-red-50 ring-1 ring-red-200'
                            : dropColor(dropPct)
                        }`}
                      >
                        {isBiggestDrop && '⚠️ '}
                        -{dropPct.toFixed(1)}% (−{(prevCount - count).toLocaleString()} usuárias)
                        {isBiggestDrop && ' maior queda'}
                      </span>
                    </div>
                  )}

                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold text-gray-700">{step.label}</span>
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-gray-400">{fromTotal.toFixed(1)}% do total</span>
                        <span className="text-base font-extrabold text-gray-900 tabular-nums">
                          {count.toLocaleString()}
                        </span>
                      </div>
                    </div>
                    <div className="h-8 bg-gray-100 rounded-xl overflow-hidden">
                      <div
                        className={`h-full ${step.color} rounded-xl transition-all duration-700`}
                        style={{ width: `${Math.max(widthPct, count > 0 ? 2 : 0)}%` }}
                      />
                    </div>
                  </div>
                </div>
              )
            })}

            {first === 0 && (
              <p className="text-sm text-gray-400 text-center py-8">
                Nenhum evento registrado no período selecionado.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
