import React, { useEffect, useState, useCallback } from 'react'
import {
  TrendingUp, TrendingDown,
  UserPlus, Percent,
  CalendarCheck,
  ArrowUpRight, ArrowDownRight,
} from 'lucide-react'
import { ArrowClockwise } from '@phosphor-icons/react'
import ErrorBanner from './components/ErrorBanner'
import { useAdminFetch } from './hooks/useAdminFetch'
import {
  ResponsiveContainer,
  AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, ReferenceDot,
  BarChart, Bar, Legend,
  PieChart, Pie, Cell,
} from 'recharts'

// ── date helpers ───────────────────────────────────────
function startOfDay()   { const d = new Date(); d.setHours(0,0,0,0); return d }
function startOfWeek()  { const d = startOfDay(); d.setDate(d.getDate() - d.getDay()); return d }
function startOfMonth() { const d = startOfDay(); d.setDate(1); return d }

function getMonthlyFlow(subs) {
  const now = new Date()
  return Array.from({ length: 6 }, (_, i) => {
    const d        = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1)
    const startISO = new Date(d.getFullYear(), d.getMonth(), 1).toISOString()
    const endISO   = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999).toISOString()
    const label    = d.toLocaleString('pt-BR', { month: 'short', year: '2-digit' })
    return {
      label,
      novas:      subs.filter(s => s.created_at  >= startISO && s.created_at  <= endISO).length,
      canceladas: subs.filter(s => s.canceled_at && s.canceled_at >= startISO && s.canceled_at <= endISO).length,
    }
  })
}

// ── Mini sparkline SVG ─────────────────────────────────
function MiniSparkline({ data = [], color = '#7c3aed' }) {
  if (!data || data.length < 2) return null
  const W = 72, H = 36
  const min = Math.min(...data)
  const max = Math.max(...data)
  const range = max - min || 1
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * W
    const y = H - 4 - ((v - min) / range) * (H - 10)
    return `${x.toFixed(1)},${y.toFixed(1)}`
  })
  const polyPts = pts.join(' ')
  const areaPts = `0,${H} ${polyPts} ${W},${H}`
  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} className="flex-shrink-0">
      <polygon points={areaPts} fill={color} fillOpacity="0.12" />
      <polyline
        points={polyPts}
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

// ── Dark tooltip ──────────────────────────────────────
function ChartTooltip({ active, payload, label, prefix = '' }) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-gray-900 text-white rounded-xl px-3 py-2.5 shadow-xl text-xs">
      <p className="font-bold text-gray-300 mb-1">{label}</p>
      {payload.map(p => (
        <p key={p.dataKey} className="font-semibold" style={{ color: p.color === '#7c3aed' ? '#c4b5fd' : p.color }}>
          {p.name}: {prefix}{typeof p.value === 'number' ? p.value.toFixed(2) : p.value}
        </p>
      ))}
    </div>
  )
}

// ── KPI Card (Kleon style) ────────────────────────────
const SPARK_COLORS = {
  '#7c3aed': { iconBg: 'bg-violet-50',  iconColor: 'text-violet-600'  },
  '#10b981': { iconBg: 'bg-emerald-50', iconColor: 'text-emerald-600' },
  '#f59e0b': { iconBg: 'bg-amber-50',   iconColor: 'text-amber-500'   },
  '#3b82f6': { iconBg: 'bg-blue-50',    iconColor: 'text-blue-600'    },
}

