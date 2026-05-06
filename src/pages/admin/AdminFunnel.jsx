import React, { useEffect, useState, useCallback } from 'react'
import { TrendingDown } from 'lucide-react'
import { ArrowClockwise } from '@phosphor-icons/react'
import FunnelBars from './components/FunnelBars'
import ErrorBanner from './components/ErrorBanner'
import { useAdminFetch } from './hooks/useAdminFetch'

const FUNNEL_STEPS = [
  { key: 'quiz_started',      label: 'Iniciaram o quiz',      color: '#7c3aed' },
  { key: 'quiz_completed',    label: 'Completaram o quiz',    color: '#2563eb' },
  { key: 'results_viewed',    label: 'Viram os resultados',   color: '#8b5cf6' },
  { key: 'cta_clicked',       label: 'Clicaram em Assinar',   color: '#d97706' },
  { key: 'payment_completed', label: 'Pagamento confirmado',  color: '#059669' },
]

const PERIODS = [
  { key: 'today', label: 'Hoje' },
  { key: '7d',    label: '7 dias' },
  { key: '30d',   label: '30 dias' },
  { key: 'custom', label: 'Personalizado' },
]

const PLAN_FILTERS = [
  { key: 'all',          label: 'Todos os caminhos' },
  { key: 'monthly_499',  label: 'Monthly $4.99' },
  { key: 'monthly_699',  label: 'Monthly $6.99' },
  { key: 'monthly_1499', label: 'Monthly $14.99' },
]

export default function AdminFunnel() {
  const { apiFetch } = useAdminFetch()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [period, setPeriod] = useState('30d')
  const [plan, setPlan] = useState('all')
  const [customStart, setCustomStart] = useState('')
  const [customEnd, setCustomEnd] = useState('')

  const load = useCallback(async (p = period, cs = customStart, ce = customEnd, pl = plan) => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams({ period: p, plan: pl })
      if (p === 'custom' && cs) params.set('start', cs)
      if (p === 'custom' && ce) params.set('end', ce)
      const result = await apiFetch(`/admin-funnel?${params}`)
      if (!result) return
      setData(result)
    } catch (e) {
      setError(e?.message ?? 'Erro ao carregar dados')
    } finally {
      setLoading(false)
    }
  }, [apiFetch, period, plan, customStart, customEnd])

  useEffect(() => { load() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const handlePeriod = (p) => {
    setPeriod(p)
    if (p !== 'custom') load(p, '', '', plan)
  }

  const handlePlan = (pl) => {
    setPlan(pl)
    load(period, customStart, customEnd, pl)
  }

  const handleCustomApply = () => {
    if (customStart && customEnd) load('custom', customStart, customEnd, plan)
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

      {/* Filters row */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:gap-4">
        {/* Plan filter */}
        <div className="overflow-x-auto">
          <div className="flex bg-white border border-gray-200 rounded-xl p-1 gap-0.5 min-w-max">
            {PLAN_FILTERS.map(pl => (
              <button
                key={pl.key}
                onClick={() => handlePlan(pl.key)}
                className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-all ${
                  plan === pl.key
                    ? 'bg-violet-600 text-white'
                    : 'text-gray-500 hover:text-gray-800'
                }`}
              >
                {pl.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Period filters */}
      <div className="flex flex-col gap-2">
        <div className="overflow-x-auto">
          <div className="flex bg-white border border-gray-200 rounded-xl p-1 gap-0.5 min-w-max">
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
        </div>
        {period === 'custom' && (
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={customStart}
              onChange={e => setCustomStart(e.target.value)}
              className="flex-1 min-w-0 border border-gray-200 rounded-xl px-3 py-1.5 text-sm text-gray-700 bg-white outline-none focus:border-violet-400"
            />
            <span className="text-gray-400 text-sm flex-shrink-0">até</span>
            <input
              type="date"
              value={customEnd}
              onChange={e => setCustomEnd(e.target.value)}
              className="flex-1 min-w-0 border border-gray-200 rounded-xl px-3 py-1.5 text-sm text-gray-700 bg-white outline-none focus:border-violet-400"
            />
            <button
              onClick={handleCustomApply}
              disabled={!customStart || !customEnd}
              className="flex-shrink-0 px-3 py-1.5 bg-violet-600 text-white text-sm font-semibold rounded-xl disabled:opacity-40"
            >
              Aplicar
            </button>
          </div>
        )}
      </div>

      {error && <ErrorBanner message={error} onRetry={() => load()} />}

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
          <FunnelBars
            steps={FUNNEL_STEPS.map(step => ({
              label: step.label,
              color: step.color,
              count: steps.find(s => s.event_type === step.key)?.count ?? 0,
            }))}
            maxDropIdx={maxDropIdx}
            showTotal
          />
        )}
      </div>
    </div>
  )
}
