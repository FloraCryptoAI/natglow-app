import React, { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAdminAuth } from '@/lib/AdminAuthContext'
import {
  AlertCircle, TrendingUp, DollarSign,
  CreditCard, XCircle, AlertTriangle, ExternalLink,
} from 'lucide-react'
import { ArrowClockwise } from '@phosphor-icons/react'
import {
  ResponsiveContainer, AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from 'recharts'

const PERIODS = [
  { key: 3,  label: '3 meses' },
  { key: 6,  label: '6 meses' },
  { key: 12, label: '12 meses' },
]

const PAY_STATUS = {
  paid:     { label: 'Pago',        bg: 'bg-emerald-50', text: 'text-emerald-700' },
  failed:   { label: 'Falhou',      bg: 'bg-red-50',     text: 'text-red-700' },
  refunded: { label: 'Reembolsado', bg: 'bg-amber-50',   text: 'text-amber-700' },
}

function fmt(val) {
  return `$${Number(val ?? 0).toFixed(2)}`
}

function fmtDate(ts) {
  if (!ts) return '—'
  return new Date(ts * 1000).toLocaleDateString('pt-BR')
}

function MetricCard({ icon: Icon, iconBg, iconColor, label, value, sub, loading }) {
  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 p-5 animate-pulse">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-9 h-9 rounded-xl bg-gray-100 flex-shrink-0" />
          <div className="h-3.5 bg-gray-100 rounded w-28" />
        </div>
        <div className="h-8 bg-gray-100 rounded w-20" />
        {sub !== undefined && <div className="h-3 bg-gray-100 rounded w-24 mt-2" />}
      </div>
    )
  }
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5">
      <div className="flex items-center gap-3 mb-3">
        <div className={`w-9 h-9 rounded-xl ${iconBg} flex items-center justify-center flex-shrink-0`}>
          <Icon className={`w-[18px] h-[18px] ${iconColor}`} />
        </div>
        <span className="text-sm text-gray-500 font-medium leading-tight">{label}</span>
      </div>
      <p className="text-3xl font-extrabold text-gray-900 tracking-tight">{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
    </div>
  )
}

function ChartTooltip({ active, payload, label, prefix = '' }) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-gray-900 text-white rounded-xl px-3 py-2.5 shadow-xl text-xs">
      <p className="font-bold mb-1">{label}</p>
      {payload.map(p => (
        <p key={p.dataKey} className="font-medium" style={{ color: p.color }}>
          {p.name}: {prefix}{p.value}
        </p>
      ))}
    </div>
  )
}

function ChartSkeleton({ h = 200 }) {
  return <div className="animate-pulse bg-gray-50 rounded-xl" style={{ height: h }} />
}

function SectionHeader({ title }) {
  return <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">{title}</p>
}

