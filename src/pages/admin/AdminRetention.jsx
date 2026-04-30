import React, { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAdminAuth } from '@/lib/AdminAuthContext'
import {
  RefreshCw, AlertCircle, TrendingDown, Clock,
  AlertTriangle, Star, Users,
} from 'lucide-react'
import {
  ResponsiveContainer, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip,
} from 'recharts'

function MetricCard({ icon: Icon, iconBg, iconColor, label, value, sub, loading }) {
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
        <span className="text-sm text-stone-500 font-medium leading-tight">{label}</span>
      </div>
      <p className="text-3xl font-extrabold text-stone-900 tracking-tight">{value}</p>
      {sub && <p className="text-xs text-stone-400 mt-1">{sub}</p>}
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
          {p.name}: {p.value}{typeof p.value === 'number' && p.dataKey === 'churnRate' ? '%' : ''}
        </p>
      ))}
    </div>
  )
}

function SectionHeader({ title }) {
  return <p className="text-xs font-bold text-stone-400 uppercase tracking-wider mb-3">{title}</p>
}

function ChartSkeleton({ h = 200 }) {
  return <div className="animate-pulse bg-stone-50 rounded-xl" style={{ height: h }} />
}

function fmtDate(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('pt-BR')
}

function fmtNextBilling(val) {
  if (!val) return '—'
  const d = new Date(val)
  return isNaN(d.getTime()) ? '—' : d.toLocaleDateString('pt-BR')
}

function cohortCell(val) {
  if (val === null || val === undefined) return '—'
  const n = Number(val)
  if (n >= 80) return { text: `${n}%`, cls: 'text-emerald-600 font-bold' }
  if (n >= 60) return { text: `${n}%`, cls: 'text-amber-600 font-bold' }
  return { text: `${n}%`, cls: 'text-red-500 font-bold' }
}

