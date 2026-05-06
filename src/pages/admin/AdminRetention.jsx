import React, { useEffect, useState, useCallback } from 'react'
import {
  TrendingDown, Clock,
  AlertTriangle, Star, Users,
} from 'lucide-react'
import { ArrowClockwise } from '@phosphor-icons/react'
import {
  ResponsiveContainer, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip,
} from 'recharts'
import MetricCard from './components/MetricCard'
import SectionHeader from './components/SectionHeader'
import ChartSkeleton from './components/ChartSkeleton'
import ErrorBanner from './components/ErrorBanner'
import { useAdminFetch } from './hooks/useAdminFetch'

function ChurnTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-gray-900 text-white rounded-xl px-3 py-2.5 shadow-xl text-xs">
      <p className="font-bold mb-1">{label}</p>
      {payload.map(p => (
        <p key={p.dataKey} className="font-medium" style={{ color: p.color }}>
          {p.name}: {p.value}{typeof p.value === 'number' && p.dataKey === 'churnRate' ? '%' : ''}
        </p>
      ))}
    </div>
  )
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
  const { apiFetch } = useAdminFetch()
  const [data, setData]       = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await apiFetch('/admin-retention')
      if (!result) return
      setData(result)
    } catch (e) {
      setError(e?.message ?? 'Erro ao carregar dados de retenção')
    } finally {
      setLoading(false)
    }
  }, [apiFetch])

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
          <h1 className="text-xl font-extrabold text-gray-900">Retenção e Churn</h1>
          <p className="text-sm text-gray-400 mt-0.5">Engajamento e comportamento das assinantes</p>
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="flex items-center justify-center w-10 h-10 bg-white border border-gray-200 rounded-xl text-gray-400 hover:text-gray-700 hover:border-gray-300 transition-all disabled:opacity-40"
        >
          <ArrowClockwise size={16} weight="fill" className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {error && <ErrorBanner message={error} onRetry={load} />}

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
      <section className="bg-white rounded-2xl border border-gray-100 p-5">
        <p className="font-bold text-gray-800 mb-4">Taxa de cancelamento por mês</p>
        {loading ? (
          <ChartSkeleton h={200} />
        ) : monthlyChurn.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-12">Sem dados de cancelamento.</p>
        ) : (
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={monthlyChurn} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
              <YAxis
                tickFormatter={v => `${v}%`}
                tick={{ fontSize: 11, fill: '#9ca3af' }}
                axisLine={false} tickLine={false} width={40}
              />
              <Tooltip content={<ChurnTooltip />} />
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
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="w-7 h-7 border-4 border-gray-200 border-t-violet-600 rounded-full animate-spin" />
            </div>
          ) : atRiskUsers.length === 0 ? (
            <div className="py-12 text-center">
              <Users className="w-8 h-8 text-gray-200 mx-auto mb-2" />
              <p className="text-sm text-gray-400 font-medium">Nenhuma usuária em risco.</p>
              <p className="text-xs text-gray-300 mt-0.5">Todas as ativas acessaram nos últimos 7 dias.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50">
                    {['Email', 'Dias sem acesso', 'Último acesso', 'Próxima cobrança'].map(h => (
                      <th key={h} className="text-left px-4 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {atRiskUsers.map((u, i) => (
                    <tr key={u.userId ?? i} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 text-gray-700 font-medium max-w-[200px] truncate">{u.email ?? '—'}</td>
                      <td className="px-4 py-3">
                        <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                          u.daysSinceAccess == null
                            ? 'bg-gray-100 text-gray-500'
                            : u.daysSinceAccess >= 30
                              ? 'bg-red-50 text-red-600'
                              : 'bg-amber-50 text-amber-600'
                        }`}>
                          {u.daysSinceAccess == null ? 'Nunca acessou' : `${u.daysSinceAccess} dias`}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{fmtDate(u.lastAccess)}</td>
                      <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{fmtNextBilling(u.nextBilling)}</td>
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
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-7 h-7 border-4 border-gray-200 border-t-violet-600 rounded-full animate-spin" />
            </div>
          ) : engagedUsers.length === 0 ? (
            <div className="py-12 text-center">
              <Star className="w-8 h-8 text-gray-200 mx-auto mb-2" />
              <p className="text-sm text-gray-400 font-medium">Nenhuma usuária completou o plano ainda.</p>
              <p className="text-xs text-gray-300 mt-0.5">Aparecem aqui após 84 dias ativas.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50">
                    {['Email', 'Data de conclusão das 4 fases'].map(h => (
                      <th key={h} className="text-left px-4 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {engagedUsers.map((u, i) => (
                    <tr key={u.email ?? i} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 text-gray-700 font-medium max-w-[260px] truncate">
                        <div className="flex items-center gap-2">
                          <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400 flex-shrink-0" />
                          {u.email ?? '—'}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{fmtDate(u.completionDate)}</td>
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
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-7 h-7 border-4 border-gray-200 border-t-violet-600 rounded-full animate-spin" />
            </div>
          ) : cohortData.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-10">Sem dados de cohort.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50">
                    <th className="text-left px-4 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">Mês de entrada</th>
                    <th className="text-left px-4 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">Assinantes</th>
                    <th className="text-left px-4 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">M0</th>
                    <th className="text-left px-4 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">M1</th>
                    <th className="text-left px-4 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">M2</th>
                    <th className="text-left px-4 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">M3</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {cohortData.map((row, i) => {
                    const m0 = cohortCell(row.m0)
                    const m1 = cohortCell(row.m1)
                    const m2 = cohortCell(row.m2)
                    const m3 = cohortCell(row.m3)
                    return (
                      <tr key={i} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3 font-semibold text-gray-700">{row.label}</td>
                        <td className="px-4 py-3 text-gray-500 tabular-nums">{row.size}</td>
                        <td className="px-4 py-3 tabular-nums">
                          <span className="text-emerald-600 font-bold">{m0.text}</span>
                        </td>
                        <td className="px-4 py-3 tabular-nums">
                          <span className={row.m1 != null ? m1.cls : 'text-gray-300'}>{m1.text}</span>
                        </td>
                        <td className="px-4 py-3 tabular-nums">
                          <span className={row.m2 != null ? m2.cls : 'text-gray-300'}>{m2.text}</span>
                        </td>
                        <td className="px-4 py-3 tabular-nums">
                          <span className={row.m3 != null ? m3.cls : 'text-gray-300'}>{m3.text}</span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
              <p className="text-xs text-gray-400 px-4 py-3 border-t border-gray-50">
                M0 = mês de entrada · M1/M2/M3 = % ainda ativas 1/2/3 meses depois · "—" = dados futuros
              </p>
            </div>
          )}
        </div>
      </section>
    </div>
  )
}
