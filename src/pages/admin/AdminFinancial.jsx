import React, { useEffect, useState, useCallback } from 'react'
import {
  TrendingUp, DollarSign, ShoppingBag,
  RefreshCw, RotateCcw, Clock,
} from 'lucide-react'
import { ArrowClockwise } from '@phosphor-icons/react'
import {
  ResponsiveContainer, AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip,
} from 'recharts'
import MetricCard from './components/MetricCard'
import SectionHeader from './components/SectionHeader'
import ChartSkeleton from './components/ChartSkeleton'
import ChartTooltip from './components/ChartTooltip'
import ErrorBanner from './components/ErrorBanner'
import { useAdminFetch } from './hooks/useAdminFetch'

const PERIODS = [
  { key: 3,  label: '3 meses' },
  { key: 6,  label: '6 meses' },
  { key: 12, label: '12 meses' },
]

const STATUS_BADGE = {
  active:     { label: 'Ativa',       bg: 'bg-emerald-50', text: 'text-emerald-700' },
  pending:    { label: 'Pendente',    bg: 'bg-amber-50',   text: 'text-amber-700' },
  refunded:   { label: 'Reembolsada', bg: 'bg-orange-50',  text: 'text-orange-700' },
  chargeback: { label: 'Chargeback',  bg: 'bg-red-50',     text: 'text-red-700' },
}

function fmt(val) {
  return `$${Number(val ?? 0).toFixed(2)}`
}

function fmtDate(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('pt-BR')
}