export default function AdminRetention() {
  const { adminToken, clearAdminToken } = useAdminAuth()
  const navigate = useNavigate()
  const [data, setData]       = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState(null)

  const baseUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1`
  const authHeaders = {
    Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
    apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
    'x-admin-token': adminToken,
    'Content-Type': 'application/json',
  }

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`${baseUrl}/admin-retention`, { headers: authHeaders })
      if (res.status === 401 || res.status === 403) {
        clearAdminToken(); navigate('/admin/login', { replace: true }); return
      }
      const result = await res.json()
      if (result?.error) throw new Error(result.error)
      setData(result)
    } catch (e) {
      setError(e?.message ?? 'Erro ao carregar dados de retenção')
    } finally {
      setLoading(false)
    }
  }, [adminToken, clearAdminToken, navigate]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { load() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const monthlyChurn = data?.monthlyChurn  ?? []
  const atRiskUsers  = data?.atRiskUsers   ?? []
  const engagedUsers = data?.engagedUsers  ?? []
  const cohortData   = data?.cohortData    ?? []

  const avgChurn = monthlyChurn.length > 0
    ? (monthlyChurn.reduce((s, m) => s + m.churnRate, 0) / monthlyChurn.length).toFixed(1)
    : null

  return (
    <div className="flex flex-col gap-6 max-w-5xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-extrabold text-stone-900">Retenção e Churn</h1>
          <p className="text-sm text-stone-400 mt-0.5">Engajamento e comportamento das assinantes</p>
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

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-600 flex-1">{error}</p>
          <button
            onClick={load}
            className="text-sm font-semibold text-red-600 hover:text-red-700 flex items-center gap-1.5 flex-shrink-0"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Tentar novamente
          </button>
        </div>
      )}

      {/* Metric cards */}
      <section>
        <SectionHeader title="Métricas de retenção" />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <MetricCard
            icon={TrendingDown} iconBg="bg-red-50" iconColor="text-red-400"
            label="Churn médio mensal"
            value={loading ? '—' : (avgChurn !== null ? `${avgChurn}%` : '—')}
            sub="Média dos últimos 6 meses"
            loading={loading}
          />
          <MetricCard
            icon={Clock} iconBg="bg-amber-50" iconColor="text-amber-500"
            label="Tempo médio antes de cancelar"
            value={loading ? '—' : (data?.avgDaysBeforeCancel != null ? `${data.avgDaysBeforeCancel} dias` : '—')}
            sub="Entre assinar e cancelar"
            loading={loading}
          />
          <MetricCard
            icon={AlertTriangle} iconBg="bg-orange-50" iconColor="text-orange-400"
            label="Em risco (7+ dias sem acesso)"
            value={loading ? '—' : atRiskUsers.length}
            sub="Ativas mas sem engajamento recente"
            loading={loading}
          />
        </div>
      </section>

      {/* Churn chart */}
      <section className="bg-white rounded-2xl border border-stone-100 p-5">
        <p className="font-bold text-stone-800 mb-4">Taxa de cancelamento por mês</p>
        {loading ? (
          <ChartSkeleton h={200} />
        ) : monthlyChurn.length === 0 ? (
          <p className="text-sm text-stone-400 text-center py-12">Sem dados de cancelamento.</p>
        ) : (
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={monthlyChurn} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f5f5f4" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#a8a29e' }} axisLine={false} tickLine={false} />
              <YAxis
                tickFormatter={v => `${v}%`}
                tick={{ fontSize: 11, fill: '#a8a29e' }}
                axisLine={false} tickLine={false} width={40}
              />
              <Tooltip content={({ active, payload, label }) => (
                <ChartTooltip active={active} payload={payload} label={label} />
              )} />
              <Bar
                dataKey="churnRate" name="Churn rate"
                fill="#f97316" radius={[4, 4, 0, 0]} maxBarSize={40}
              />
            </BarChart>
          </ResponsiveContainer>
        )}
      </section>

      {/* At-risk users */}
      <section>
        <SectionHeader title="Usuárias em risco — ativas sem acesso há 7+ dias" />
        <div className="bg-white rounded-2xl border border-stone-100 overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="w-7 h-7 border-4 border-stone-200 border-t-stone-700 rounded-full animate-spin" />
            </div>
          ) : atRiskUsers.length === 0 ? (
            <div className="py-12 text-center">
              <Users className="w-8 h-8 text-stone-200 mx-auto mb-2" />
              <p className="text-sm text-stone-400 font-medium">Nenhuma usuária em risco.</p>
              <p className="text-xs text-stone-300 mt-0.5">Todas as ativas acessaram nos últimos 7 dias.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-stone-100 bg-stone-50">
                    {['Email', 'Dias sem acesso', 'Último acesso', 'Próxima cobrança'].map(h => (
                      <th key={h} className="text-left px-4 py-3 text-xs font-bold text-stone-500 uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-50">
                  {atRiskUsers.map((u, i) => (
                    <tr key={u.userId ?? i} className="hover:bg-stone-50 transition-colors">
                      <td className="px-4 py-3 text-stone-700 font-medium max-w-[200px] truncate">{u.email ?? '—'}</td>
                      <td className="px-4 py-3">
                        <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                          u.daysSinceAccess == null
                            ? 'bg-stone-100 text-stone-500'
                            : u.daysSinceAccess >= 30
                              ? 'bg-red-50 text-red-600'
                              : 'bg-amber-50 text-amber-600'
                        }`}>
                          {u.daysSinceAccess == null ? 'Nunca acessou' : `${u.daysSinceAccess} dias`}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-stone-500 whitespace-nowrap">{fmtDate(u.lastAccess)}</td>
                      <td className="px-4 py-3 text-stone-500 whitespace-nowrap">{fmtNextBilling(u.nextBilling)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>

      {/* Engaged users */}
      <section>
        <SectionHeader title="Usuárias engajadas — completaram as 4 fases (84 dias)" />
        <div className="bg-white rounded-2xl border border-stone-100 overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-7 h-7 border-4 border-stone-200 border-t-stone-700 rounded-full animate-spin" />
            </div>
          ) : engagedUsers.length === 0 ? (
            <div className="py-12 text-center">
              <Star className="w-8 h-8 text-stone-200 mx-auto mb-2" />
              <p className="text-sm text-stone-400 font-medium">Nenhuma usuária completou o plano ainda.</p>
              <p className="text-xs text-stone-300 mt-0.5">Aparecem aqui após 84 dias ativas.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-stone-100 bg-stone-50">
                    {['Email', 'Data de conclusão das 4 fases'].map(h => (
                      <th key={h} className="text-left px-4 py-3 text-xs font-bold text-stone-500 uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-50">
                  {engagedUsers.map((u, i) => (
                    <tr key={u.email ?? i} className="hover:bg-stone-50 transition-colors">
                      <td className="px-4 py-3 text-stone-700 font-medium max-w-[260px] truncate">
                        <div className="flex items-center gap-2">
                          <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400 flex-shrink-0" />
                          {u.email ?? '—'}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-stone-500 whitespace-nowrap">{fmtDate(u.completionDate)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>

      {/* Cohort retention */}
      <section>
        <SectionHeader title="Cohort de retenção" />
        <div className="bg-white rounded-2xl border border-stone-100 overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-7 h-7 border-4 border-stone-200 border-t-stone-700 rounded-full animate-spin" />
            </div>
          ) : cohortData.length === 0 ? (
            <p className="text-sm text-stone-400 text-center py-10">Sem dados de cohort.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-stone-100 bg-stone-50">
                    <th className="text-left px-4 py-3 text-xs font-bold text-stone-500 uppercase tracking-wider">Mês de entrada</th>
                    <th className="text-left px-4 py-3 text-xs font-bold text-stone-500 uppercase tracking-wider">Assinantes</th>
                    <th className="text-left px-4 py-3 text-xs font-bold text-stone-500 uppercase tracking-wider">M0</th>
                    <th className="text-left px-4 py-3 text-xs font-bold text-stone-500 uppercase tracking-wider">M1</th>
                    <th className="text-left px-4 py-3 text-xs font-bold text-stone-500 uppercase tracking-wider">M2</th>
                    <th className="text-left px-4 py-3 text-xs font-bold text-stone-500 uppercase tracking-wider">M3</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-50">
                  {cohortData.map((row, i) => {
                    const m0 = cohortCell(row.m0)
                    const m1 = cohortCell(row.m1)
                    const m2 = cohortCell(row.m2)
                    const m3 = cohortCell(row.m3)
                    return (
                      <tr key={i} className="hover:bg-stone-50 transition-colors">
                        <td className="px-4 py-3 font-semibold text-stone-700">{row.label}</td>
                        <td className="px-4 py-3 text-stone-500 tabular-nums">{row.size}</td>
                        <td className="px-4 py-3 tabular-nums">
                          <span className="text-emerald-600 font-bold">{m0.text}</span>
                        </td>
                        <td className="px-4 py-3 tabular-nums">
                          <span className={row.m1 != null ? m1.cls : 'text-stone-300'}>{m1.text}</span>
                        </td>
                        <td className="px-4 py-3 tabular-nums">
                          <span className={row.m2 != null ? m2.cls : 'text-stone-300'}>{m2.text}</span>
                        </td>
                        <td className="px-4 py-3 tabular-nums">
                          <span className={row.m3 != null ? m3.cls : 'text-stone-300'}>{m3.text}</span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
              <p className="text-xs text-stone-400 px-4 py-3 border-t border-stone-50">
                M0 = mês de entrada · M1/M2/M3 = % ainda ativas 1/2/3 meses depois · "—" = dados futuros
              </p>
            </div>
          )}
        </div>
      </section>
    </div>
  )
}