export default function AdminFinancial() {
  const { adminToken, clearAdminToken } = useAdminAuth()
  const navigate = useNavigate()
  const [data, setData]       = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState(null)
  const [months, setMonths]   = useState(6)

  const baseUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1`
  const authHeaders = {
    Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
    apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
    'x-admin-token': adminToken,
    'Content-Type': 'application/json',
  }

  const load = useCallback(async (m = months) => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`${baseUrl}/admin-financial?months=${m}`, { headers: authHeaders })
      if (res.status === 401 || res.status === 403) {
        clearAdminToken(); navigate('/admin/login', { replace: true }); return
      }
      const result = await res.json()
      if (result?.error) throw new Error(result.error)
      setData(result)
    } catch (e) {
      setError(e?.message ?? 'Erro ao carregar dados financeiros')
    } finally {
      setLoading(false)
    }
  }, [adminToken, clearAdminToken, navigate, months]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { load() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const handlePeriod = (m) => {
    setMonths(m)
    load(m)
  }

  const mrrHistory     = data?.mrrHistory     ?? []
  const monthlyFlow    = data?.monthlyFlow     ?? []
  const recentPayments = data?.recentPayments  ?? []
  const failedPayments = data?.failedPayments  ?? []

  return (
    <div className="flex flex-col gap-6 max-w-5xl">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-extrabold text-gray-900">Financeiro</h1>
          <p className="text-sm text-gray-400 mt-0.5">Dados em tempo real via Stripe</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex bg-white border border-gray-200 rounded-xl p-1 gap-0.5">
            {PERIODS.map(p => (
              <button
                key={p.key}
                onClick={() => handlePeriod(p.key)}
                className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-all ${
                  months === p.key
                    ? 'bg-violet-600 text-white'
                    : 'text-gray-500 hover:text-gray-800'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
          <button
            onClick={() => load()}
            disabled={loading}
            className="flex items-center justify-center w-10 h-10 bg-white border border-gray-200 rounded-xl text-gray-400 hover:text-gray-700 hover:border-gray-300 transition-all disabled:opacity-40"
          >
            <ArrowClockwise size={16} weight="fill" className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-600 flex-1">{error}</p>
          <button
            onClick={() => load()}
            className="text-sm font-semibold text-red-600 hover:text-red-700 flex items-center gap-1.5 flex-shrink-0"
          >
            <ArrowClockwise size={14} weight="fill" />
            Tentar novamente
          </button>
        </div>
      )}

      {/* Primary metrics */}
      <section>
        <SectionHeader title="Métricas principais" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard
            icon={TrendingUp} iconBg="bg-emerald-50" iconColor="text-emerald-500"
            label="MRR atual"
            value={loading ? '—' : fmt(data?.currentMRR)}
            sub={loading ? undefined : `${data?.activeCount ?? 0} × $6,99/mês`}
            loading={loading}
          />
          <MetricCard
            icon={TrendingUp} iconBg="bg-blue-50" iconColor="text-blue-500"
            label="ARR projetado"
            value={loading ? '—' : fmt(data?.projectedARR)}
            sub="MRR × 12 meses"
            loading={loading}
          />
          <MetricCard
            icon={DollarSign} iconBg="bg-violet-50" iconColor="text-violet-500"
            label="Receita total acumulada"
            value={loading ? '—' : fmt(data?.totalRevenue)}
            sub="Todos os pagamentos recebidos"
            loading={loading}
          />
          <MetricCard
            icon={CreditCard} iconBg="bg-violet-50" iconColor="text-violet-500"
            label="Assinaturas ativas"
            value={loading ? '—' : (data?.activeCount ?? 0)}
            loading={loading}
          />
        </div>
      </section>

      {/* Secondary metrics */}
      <section>
        <SectionHeader title="Status das assinaturas" />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <MetricCard
            icon={XCircle} iconBg="bg-red-50" iconColor="text-red-400"
            label="Canceladas (total)"
            value={loading ? '—' : (data?.canceledCount ?? 0)}
            loading={loading}
          />
          <MetricCard
            icon={AlertTriangle} iconBg="bg-amber-50" iconColor="text-amber-500"
            label="Inadimplentes"
            value={loading ? '—' : (data?.pastDueCount ?? 0)}
            loading={loading}
          />
          <MetricCard
            icon={AlertCircle} iconBg="bg-orange-50" iconColor="text-orange-500"
            label="Taxa de inadimplência"
            value={loading ? '—' : `${data?.delinquencyRate ?? 0}%`}
            sub="Inadimplentes ÷ (ativos + inadimplentes)"
            loading={loading}
          />
        </div>
      </section>

      {/* MRR evolution */}
      <section className="bg-white rounded-2xl border border-gray-100 p-5">
        <p className="font-bold text-gray-800 mb-4">Evolução do MRR</p>
        {loading ? (
          <ChartSkeleton h={220} />
        ) : mrrHistory.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-12">Sem dados no período.</p>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={mrrHistory} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
              <defs>
                <linearGradient id="mrrGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#16a34a" stopOpacity={0.18} />
                  <stop offset="95%" stopColor="#16a34a" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
              <YAxis
                tickFormatter={v => `$${v}`}
                tick={{ fontSize: 11, fill: '#9ca3af' }}
                axisLine={false} tickLine={false} width={52}
              />
              <Tooltip content={({ active, payload, label }) => (
                <ChartTooltip active={active} payload={payload} label={label} prefix="$" />
              )} />
              <Area
                type="monotone" dataKey="mrr" name="MRR"
                stroke="#16a34a" strokeWidth={2.5}
                fill="url(#mrrGrad)"
                dot={{ r: 3.5, fill: '#16a34a', strokeWidth: 0 }}
                activeDot={{ r: 5 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </section>

      {/* New vs canceled */}
      <section className="bg-white rounded-2xl border border-gray-100 p-5">
        <p className="font-bold text-gray-800 mb-4">Novas assinaturas vs. Cancelamentos</p>
        {loading ? (
          <ChartSkeleton h={200} />
        ) : monthlyFlow.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-12">Sem dados no período.</p>
        ) : (
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={monthlyFlow} barGap={4} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
              <YAxis
                allowDecimals={false}
                tick={{ fontSize: 11, fill: '#9ca3af' }}
                axisLine={false} tickLine={false} width={32}
              />
              <Tooltip content={({ active, payload, label }) => (
                <ChartTooltip active={active} payload={payload} label={label} />
              )} />
              <Legend
                wrapperStyle={{ fontSize: 12, paddingTop: 8 }}
                formatter={v => <span className="text-gray-500">{v}</span>}
              />
              <Bar dataKey="new"      name="Novas"      fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={32} />
              <Bar dataKey="canceled" name="Canceladas" fill="#f87171" radius={[4, 4, 0, 0]} maxBarSize={32} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </section>

      {/* Recent payments */}
      <section>
        <SectionHeader title="Pagamentos recentes" />
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="w-7 h-7 border-4 border-gray-200 border-t-violet-600 rounded-full animate-spin" />
            </div>
          ) : recentPayments.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-12">Nenhum pagamento encontrado.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50">
                    {['Email', 'Valor', 'Data', 'Status', ''].map(h => (
                      <th key={h} className="text-left px-4 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {recentPayments.map(p => {
                    const badge = PAY_STATUS[p.status] ?? PAY_STATUS.paid
                    return (
                      <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3 text-gray-700 font-medium max-w-[200px] truncate">{p.email}</td>
                        <td className="px-4 py-3 font-bold text-gray-900 tabular-nums whitespace-nowrap">
                          {p.currency} {fmt(p.amount)}
                        </td>
                        <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{fmtDate(p.date)}</td>
                        <td className="px-4 py-3">
                          <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${badge.bg} ${badge.text}`}>
                            {badge.label}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          {p.hostedUrl && (
                            <a href={p.hostedUrl} target="_blank" rel="noreferrer"
                              className="p-1 text-gray-400 hover:text-gray-600 inline-flex">
                              <ExternalLink className="w-3.5 h-3.5" />
                            </a>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>

      {/* Failed payments */}
      <section>
        <SectionHeader title="Pagamentos com falha" />
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-7 h-7 border-4 border-gray-200 border-t-violet-600 rounded-full animate-spin" />
            </div>
          ) : failedPayments.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-10">Nenhum pagamento com falha.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50">
                    {['Email', 'Valor', 'Data', 'Motivo do erro'].map(h => (
                      <th key={h} className="text-left px-4 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {failedPayments.map(p => (
                    <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 text-gray-700 font-medium max-w-[200px] truncate">{p.email}</td>
                      <td className="px-4 py-3 font-bold text-gray-900 tabular-nums whitespace-nowrap">{fmt(p.amount)}</td>
                      <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{fmtDate(p.date)}</td>
                      <td className="px-4 py-3 text-red-500 text-xs max-w-[240px] truncate">{p.error}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>
    </div>
  )
}