export default function AdminFinancial() {
  const { apiFetch } = useAdminFetch()
  const [data, setData]       = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState(null)
  const [months, setMonths]   = useState(6)

  const load = useCallback(async (m = months) => {
    setLoading(true)
    setError(null)
    try {
      const result = await apiFetch(`/admin-financial?months=${m}`)
      if (!result) return
      setData(result)
    } catch (e) {
      setError(e?.message ?? 'Erro ao carregar dados financeiros')
    } finally {
      setLoading(false)
    }
  }, [apiFetch, months])

  useEffect(() => { load() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const handlePeriod = (m) => {
    setMonths(m)
    load(m)
  }

  const salesHistory    = data?.salesHistory    ?? []
  const planBreakdown   = data?.planBreakdown   ?? []
  const recentPurchases = data?.recentPurchases ?? []

  return (
    <div className="flex flex-col gap-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-extrabold text-gray-900">Financeiro</h1>
          <p className="text-sm text-gray-400 mt-0.5">Dados de compras únicas via Hotmart</p>
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

      {error && <ErrorBanner message={error} onRetry={() => load()} />}

      {/* Primary metrics */}
      <section>
        <SectionHeader title="Métricas principais" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard
            icon={DollarSign} iconBg="bg-emerald-50" iconColor="text-emerald-500"
            label="Faturamento bruto"
            value={loading ? '—' : fmt(data?.totalRevenue)}
            sub={loading ? undefined : `${data?.activeCount ?? 0} compras ativas`}
            loading={loading}
          />
          <MetricCard
            icon={TrendingUp} iconBg="bg-blue-50" iconColor="text-blue-500"
            label="Ticket médio"
            value={loading ? '—' : fmt(data?.avgTicket)}
            sub="Valor médio por compra ativa"
            loading={loading}
          />
          <MetricCard
            icon={ShoppingBag} iconBg="bg-violet-50" iconColor="text-violet-500"
            label="Compras ativas"
            value={loading ? '—' : (data?.activeCount ?? 0)}
            loading={loading}
          />
          <MetricCard
            icon={Clock} iconBg="bg-amber-50" iconColor="text-amber-500"
            label="Pendentes"
            value={loading ? '—' : (data?.pendingCount ?? 0)}
            sub="Boleto/PIX aguardando confirmação"
            loading={loading}
          />
        </div>
      </section>

      {/* Secondary metrics */}
      <section>
        <SectionHeader title="Reembolsos e chargebacks" />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <MetricCard
            icon={RotateCcw} iconBg="bg-orange-50" iconColor="text-orange-400"
            label="Reembolsadas"
            value={loading ? '—' : (data?.refundedCount ?? 0)}
            loading={loading}
          />
          <MetricCard
            icon={RefreshCw} iconBg="bg-red-50" iconColor="text-red-400"
            label="Chargebacks"
            value={loading ? '—' : (data?.chargebackCount ?? 0)}
            loading={loading}
          />
          <MetricCard
            icon={TrendingUp} iconBg="bg-orange-50" iconColor="text-orange-500"
            label="Taxa de reembolso"
            value={loading ? '—' : `${data?.refundRate ?? 0}%`}
            sub="(Reembolsos + CB) ÷ total de compras"
            loading={loading}
          />
        </div>
      </section>

      {/* Per-plan breakdown */}
      <section>
        <SectionHeader title="Detalhamento por plano" />
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-7 h-7 border-4 border-gray-200 border-t-violet-600 rounded-full animate-spin" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50">
                    {['Plano', 'Preço', 'Compras ativas', 'Receita', '% do total'].map(h => (
                      <th key={h} className="text-left px-4 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {planBreakdown.map(row => (
                    <tr key={row.plan_key} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 font-semibold text-gray-800">{row.label}</td>
                      <td className="px-4 py-3 text-gray-600 tabular-nums">{fmt(row.price)}</td>
                      <td className="px-4 py-3 font-bold text-gray-900 tabular-nums">{row.count}</td>
                      <td className="px-4 py-3">
                        <span className="font-extrabold text-emerald-700 tabular-nums">{fmt(row.revenue)}</span>
                      </td>
                      <td className="px-4 py-3 text-gray-500 tabular-nums">{row.pct}%</td>
                    </tr>
                  ))}
                </tbody>
                {(data?.totalRevenue ?? 0) > 0 && (
                  <tfoot>
                    <tr className="border-t border-gray-200 bg-gray-50">
                      <td colSpan={3} className="px-4 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">Total</td>
                      <td className="px-4 py-3 font-extrabold text-gray-900 tabular-nums">{fmt(data.totalRevenue)}</td>
                      <td className="px-4 py-3" />
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          )}
        </div>
      </section>

      {/* Revenue by month */}
      <section className="bg-white rounded-2xl border border-gray-100 p-5">
        <p className="font-bold text-gray-800 mb-4">Receita por mês</p>
        {loading ? (
          <ChartSkeleton h={220} />
        ) : salesHistory.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-12">Sem dados no período.</p>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={salesHistory} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
              <defs>
                <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
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
                type="monotone" dataKey="revenue" name="Receita"
                stroke="#16a34a" strokeWidth={2.5}
                fill="url(#revGrad)"
                dot={{ r: 3.5, fill: '#16a34a', strokeWidth: 0 }}
                activeDot={{ r: 5 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </section>

      {/* Sales count by month */}
      <section className="bg-white rounded-2xl border border-gray-100 p-5">
        <p className="font-bold text-gray-800 mb-4">Compras por mês</p>
        {loading ? (
          <ChartSkeleton h={200} />
        ) : salesHistory.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-12">Sem dados no período.</p>
        ) : (
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={salesHistory} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
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
              <Bar dataKey="count" name="Compras" fill="#7c3aed" radius={[4, 4, 0, 0]} maxBarSize={40} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </section>

      {/* Recent purchases */}
      <section>
        <SectionHeader title="Compras recentes" />
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="w-7 h-7 border-4 border-gray-200 border-t-violet-600 rounded-full animate-spin" />
            </div>
          ) : recentPurchases.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-12">Nenhuma compra encontrada.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50">
                    {['Email', 'Plano', 'Valor', 'Data', 'Status'].map(h => (
                      <th key={h} className="text-left px-4 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {recentPurchases.map((p, i) => {
                    const badge = STATUS_BADGE[p.status] ?? STATUS_BADGE.active
                    return (
                      <tr key={p.id ?? i} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3 text-gray-700 font-medium max-w-[200px] truncate">{p.email}</td>
                        <td className="px-4 py-3 text-gray-600 max-w-[140px] truncate">{p.plan_label ?? p.plan ?? '—'}</td>
                        <td className="px-4 py-3 font-bold text-gray-900 tabular-nums whitespace-nowrap">
                          {p.currency ?? 'USD'} {fmt(p.amount)}
                        </td>
                        <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{fmtDate(p.date)}</td>
                        <td className="px-4 py-3">
                          <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${badge.bg} ${badge.text}`}>
                            {badge.label}
                          </span>
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
    </div>
  )
}
