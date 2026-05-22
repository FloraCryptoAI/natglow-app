import React, { useEffect, useState, useCallback } from 'react'
import {
  TrendingUp, TrendingDown,
  ShoppingBag, Percent, Activity,
  ArrowUpRight,
} from 'lucide-react'
import { ArrowClockwise } from '@phosphor-icons/react'
import ErrorBanner from './components/ErrorBanner'
import { useAdminFetch } from './hooks/useAdminFetch'
import {
  ResponsiveContainer,
  BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip,
  PieChart, Pie, Cell,
} from 'recharts'

// ── date helpers ───────────────────────────────────────
function startOfDay()  { const d = new Date(); d.setHours(0,0,0,0); return d }
function startOfWeek() { const d = startOfDay(); d.setDate(d.getDate() - d.getDay()); return d }

// ── Dark tooltip ──────────────────────────────────────
function ChartTooltip({ active, payload, label, prefix = '' }) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-gray-900 text-white rounded-xl px-3 py-2.5 shadow-xl text-xs">
      <p className="font-bold text-gray-300 mb-1">{label}</p>
      {payload.map(p => (
        <p key={p.dataKey} className="font-semibold" style={{ color: p.color }}>
          {p.name}: {prefix}{typeof p.value === 'number' ? p.value.toFixed(2) : p.value}
        </p>
      ))}
    </div>
  )
}

// ── KPI Card ──────────────────────────────────────────
function KpiCard({ label, value, badge, accentColor = '#7c3aed', loading }) {
  const colors = {
    '#7c3aed': 'bg-violet-50 text-violet-600',
    '#10b981': 'bg-emerald-50 text-emerald-600',
    '#f59e0b': 'bg-amber-50 text-amber-500',
    '#3b82f6': 'bg-blue-50 text-blue-600',
  }
  const cls = (colors[accentColor] ?? colors['#7c3aed']).split(' ')
  const bgCls   = cls[0]
  const textCls = cls[1]

  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 p-5 animate-pulse">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-9 h-9 rounded-xl bg-gray-100 flex-shrink-0" />
          <div className="h-3.5 bg-gray-100 rounded w-24" />
        </div>
        <div className="h-8 bg-gray-100 rounded w-20 mb-2" />
        <div className="h-5 bg-gray-100 rounded w-16" />
      </div>
    )
  }
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5">
      <div className="flex items-center gap-3 mb-3">
        <div className={`w-9 h-9 rounded-xl ${bgCls} flex items-center justify-center flex-shrink-0`}>
          <TrendingUp className={`w-[18px] h-[18px] ${textCls}`} />
        </div>
        <span className="text-sm text-gray-500 font-medium leading-tight">{label}</span>
      </div>
      <p className="text-3xl font-extrabold text-gray-900 tracking-tight">{value}</p>
      {badge != null && (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold whitespace-nowrap mt-2 bg-emerald-50 text-emerald-600">
          <ArrowUpRight className="w-3 h-3 flex-shrink-0" />
          <span className="truncate">{badge}</span>
        </span>
      )}
    </div>
  )
}

// ── Chart skeleton ────────────────────────────────────
function ChartSkeleton({ h = 200 }) {
  return <div className="animate-pulse bg-gray-50 rounded-xl" style={{ height: h }} />
}

// ── Small metric card ─────────────────────────────────
function MetricCard({ icon: Icon, iconColor, bgColor, label, value, sub, loading }) {
  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 p-5 animate-pulse">
        <div className="w-9 h-9 rounded-xl bg-gray-100 mb-3" />
        <div className="h-3 bg-gray-100 rounded w-24 mb-2" />
        <div className="h-7 bg-gray-100 rounded w-16" />
      </div>
    )
  }
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5">
      <div className={`w-9 h-9 rounded-xl ${bgColor} flex items-center justify-center mb-3`}>
        <Icon className={`w-[18px] h-[18px] ${iconColor}`} />
      </div>
      <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-1">{label}</p>
      <p className="text-2xl font-extrabold text-gray-900 tracking-tight">{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
    </div>
  )
}

