import React, { useEffect, useState, useCallback } from 'react'
import {
  Activity, Clock, AlertTriangle, Star, Users,
} from 'lucide-react'
import { ArrowClockwise } from '@phosphor-icons/react'
import {
  ResponsiveContainer, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip,
} from 'recharts'
import MetricCard from './components/MetricCard'
import SectionHeader from './components/SectionHeader'
import ChartSkeleton from './components/ChartSkeleton'
import ChartTooltip from './components/ChartTooltip'
import ErrorBanner from './components/ErrorBanner'
import { useAdminFetch } from './hooks/useAdminFetch'

function fmtDate(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('pt-BR')
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
      setError(e?.message ?? 'Erro ao carregar dados de engajamento')
    } finally {
      setLoading(false)
    }
  }, [apiFetch])

  useEffect(() => { load() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const monthlySales = data?.monthlySales ?? []
  const atRiskUsers  = data?.atRiskUsers  ?? []
  const engagedUsers = data?.engagedUsers ?? []

  return (
    <div className="flex flex-col gap-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-extrabold text-gray-900">Atividade pós-compra</h1>
          <p className="text-sm text-gray-400 mt-0.5">Como as compradoras estão usando o app após a venda</p>
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
        <SectionHeader title="Métricas de uso" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard
            icon={Activity} iconBg="bg-emerald-50" iconColor="text-emerald-500"
            label="Taxa de uso (30 dias)"
            value={loading ? '—' : (data?.usageRate != null ? `${data.usageRate}%` : '—')}
            sub="Compradoras com acesso nos últimos 30 dias"
            loading={loading}
          />
          <MetricCard
            icon={Star} iconBg="bg-blue-50" iconColor="text-blue-500"
            label="Engajadas (7 dias)"
            value={loading ? '—' : (data?.engagedCount ?? 0)}
            sub="Acessaram nos últimos 7 dias"
            loading={loading}
          />
          <MetricCard
            icon={AlertTriangle} iconBg="bg-amber-50" iconColor="text-amber-500"
            label="Em risco (7+ dias)"
            value={loading ? '—' : (data?.atRiskCount ?? 0)}
            sub="Ativas sem acesso recente"
            loading={loading}
          />
          <MetricCard
            icon={Clock} iconBg="bg-red-50" iconColor="text-red-400"
            label="Nunca acessaram"
            value={loading ? '—' : (data?.neverAccessedCount ?? 0)}
            sub="Compraram mas não fizeram login"
            loading={loading}
          />
        </div>
      </section>

      {/* Monthly sales chart */}
      <section className="bg-white rounded-2xl border border-gray-100 p-5">
        <p className="font-bold text-gray-800 mb-4">Novas compradoras por mês</p>
        {loading ? (
          <ChartSkeleton h={200} />
        ) : monthlySales.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-12">Sem dados de vendas.</p>
        ) : (
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={monthlySales} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
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

      {/* At-risk users */}
      <section>
        <SectionHeader title="Em risco — ativas sem acesso há 7+ dias" />
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
                    {['Email', 'Dias sem acesso', 'Último acesso', 'Data da compra'].map(h => (
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
                      <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{fmtDate(u.purchaseDate)}</td>
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
        <SectionHeader title="Mais engajadas — acessaram nos últimos 7 dias" />
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-7 h-7 border-4 border-gray-200 border-t-violet-600 rounded-full animate-spin" />
            </div>
          ) : engagedUsers.length === 0 ? (
            <div className="py-12 text-center">
              <Star className="w-8 h-8 text-gray-200 mx-auto mb-2" />
              <p className="text-sm text-gray-400 font-medium">Nenhuma usuária engajada recentemente.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50">
                    {['Email', 'Último acesso', 'Dias desde a compra'].map(h => (
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
                      <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{fmtDate(u.lastAccess)}</td>
                      <td className="px-4 py-3 text-gray-500 tabular-nums">{u.daysSincePurchase ?? '—'} dias</td>
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
