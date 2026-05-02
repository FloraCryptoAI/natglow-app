import React, { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAdminAuth } from '@/lib/AdminAuthContext'
import {
  Users, CreditCard, TrendingUp, TrendingDown,
  UserPlus, Percent, RefreshCw, AlertCircle,
  DollarSign, CalendarCheck, Info,
} from 'lucide-react'
import {
  ResponsiveContainer, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ReferenceDot,
} from 'recharts'

const PLAN_PRICE = 6.99

function startOfDay() {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d
}

function startOfWeek() {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  d.setDate(d.getDate() - d.getDay())
  return d
}

function startOfMonth() {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  d.setDate(1)
  return d
}

function MetricCard({ icon: Icon, iconBg, iconColor, label, value, sub, loading, tooltip }) {
  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-stone-100 p-5 animate-pulse">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-9 h-9 rounded-xl bg-stone-100 flex-shrink-0" />
          <div className="h-3.5 bg-stone-100 rounded w-28" />
        </div>
        <div className="h-8 bg-stone-100 rounded w-20" />
        {sub !== undefined && <div className="h-3 bg-stone-100 rounded w-24 mt-2" />}
      </div>
    )
  }
  return (
    <div className="bg-white rounded-2xl border border-stone-100 p-5">
      <div className="flex items-center gap-3 mb-3">
        <div className={`w-9 h-9 rounded-xl ${iconBg} flex items-center justify-center flex-shrink-0`}>
          <Icon className={`w-[18px] h-[18px] ${iconColor}`} />
        </div>
        <span className="text-sm text-stone-500 font-medium leading-tight flex-1">{label}</span>
        {tooltip && (
          <span title={tooltip} className="cursor-help text-stone-300 hover:text-stone-500 transition-colors flex-shrink-0">
            <Info className="w-3.5 h-3.5" />
          </span>
        )}
      </div>
      <p className="text-3xl font-extrabold text-stone-900 tracking-tight">{value}</p>
      {sub && <p className="text-xs text-stone-400 mt-1">{sub}</p>}
    </div>
  )
}

function ErrorBanner({ message, onRetry }) {
  return (
    <div className="bg-red-50 border border-red-200 rounded-2xl p-4 flex items-start gap-3">
      <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
      <p className="text-sm text-red-600 flex-1">{message}</p>
      <button
        onClick={onRetry}
        className="text-sm font-semibold text-red-600 hover:text-red-700 flex items-center gap-1.5 flex-shrink-0"
      >
        <RefreshCw className="w-3.5 h-3.5" />
        Tentar novamente
      </button>
    </div>
  )
}

function StatusBreakdown({ subscriptions }) {
  const counts = subscriptions.reduce((acc, s) => {
    acc[s.status] = (acc[s.status] ?? 0) + 1
    return acc
  }, {})
  const total = subscriptions.length

  const rows = [
    { status: 'active',   label: 'Ativos',     color: 'bg-emerald-500' },
    { status: 'canceled', label: 'Cancelados',  color: 'bg-red-400' },
    { status: 'past_due', label: 'Em atraso',   color: 'bg-amber-400' },
    { status: 'inactive', label: 'Inativos',    color: 'bg-stone-300' },
  ]

  if (total === 0) {
    return <p className="text-sm text-stone-400 text-center py-4">Nenhuma assinatura ainda.</p>
  }

  return (
    <div className="space-y-3">
      {rows.map(({ status, label, color }) => {
        const count = counts[status] ?? 0
        const pct = total > 0 ? (count / total) * 100 : 0
        return (
          <div key={status} className="flex items-center gap-3">
            <span className="text-sm text-stone-600 font-medium w-24 flex-shrink-0">{label}</span>
            <div className="flex-1 h-2 bg-stone-100 rounded-full overflow-hidden">
              <div
                className={`h-full ${color} rounded-full transition-all duration-500`}
                style={{ width: `${pct}%` }}
              />
            </div>
            <span className="text-sm font-bold text-stone-700 w-8 text-right">{count}</span>
          </div>
        )
      })}
    </div>
  )
}

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white border border-stone-100 rounded-xl px-3 py-2 shadow-lg text-sm">
      <p className="font-bold text-stone-700 mb-1">{label}</p>
      {payload.map(p => (
        <p key={p.dataKey} className="font-medium" style={{ color: p.color }}>
          {p.name}: ${p.value}
        </p>
      ))}
    </div>
  )
}

function ChartSkeleton({ h = 200 }) {
  return <div className="animate-pulse bg-stone-50 rounded-xl" style={{ height: h }} />
}