const STATUS_META = {
  active:     { name: 'Ativas',       color: '#8b5cf6' },
  pending:    { name: 'Pendentes',    color: '#fbbf24' },
  refunded:   { name: 'Reembolsadas', color: '#f87171' },
  chargeback: { name: 'Chargeback',   color: '#dc2626' },
}

const STATUS_LABEL = {
  active:     'Ativa',
  pending:    'Pendente',
  refunded:   'Reembolsada',
  chargeback: 'Chargeback',
}

// ── Main page ─────────────────────────────────────────
export default function AdminOverview() {
  const { apiFetch } = useAdminFetch()
  const [data,    setData]    = useState(null)
  const [retData, setRetData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [fin, ret] = await Promise.all([
        apiFetch('/admin-financial'),
        apiFetch('/admin-retention'),
      ])
      if (fin) setData(fin)
      if (ret) setRetData(ret)
    } catch (e) {
      setError(e?.message ?? 'Erro ao carregar dados')
    } finally {
      setLoading(false)
    }
  }, [apiFetch])

  useEffect(() => { load() }, [load])

  const totalRevenue    = data?.totalRevenue    ?? 0
  const activeCount     = data?.activeCount     ?? 0
  const pendingCount    = data?.pendingCount    ?? 0
  const refundedCount   = data?.refundedCount   ?? 0
  const chargebackCount = data?.chargebackCount ?? 0
  const refundRate      = data?.refundRate      ?? 0
  const avgTicket       = data?.avgTicket       ?? 0
  const salesHistory    = data?.salesHistory    ?? []
  const planBreakdown   = data?.planBreakdown   ?? []
  const recentPurchases = data?.recentPurchases ?? []

  const usageRate          = retData?.usageRate          ?? 0
  const engagedCount       = retData?.engagedCount       ?? 0
  const atRiskCount        = retData?.atRiskCount        ?? 0
  const neverAccessedCount = retData?.neverAccessedCount ?? 0

  const todayStart  = startOfDay()
  const weekStart   = startOfWeek()
  const newToday    = recentPurchases.filter(p => new Date(p.date) >= todayStart).length
  const newThisWeek = recentPurchases.filter(p => new Date(p.date) >= weekStart).length
  const currentMonthEntry = salesHistory[salesHistory.length - 1]

  const totalSold = activeCount + pendingCount + refundedCount + chargebackCount
  const statusPie = Object.entries(STATUS_META)
    .map(([key, { name, color }]) => {
      const count = { active: activeCount, pending: pendingCount, refunded: refundedCount, chargeback: chargebackCount }[key] ?? 0
      return { name, value: count, color }
    })
    .filter(s => s.value > 0)

  return (
    <div className="flex flex-col gap-6 max-w-6xl mx-auto">

      {/* ── Header ── */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">Visão Geral</h1>
          <p className="text-sm text-gray-400 mt-1">Métricas em tempo real · NatGlow</p>
        </div>
        <button
          onClick={load}
          disabled={loading}
          title="Atualizar dados"
          className="flex items-center justify-center w-10 h-10 bg-white border border-gray-200 rounded-xl text-gray-400 hover:text-violet-600 hover:border-violet-200 hover:bg-violet-50 transition-all disabled:opacity-40 shadow-sm"
        >
          <ArrowClockwise size={16} weight="fill" className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {error && <ErrorBanner message={error} onRetry={load} />}

      {/* ── Row 1: KPI cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          label="Faturamento Total"
          value={loading ? '—' : `$${totalRevenue.toFixed(2)}`}
          badge="Total acumulado"
          accentColor="#7c3aed"
          loading={loading}
        />
        <KpiCard
          label="Compras Ativas"
          value={loading ? '—' : activeCount}
          badge={loading ? null : `+${currentMonthEntry?.count ?? 0} este mês`}
          accentColor="#10b981"
          loading={loading}
        />
        <KpiCard
          label="Ticket Médio"
          value={loading ? '—' : `$${avgTicket.toFixed(2)}`}
          badge="Por compra ativa"
          accentColor="#f59e0b"
          loading={loading}
        />
        <KpiCard
          label="Taxa de Reembolso"
          value={loading ? '—' : `${refundRate}%`}
          badge={loading ? null : `${refundedCount + chargebackCount} casos`}
          accentColor="#3b82f6"
          loading={loading}
        />
      </div>

      {/* ── Row 2: Receita por mês ── */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6">
        <div className="flex items-start justify-between mb-6">
          <div>
            <p className="font-bold text-gray-900 text-base">Receita por mês</p>
            <p className="text-xs text-gray-400 mt-0.5">Compras confirmadas — histórico mensal</p>
          </div>
          {!loading && currentMonthEntry && (
            <div className="text-right">
              <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wide">Mês atual</p>
              <p className="text-xl font-extrabold text-violet-600">${currentMonthEntry.revenue.toFixed(2)}</p>
            </div>
          )}
        </div>
        {loading ? (
          <ChartSkeleton h={220} />
        ) : salesHistory.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-12">Sem dados no período.</p>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={salesHistory} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
              <YAxis tickFormatter={v => `$${v}`} tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} width={52} />
              <Tooltip content={({ active, payload, label }) =>
                <ChartTooltip active={active} payload={payload} label={label} prefix="$" />
              } />
              <Bar dataKey="revenue" name="Receita" fill="#7c3aed" radius={[4,4,0,0]} maxBarSize={40} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* ── Row 3: Vendas por produto + Distribuição ── */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        <div className="lg:col-span-3 bg-white rounded-2xl border border-gray-100 p-6">
          <p className="font-bold text-gray-900">Vendas por produto</p>
          <p className="text-xs text-gray-400 mt-0.5 mb-5">Compras ativas por produto</p>
          {loading ? <ChartSkeleton h={200} /> : planBreakdown.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-12">Sem dados de vendas.</p>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={planBreakdown} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} width={28} />
                <Tooltip content={({ active, payload, label }) =>
                  <ChartTooltip active={active} payload={payload} label={label} />
                } />
                <Bar dataKey="count" name="Compras" fill="#7c3aed" radius={[4,4,0,0]} maxBarSize={48} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 p-6">
          <p className="font-bold text-gray-900">Distribuição</p>
          <p className="text-xs text-gray-400 mt-0.5 mb-5">Por status · {totalSold} total</p>
          {loading ? <ChartSkeleton h={200} /> : statusPie.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-12">Sem compras registradas.</p>
          ) : (
            <div className="flex flex-col items-center gap-4">
              <div className="relative">
                <ResponsiveContainer width={160} height={160}>
                  <PieChart>
                    <Pie
                      data={statusPie} dataKey="value" nameKey="name"
                      cx="50%" cy="50%" innerRadius={50} outerRadius={72}
                      paddingAngle={2} startAngle={90} endAngle={-270}
                    >
                      {statusPie.map(entry => <Cell key={entry.name} fill={entry.color} />)}
                    </Pie>
                    <Tooltip
                      content={({ active, payload }) => {
                        if (!active || !payload?.length) return null
                        const d = payload[0]
                        const pct = totalSold > 0 ? ((d.value / totalSold) * 100).toFixed(0) : 0
                        return (
                          <div className="bg-gray-900 text-white rounded-xl px-3 py-2 shadow-xl text-xs">
                            <p className="font-bold text-gray-300">{d.name}</p>
                            <p className="font-semibold" style={{ color: d.payload.color }}>{d.value} ({pct}%)</p>
                          </div>
                        )
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-2xl font-extrabold text-gray-900">{activeCount}</span>
                  <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">ativas</span>
                </div>
              </div>
              <div className="w-full space-y-2">
                {statusPie.map(entry => (
                  <div key={entry.name} className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: entry.color }} />
                    <span className="text-xs text-gray-600 flex-1">{entry.name}</span>
                    <span className="text-xs font-bold text-gray-800">{entry.value}</span>
                    <span className="text-xs text-gray-400 w-8 text-right">
                      {totalSold > 0 ? `${((entry.value / totalSold) * 100).toFixed(0)}%` : '—'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Row 4: Engajamento ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          icon={Activity} iconColor="text-emerald-500" bgColor="bg-emerald-50"
          label="Taxa de uso (30d)"
          value={loading ? '—' : `${usageRate}%`}
          sub="Compradoras com login recente"
          loading={loading}
        />
        <MetricCard
          icon={TrendingUp} iconColor="text-blue-500" bgColor="bg-blue-50"
          label="Engajadas (7 dias)"
          value={loading ? '—' : engagedCount}
          sub="Acessaram nos últimos 7 dias"
          loading={loading}
        />
        <MetricCard
          icon={TrendingDown} iconColor="text-amber-500" bgColor="bg-amber-50"
          label="Em risco (7+ dias)"
          value={loading ? '—' : atRiskCount}
          sub="Ativas sem acesso recente"
          loading={loading}
        />
        <MetricCard
          icon={Percent} iconColor="text-red-400" bgColor="bg-red-50"
          label="Nunca acessaram"
          value={loading ? '—' : neverAccessedCount}
          sub="Compraram mas não fizeram login"
          loading={loading}
        />
      </div>

      {/* ── Row 5: Compras recentes ── */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-9 h-9 rounded-xl bg-violet-50 flex items-center justify-center flex-shrink-0">
            <ShoppingBag className="w-[18px] h-[18px] text-violet-600" />
          </div>
          <div>
            <p className="font-bold text-gray-900">Compras recentes</p>
            <p className="text-xs text-gray-400">
              {loading ? 'Carregando…' : `Hoje: ${newToday} · Esta semana: ${newThisWeek} · Últimas 20 transações`}
            </p>
          </div>
        </div>
        {loading ? (
          <div className="animate-pulse space-y-2">
            {[1,2,3,4,5].map(i => <div key={i} className="h-10 bg-gray-100 rounded-xl" />)}
          </div>
        ) : recentPurchases.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-8">Nenhuma compra registrada.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  {['Email', 'Produto', 'Valor', 'Status', 'Data'].map(h => (
                    <th key={h} className="text-left px-3 py-2 text-xs font-bold text-gray-400 uppercase tracking-wider whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {recentPurchases.map((p, i) => (
                  <tr key={p.id ?? i} className="hover:bg-gray-50 transition-colors">
                    <td className="px-3 py-2.5 text-gray-700 max-w-[200px] truncate">{p.email}</td>
                    <td className="px-3 py-2.5 text-gray-500 whitespace-nowrap text-xs">{p.plan_label}</td>
                    <td className="px-3 py-2.5 font-bold text-gray-900 tabular-nums">${Number(p.amount ?? 0).toFixed(2)}</td>
                    <td className="px-3 py-2.5">
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                        p.status === 'active'     ? 'bg-emerald-50 text-emerald-600' :
                        p.status === 'pending'    ? 'bg-amber-50 text-amber-600' :
                        p.status === 'refunded'   ? 'bg-red-50 text-red-600' :
                        p.status === 'chargeback' ? 'bg-red-100 text-red-800' :
                        'bg-gray-100 text-gray-500'
                      }`}>
                        {STATUS_LABEL[p.status] ?? p.status}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-gray-400 whitespace-nowrap text-xs">
                      {p.date ? new Date(p.date).toLocaleDateString('pt-BR') : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  )
}