function KpiCard({ label, value, badge, badgePositive = true, sparkColor = '#7c3aed', loading }) {
  const { iconBg, iconColor } = SPARK_COLORS[sparkColor] ?? SPARK_COLORS['#7c3aed']

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
        <div className={`w-9 h-9 rounded-xl ${iconBg} flex items-center justify-center flex-shrink-0`}>
          <TrendingUp className={`w-[18px] h-[18px] ${iconColor}`} />
        </div>
        <span className="text-sm text-gray-500 font-medium leading-tight">{label}</span>
      </div>
      <p className="text-3xl font-extrabold text-gray-900 tracking-tight">{value}</p>
      {badge != null && (
        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold whitespace-nowrap mt-2 ${
          badgePositive ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-500'
        }`}>
          {badgePositive
            ? <ArrowUpRight className="w-3 h-3 flex-shrink-0" />
            : <ArrowDownRight className="w-3 h-3 flex-shrink-0" />
          }
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

// ── Metric card (small) ───────────────────────────────
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

// ── Main page ─────────────────────────────────────────
export default function AdminOverview() {
  const { apiFetch } = useAdminFetch()
  const [data, setData]       = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await apiFetch('/admin-data')
      if (!result) return
      setData(result)
    } catch (e) {
      setError(e?.message ?? 'Erro ao carregar dados')
    } finally {
      setLoading(false)
    }
  }, [apiFetch])

  useEffect(() => { load() }, [load])

  // ── derived ────────────────────────────────────────────
  const subs              = data?.subscriptions  ?? []
  const activeCount       = data?.activeCount    ?? 0
  const totalUsers        = data?.totalUsers     ?? 0
  const canceledCount     = data?.canceledCount  ?? 0
  const pastDueCount      = data?.pastDueCount   ?? 0
  const inactiveCount     = subs.filter(s => s.status === 'inactive').length
  const canceledThisMonth = data?.canceledThisMonth ?? 0
  const totalRevenue      = data?.totalRevenue   ?? 0
  const mrrHistory12      = data?.mrrHistory12   ?? []
  const mrr               = data?.currentMRR ?? 0

  const todayStart   = startOfDay()
  const weekStart    = startOfWeek()
  const monthStart   = startOfMonth()
  const newToday     = subs.filter(s => new Date(s.created_at) >= todayStart).length
  const newThisWeek  = subs.filter(s => new Date(s.created_at) >= weekStart).length
  const newThisMonth = subs.filter(s => new Date(s.created_at) >= monthStart).length

  const totalTracked   = activeCount + canceledCount + pastDueCount
  const churnRateNum   = totalTracked > 0 ? (canceledCount / totalTracked) * 100 : 0
  const churnRate      = churnRateNum.toFixed(1)
  const conversionRate = totalUsers > 0 ? ((activeCount / totalUsers) * 100).toFixed(1) : '0.0'

  const avgMrr = activeCount > 0 ? mrr / activeCount : 0
  const ltv    = churnRateNum > 0 ? `$${(avgMrr / (churnRateNum / 100)).toFixed(2)}` : 'Em cálculo'
  const ltvSub = churnRateNum > 0 ? `$${avgMrr.toFixed(2)} MRR médio ÷ ${churnRate}% churn` : 'Churn rate = 0%'

  // Sparkline data
  const mrrNums           = mrrHistory12.map(m => m.mrr ?? 0)
  const monthlyFlow       = loading ? [] : getMonthlyFlow(subs)
  const flowNums          = monthlyFlow.map(m => m.novas)
  const cumulativeRevNums = mrrNums.map((_, i) => mrrNums.slice(0, i + 1).reduce((a, b) => a + b, 0))

  // MRR month-over-month change
  const prevMonthMrr = mrrHistory12[mrrHistory12.length - 2]?.mrr ?? 0
  const currMonthMrr = mrrHistory12[mrrHistory12.length - 1]?.mrr ?? 0
  const mrrChangePct = prevMonthMrr > 0
    ? `${((currMonthMrr - prevMonthMrr) / prevMonthMrr * 100).toFixed(1)}%`
    : null
  const mrrUp = currMonthMrr >= prevMonthMrr

  const currentMonthLabel = mrrHistory12[mrrHistory12.length - 1]?.label

  const totalSubs = activeCount + canceledCount + pastDueCount + inactiveCount
  const statusPie = [
    { name: 'Ativos',     value: activeCount,   color: '#8b5cf6' },
    { name: 'Cancelados', value: canceledCount,  color: '#f87171' },
    { name: 'Em atraso',  value: pastDueCount,   color: '#fbbf24' },
    { name: 'Inativos',   value: inactiveCount,  color: '#e5e7eb' },
  ].filter(s => s.value > 0)

  return (
    <div className="flex flex-col gap-6 max-w-6xl">

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
          label="Assinantes Ativos"
          value={loading ? '—' : activeCount}
          badge={loading ? null : `+${newThisMonth} este mês`}
          badgePositive={newThisMonth >= 0}
          sparkNums={flowNums}
          sparkColor="#7c3aed"
          loading={loading}
        />
        <KpiCard
          label="MRR"
          value={loading ? '—' : `$${mrr.toFixed(2)}`}
          badge={mrrChangePct}
          badgePositive={mrrUp}
          sparkNums={mrrNums}
          sparkColor="#10b981"
          loading={loading}
        />
        <KpiCard
          label="Faturamento Bruto"
          value={loading ? '—' : `$${totalRevenue.toFixed(2)}`}
          badge="Total acumulado"
          badgePositive={true}
          sparkNums={cumulativeRevNums}
          sparkColor="#f59e0b"
          loading={loading}
        />
        <KpiCard
          label="Taxa de Conversão"
          value={loading ? '—' : `${conversionRate}%`}
          badge={loading ? null : `${activeCount} de ${totalUsers}`}
          badgePositive={parseFloat(conversionRate) > 0}
          sparkNums={flowNums}
          sparkColor="#3b82f6"
          loading={loading}
        />
      </div>

      {/* ── Row 2: MRR Area chart ── */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6">
        <div className="flex items-start justify-between mb-6">
          <div>
            <p className="font-bold text-gray-900 text-base">Evolução do MRR</p>
            <p className="text-xs text-gray-400 mt-0.5">Receita recorrente mensal — últimos 12 meses</p>
          </div>
          {!loading && currMonthMrr != null && (
            <div className="text-right">
              <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wide">Mês atual</p>
              <p className="text-xl font-extrabold text-violet-600">${currMonthMrr.toFixed(2)}</p>
            </div>
          )}
        </div>
        {loading ? (
          <ChartSkeleton h={220} />
        ) : mrrHistory12.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-12">Sem dados no período.</p>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={mrrHistory12} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
              <defs>
                <linearGradient id="mrrAreaGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%"   stopColor="#7c3aed" stopOpacity="0.18" />
                  <stop offset="100%" stopColor="#7c3aed" stopOpacity="0" />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
              <YAxis tickFormatter={v => `$${v}`} tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} width={52} />
              <Tooltip content={({ active, payload, label }) =>
                <ChartTooltip active={active} payload={payload} label={label} prefix="$" />
              } />
              <Area
                type="monotone"
                dataKey="mrr"
                name="MRR"
                stroke="#7c3aed"
                strokeWidth={2.5}
                fill="url(#mrrAreaGrad)"
                dot={{ r: 3.5, fill: '#7c3aed', strokeWidth: 0 }}
                activeDot={{ r: 5, fill: '#7c3aed', stroke: '#fff', strokeWidth: 2 }}
              />
              {currentMonthLabel && currMonthMrr != null && (
                <ReferenceDot x={currentMonthLabel} y={currMonthMrr} r={6} fill="#7c3aed" stroke="white" strokeWidth={2} />
              )}
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* ── Row 3: Bar chart + Donut ── */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        <div className="lg:col-span-3 bg-white rounded-2xl border border-gray-100 p-6">
          <p className="font-bold text-gray-900">Novas vs. Canceladas</p>
          <p className="text-xs text-gray-400 mt-0.5 mb-5">Últimos 6 meses</p>
          {loading ? <ChartSkeleton h={200} /> : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={monthlyFlow} barGap={4} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} width={28} />
                <Tooltip content={({ active, payload, label }) =>
                  <ChartTooltip active={active} payload={payload} label={label} />
                } />
                <Legend wrapperStyle={{ fontSize: 11, paddingTop: 12 }} formatter={v => <span className="text-gray-500">{v}</span>} />
                <Bar dataKey="novas"      name="Novas"      fill="#7c3aed" radius={[4,4,0,0]} maxBarSize={28} />
                <Bar dataKey="canceladas" name="Canceladas" fill="#f87171" radius={[4,4,0,0]} maxBarSize={28} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 p-6">
          <p className="font-bold text-gray-900">Distribuição</p>
          <p className="text-xs text-gray-400 mt-0.5 mb-5">Por status · {totalSubs} total</p>
          {loading ? <ChartSkeleton h={200} /> : statusPie.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-12">Sem assinaturas.</p>
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
                        const pct = totalSubs > 0 ? ((d.value / totalSubs) * 100).toFixed(0) : 0
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
                  <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">ativos</span>
                </div>
              </div>
              <div className="w-full space-y-2">
                {statusPie.map(entry => (
                  <div key={entry.name} className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: entry.color }} />
                    <span className="text-xs text-gray-600 flex-1">{entry.name}</span>
                    <span className="text-xs font-bold text-gray-800">{entry.value}</span>
                    <span className="text-xs text-gray-400 w-8 text-right">
                      {totalSubs > 0 ? `${((entry.value / totalSubs) * 100).toFixed(0)}%` : '—'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Row 4: Metric cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          icon={TrendingUp} iconColor="text-violet-600" bgColor="bg-violet-50"
          label="LTV Estimado"
          value={loading ? '—' : ltv}
          sub={loading ? undefined : ltvSub}
          loading={loading}
        />
        <MetricCard
          icon={CalendarCheck} iconColor="text-amber-500" bgColor="bg-amber-50"
          label="Próximas Renovações"
          value={loading ? '—' : `$${mrr.toFixed(2)}`}
          sub="Se nenhuma cancelar (30d)"
          loading={loading}
        />
        <MetricCard
          icon={TrendingDown} iconColor="text-red-500" bgColor="bg-red-50"
          label="Cancelamentos no Mês"
          value={loading ? '—' : canceledThisMonth}
          loading={loading}
        />
        <MetricCard
          icon={Percent} iconColor="text-orange-500" bgColor="bg-orange-50"
          label="Churn Rate Histórico"
          value={loading ? '—' : `${churnRate}%`}
          sub="Cancelados ÷ total rastreado"
          loading={loading}
        />
      </div>

      {/* ── Row 5: New subscriptions ── */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-9 h-9 rounded-xl bg-violet-50 flex items-center justify-center flex-shrink-0">
            <UserPlus className="w-[18px] h-[18px] text-violet-600" />
          </div>
          <div>
            <p className="font-bold text-gray-900">Novas Assinaturas</p>
            <p className="text-xs text-gray-400">Período de aquisição</p>
          </div>
        </div>
        {loading ? (
          <div className="animate-pulse grid grid-cols-3 gap-4">
            {[1,2,3].map(i => <div key={i} className="h-20 bg-gray-100 rounded-2xl" />)}
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-2 sm:gap-4">
            {[
              { label: 'Hoje',        value: newToday,    gradient: 'from-violet-500 to-purple-700' },
              { label: 'Esta semana', value: newThisWeek,  gradient: 'from-blue-500 to-indigo-600' },
              { label: 'Este mês',    value: newThisMonth, gradient: 'from-emerald-500 to-teal-600' },
            ].map(({ label, value, gradient }) => (
              <div
                key={label}
                className={`bg-gradient-to-br ${gradient} rounded-2xl p-3 sm:p-5 text-center text-white shadow-sm`}
              >
                <p className="text-2xl sm:text-4xl font-extrabold leading-none mb-1">{value}</p>
                <p className="text-[10px] sm:text-xs font-semibold text-white/70 uppercase tracking-wide">{label}</p>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  )
}