export default function AdminOverview() {
  const { adminToken, clearAdminToken } = useAdminAuth()
  const navigate = useNavigate()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
      const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY
      const res = await fetch(`${supabaseUrl}/functions/v1/admin-data`, {
        headers: {
          Authorization: `Bearer ${supabaseAnonKey}`,
          apikey: supabaseAnonKey,
          'x-admin-token': adminToken,
          'Content-Type': 'application/json',
        },
      })
      if (res.status === 401 || res.status === 403) {
        clearAdminToken()
        navigate('/admin/login', { replace: true })
        return
      }
      const result = await res.json()
      if (result?.error) throw new Error(result.error)
      setData(result)
    } catch (e) {
      setError(e?.message ?? 'Erro ao carregar dados')
    } finally {
      setLoading(false)
    }
  }, [adminToken, clearAdminToken, navigate])

  useEffect(() => { load() }, [load])

  const subs = data?.subscriptions ?? []
  const activeCount = data?.activeCount ?? 0
  const totalUsers = data?.totalUsers ?? 0
  const canceledCount = data?.canceledCount ?? 0
  const pastDueCount = data?.pastDueCount ?? 0
  const canceledThisMonth = data?.canceledThisMonth ?? 0
  const totalRevenue = data?.totalRevenue ?? 0
  const mrrHistory12 = data?.mrrHistory12 ?? []
  const mrr = activeCount * PLAN_PRICE

  const todayStart = startOfDay()
  const weekStart = startOfWeek()
  const monthStart = startOfMonth()

  const newToday = subs.filter(s => new Date(s.created_at) >= todayStart).length
  const newThisWeek = subs.filter(s => new Date(s.created_at) >= weekStart).length
  const newThisMonth = subs.filter(s => new Date(s.created_at) >= monthStart).length

  const totalTracked = activeCount + canceledCount + pastDueCount
  const churnRateNum = totalTracked > 0 ? (canceledCount / totalTracked) * 100 : 0
  const churnRate = churnRateNum.toFixed(1)
  const conversionRate = totalUsers > 0
    ? ((activeCount / totalUsers) * 100).toFixed(1)
    : '0.0'

  const ltv = churnRateNum > 0
    ? `$${(PLAN_PRICE / (churnRateNum / 100)).toFixed(2)}`
    : 'Em cálculo'
  const ltvSub = churnRateNum > 0
    ? `$${PLAN_PRICE} ÷ ${churnRate}% churn`
    : 'Churn rate = 0%'

  const currentMonthLabel = mrrHistory12[mrrHistory12.length - 1]?.label
  const currentMonthMrr   = mrrHistory12[mrrHistory12.length - 1]?.mrr

  return (
    <div className="flex flex-col gap-6 max-w-5xl">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-extrabold text-stone-900">Visão Geral</h1>
          <p className="text-sm text-stone-400 mt-0.5">Métricas em tempo real do NatGlow</p>
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="flex items-center gap-2 text-sm font-semibold text-stone-500 hover:text-stone-800 bg-white border border-stone-200 rounded-xl px-3 py-2 transition-all disabled:opacity-40"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          Atualizar
        </button>
      </div>

      {error && <ErrorBanner message={error} onRetry={load} />}

      {/* Primary metrics */}
      <section>
        <p className="text-xs font-bold text-stone-400 uppercase tracking-wider mb-3">Principal</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <MetricCard
            icon={CreditCard}
            iconBg="bg-brand-pale"
            iconColor="text-brand"
            label="Assinantes ativos"
            value={loading ? '—' : activeCount}
            loading={loading}
          />
          <MetricCard
            icon={TrendingUp}
            iconBg="bg-emerald-50"
            iconColor="text-emerald-500"
            label="MRR atual"
            value={loading ? '—' : `$${mrr.toFixed(2)}`}
            sub={`${activeCount} × $${PLAN_PRICE}/mês`}
            loading={loading}
          />
          <MetricCard
            icon={Percent}
            iconBg="bg-blue-50"
            iconColor="text-blue-500"
            label="Taxa de conversão"
            value={loading ? '—' : `${conversionRate}%`}
            sub={`${activeCount} ativos de ${totalUsers} usuários`}
            loading={loading}
          />
        </div>
      </section>

      {/* New subscribers */}
      <section>
        <p className="text-xs font-bold text-stone-400 uppercase tracking-wider mb-3">Novas assinaturas</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <MetricCard
            icon={UserPlus}
            iconBg="bg-violet-50"
            iconColor="text-violet-500"
            label="Hoje"
            value={loading ? '—' : newToday}
            loading={loading}
          />
          <MetricCard
            icon={UserPlus}
            iconBg="bg-violet-50"
            iconColor="text-violet-500"
            label="Esta semana"
            value={loading ? '—' : newThisWeek}
            loading={loading}
          />
          <MetricCard
            icon={UserPlus}
            iconBg="bg-violet-50"
            iconColor="text-violet-500"
            label="Este mês"
            value={loading ? '—' : newThisMonth}
            loading={loading}
          />
        </div>
      </section>

      {/* Churn & retention */}
      <section>
        <p className="text-xs font-bold text-stone-400 uppercase tracking-wider mb-3">Retenção</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <MetricCard
            icon={TrendingDown}
            iconBg="bg-red-50"
            iconColor="text-red-400"
            label="Cancelamentos este mês"
            value={loading ? '—' : canceledThisMonth}
            loading={loading}
          />
          <MetricCard
            icon={TrendingDown}
            iconBg="bg-amber-50"
            iconColor="text-amber-500"
            label="Churn rate histórico"
            value={loading ? '—' : `${churnRate}%`}
            sub="Cancelados ÷ (ativos + cancelados + atraso)"
            loading={loading}
          />
        </div>
      </section>

      {/* Financial extra cards */}
      <section>
        <p className="text-xs font-bold text-stone-400 uppercase tracking-wider mb-3">Financeiro</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <MetricCard
            icon={DollarSign}
            iconBg="bg-violet-50"
            iconColor="text-violet-500"
            label="Receita total acumulada"
            value={loading ? '—' : `$${totalRevenue.toFixed(2)}`}
            sub="Todos os pagamentos recebidos"
            loading={loading}
          />
          <MetricCard
            icon={TrendingUp}
            iconBg="bg-teal-50"
            iconColor="text-teal-500"
            label="LTV médio estimado"
            value={loading ? '—' : ltv}
            sub={loading ? undefined : ltvSub}
            loading={loading}
            tooltip="LTV = MRR por cliente ÷ churn rate. Estimativa baseada no churn rate histórico acumulado."
          />
          <MetricCard
            icon={CalendarCheck}
            iconBg="bg-orange-50"
            iconColor="text-orange-500"
            label="Próximas renovações (30d)"
            value={loading ? '—' : `$${(activeCount * PLAN_PRICE).toFixed(2)}`}
            sub="Se nenhuma assinante cancelar"
            loading={loading}
          />
        </div>
      </section>

      {/* MRR 12-month chart */}
      <section className="bg-white rounded-2xl border border-stone-100 p-5">
        <p className="font-bold text-stone-800 mb-1">Evolução do MRR</p>
        <p className="text-xs text-stone-400 mb-4">Últimos 12 meses</p>
        {loading ? (
          <ChartSkeleton h={220} />
        ) : mrrHistory12.length === 0 ? (
          <p className="text-sm text-stone-400 text-center py-12">Sem dados no período.</p>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={mrrHistory12} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
              <defs>
                <linearGradient id="mrrLineGrad" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%"   stopColor="#7c3aed" />
                  <stop offset="100%" stopColor="#a855f7" />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f5f5f4" vertical={false} />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 11, fill: '#a8a29e' }}
                axisLine={false} tickLine={false}
              />
              <YAxis
                tickFormatter={v => `$${v}`}
                tick={{ fontSize: 11, fill: '#a8a29e' }}
                axisLine={false} tickLine={false} width={52}
              />
              <Tooltip content={<ChartTooltip />} />
              <Line
                type="monotone" dataKey="mrr" name="MRR"
                stroke="url(#mrrLineGrad)" strokeWidth={2.5}
                dot={{ r: 3.5, fill: '#7c3aed', strokeWidth: 0 }}
                activeDot={{ r: 5, fill: '#7c3aed' }}
              />
              {currentMonthLabel && currentMonthMrr != null && (
                <ReferenceDot
                  x={currentMonthLabel} y={currentMonthMrr}
                  r={7} fill="#7c3aed" stroke="white" strokeWidth={2.5}
                />
              )}
            </LineChart>
          </ResponsiveContainer>
        )}
      </section>

      {/* Status breakdown */}
      <section className="bg-white rounded-2xl border border-stone-100 p-5">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0">
            <Users className="w-[18px] h-[18px] text-blue-500" />
          </div>
          <p className="font-bold text-stone-800">Distribuição por status</p>
          {!loading && (
            <span className="ml-auto text-sm text-stone-400 font-medium">
              {subs.length} total
            </span>
          )}
        </div>
        {loading ? (
          <div className="space-y-3 animate-pulse">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="flex items-center gap-3">
                <div className="h-4 bg-stone-100 rounded w-20 flex-shrink-0" />
                <div className="flex-1 h-2 bg-stone-100 rounded-full" />
                <div className="h-4 bg-stone-100 rounded w-6" />
              </div>
            ))}
          </div>
        ) : (
          <StatusBreakdown subscriptions={subs} />
        )}
      </section>
    </div>
  )
}
