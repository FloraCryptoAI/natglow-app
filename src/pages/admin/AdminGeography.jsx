import React, { useEffect, useState, useCallback, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAdminAuth } from '@/lib/AdminAuthContext'
import { AlertCircle, Globe, Users, TrendingUp, DollarSign, Target, MapPin } from 'lucide-react'
import { ArrowClockwise } from '@phosphor-icons/react'
import {
  ResponsiveContainer, Tooltip,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend,
} from 'recharts'

const NATGLOW_COLOR = '#0891b2'
const DETOX_COLOR   = '#7c3aed'

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

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-gray-900 text-white rounded-xl px-3 py-2.5 shadow-xl text-xs">
      <p className="font-bold mb-1">{label}</p>
      {payload.map(p => (
        <p key={p.dataKey} className="font-medium" style={{ color: p.color }}>
          {p.name}: {p.value}
        </p>
      ))}
    </div>
  )
}

function ChartSkeleton({ h = 200 }) {
  return <div className="animate-pulse bg-gray-50 rounded-xl" style={{ height: h }} />
}

function SectionHeader({ title, hint }) {
  return (
    <div className="mb-3">
      <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">{title}</p>
      {hint && <p className="text-[11px] text-gray-400 mt-0.5">{hint}</p>}
    </div>
  )
}

// Age bucket labels — must match the buckets used by QuizClean/QuizMeta/QuizDetox
const AGE_BUCKETS = ['18_29', '30_39', '40_49', '50_plus']
const AGE_LABELS = {
  '18_29':   '18–29 anos',
  '30_39':   '30–39 anos',
  '40_49':   '40–49 anos',
  '50_plus': '50+ anos',
}

// Color-code conversion rates so it's obvious which countries are winners/losers.
function convBadge(rate) {
  if (rate >= 5) return { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' }
  if (rate >= 2) return { bg: 'bg-amber-50',   text: 'text-amber-700',   border: 'border-amber-200' }
  if (rate > 0)  return { bg: 'bg-rose-50',    text: 'text-rose-700',    border: 'border-rose-200' }
  return { bg: 'bg-gray-50', text: 'text-gray-500', border: 'border-gray-200' }
}

export default function AdminGeography() {
  const { adminToken, clearAdminToken } = useAdminAuth()
  const navigate = useNavigate()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [sortKey, setSortKey] = useState('paid')  // paid | revenue | conv_rate | started | completion_rate
  const [minStarts, setMinStarts] = useState(0)

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
      const res = await fetch(`${baseUrl}/admin-geography`, { headers: authHeaders })
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
  }, [adminToken, clearAdminToken, navigate]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { load() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const totals        = data?.totals        ?? { started: 0, completed: 0, paid: 0, revenue: 0, conv_rate: 0, countries_with_traffic: 0 }
  const countries           = data?.countries           ?? []
  const countryAgeBreakdown = data?.countryAgeBreakdown ?? []
  const bestConverter = data?.bestConverter ?? null
  const monthlyTrend  = data?.monthlyTrend  ?? []
  const recent        = data?.recent        ?? { weekNatglow: 0, weekDetox: 0, monthNatglow: 0, monthDetox: 0, weekNatglowRevenue: 0, monthNatglowRevenue: 0 }
  const productPrice  = data?.product_price_usd ?? 17

  const filteredSortedCountries = useMemo(() => {
    const filtered = countries.filter(c => c.started >= minStarts)
    return [...filtered].sort((a, b) => {
      if (sortKey === 'conv_rate')       return b.conv_rate - a.conv_rate
      if (sortKey === 'revenue')         return b.revenue - a.revenue
      if (sortKey === 'started')         return b.started - a.started
      if (sortKey === 'completion_rate') return b.completion_rate - a.completion_rate
      return b.paid - a.paid  // default
    })
  }, [countries, sortKey, minStarts])

  const fmt$ = (n) => `$${Math.round(n).toLocaleString('pt-BR')}`

  return (
    <div className="flex flex-col gap-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-extrabold text-gray-900">Geografia & Conversão por País</h1>
          <p className="text-sm text-gray-400 mt-0.5">
            Onde investir mais em ads: taxa de conversão e receita por país
          </p>
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="flex items-center justify-center w-10 h-10 bg-white border border-gray-200 rounded-xl text-gray-400 hover:text-gray-700 hover:border-gray-300 transition-all disabled:opacity-40"
        >
          <ArrowClockwise size={16} weight="fill" className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-600 flex-1">{error}</p>
          <button onClick={load} className="text-sm font-semibold text-red-600 hover:text-red-700 flex items-center gap-1.5">
            <ArrowClockwise size={14} weight="fill" /> Tentar novamente
          </button>
        </div>
      )}

      {/* Summary cards */}
      <section>
        <SectionHeader title="Visão geral" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard
            icon={Globe} iconBg="bg-cyan-50" iconColor="text-cyan-500"
            label="Países com tráfego" loading={loading}
            value={totals.countries_with_traffic}
            sub={`${totals.started.toLocaleString('pt-BR')} quizes iniciados`}
          />
          <MetricCard
            icon={Target} iconBg="bg-violet-50" iconColor="text-violet-500"
            label="Conversão global" loading={loading}
            value={`${totals.conv_rate}%`}
            sub={`${totals.paid} compras de ${totals.started.toLocaleString('pt-BR')} quizes`}
          />
          <MetricCard
            icon={DollarSign} iconBg="bg-emerald-50" iconColor="text-emerald-500"
            label="Receita total" loading={loading}
            value={fmt$(totals.revenue)}
            sub="/quiz + Detox"
          />
          <MetricCard
            icon={TrendingUp} iconBg="bg-amber-50" iconColor="text-amber-500"
            label="Melhor país"  loading={loading}
            value={bestConverter ? `${bestConverter.nome}` : '—'}
            sub={bestConverter
              ? `${bestConverter.conv_rate}% · ${bestConverter.paid} venda${bestConverter.paid === 1 ? '' : 's'}`
              : 'Mín. 10 quizes p/ qualificar'}
          />
        </div>
      </section>

      {/* Recent window */}
      <section>
        <SectionHeader title="Vendas recentes (por funil)" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard
            icon={Users} iconBg="bg-cyan-50" iconColor="text-cyan-500"
            label="/quiz (esta semana)" value={recent.weekNatglow} loading={loading}
            sub={`${fmt$(recent.weekNatglowRevenue)} arrecadado`}
          />
          <MetricCard
            icon={Users} iconBg="bg-violet-50" iconColor="text-violet-500"
            label="Detox (esta semana)" value={recent.weekDetox} loading={loading}
            sub={`${fmt$(recent.weekDetox * productPrice)} arrecadado`}
          />
          <MetricCard
            icon={Users} iconBg="bg-cyan-50" iconColor="text-cyan-500"
            label="/quiz (este mês)" value={recent.monthNatglow} loading={loading}
            sub={`${fmt$(recent.monthNatglowRevenue)} arrecadado`}
          />
          <MetricCard
            icon={Users} iconBg="bg-violet-50" iconColor="text-violet-500"
            label="Detox (este mês)" value={recent.monthDetox} loading={loading}
            sub={`${fmt$(recent.monthDetox * productPrice)} arrecadado`}
          />
        </div>
      </section>

      {/* Monthly trend chart by funnel */}
      <section className="bg-white rounded-2xl border border-gray-100 p-5">
        <SectionHeader
          title="Tendência mensal (/quiz vs Detox)"
          hint="Vendas por funil nos últimos 6 meses"
        />
        {loading ? <ChartSkeleton h={220} /> : (
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={monthlyTrend} barGap={4} margin={{ top: 6, right: 8, bottom: 0, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} width={28} />
              <Tooltip content={<ChartTooltip />} />
              <Legend wrapperStyle={{ paddingTop: 8, fontSize: 12 }} iconType="circle" />
              <Bar dataKey="natglow" name="/quiz"       fill={NATGLOW_COLOR} radius={[4,4,0,0]} maxBarSize={42} />
              <Bar dataKey="detox"   name="Quiz Detox"  fill={DETOX_COLOR}   radius={[4,4,0,0]} maxBarSize={42} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </section>

      {/* Per-country table */}
      <section className="bg-white rounded-2xl border border-gray-100 p-5">
        <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
          <div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Detalhamento por país</p>
            <p className="text-[11px] text-gray-400 mt-0.5">Ordene para encontrar onde investir mais em ads</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <select
              value={sortKey}
              onChange={e => setSortKey(e.target.value)}
              className="text-xs border border-gray-200 rounded-lg px-3 py-2 bg-white text-gray-700 outline-none focus:border-violet-400"
            >
              <option value="paid">Mais vendas</option>
              <option value="revenue">Maior receita</option>
              <option value="conv_rate">Melhor conversão</option>
              <option value="started">Mais quizes iniciados</option>
              <option value="completion_rate">Melhor taxa de conclusão</option>
            </select>
            <select
              value={minStarts}
              onChange={e => setMinStarts(parseInt(e.target.value, 10))}
              className="text-xs border border-gray-200 rounded-lg px-3 py-2 bg-white text-gray-700 outline-none focus:border-violet-400"
            >
              <option value={0}>Todos os países</option>
              <option value={5}>Mín. 5 quizes</option>
              <option value={10}>Mín. 10 quizes</option>
              <option value={25}>Mín. 25 quizes</option>
            </select>
          </div>
        </div>

        {loading ? (
          <ChartSkeleton h={260} />
        ) : filteredSortedCountries.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-12">
            Sem dados ainda. Espere algumas sessões chegarem.
          </p>
        ) : (
          <div className="overflow-x-auto -mx-5 px-5">
            <table className="w-full text-sm min-w-[760px]">
              <thead>
                <tr className="border-b border-gray-100 text-[11px] uppercase tracking-wider text-gray-400">
                  <th className="text-left  font-bold py-2.5 pr-3">País</th>
                  <th className="text-right font-bold py-2.5 px-2">Quiz iniciado</th>
                  <th className="text-right font-bold py-2.5 px-2">Concluído</th>
                  <th className="text-right font-bold py-2.5 px-2">% concluiu</th>
                  <th className="text-right font-bold py-2.5 px-2">Vendas</th>
                  <th className="text-right font-bold py-2.5 px-2">Conv. %</th>
                  <th className="text-right font-bold py-2.5 px-2">Receita</th>
                  <th className="text-right font-bold py-2.5 pl-2">/quiz/Detox</th>
                </tr>
              </thead>
              <tbody>
                {filteredSortedCountries.map(c => {
                  const badge = convBadge(c.conv_rate)
                  return (
                    <tr key={c.pais} className="border-b border-gray-50 hover:bg-gray-50/50">
                      <td className="py-3 pr-3">
                        <div className="flex items-center gap-2">
                          <MapPin className="w-3.5 h-3.5 text-gray-400" />
                          <span className="font-semibold text-gray-800">{c.nome}</span>
                          <span className="text-[10px] text-gray-400 font-mono">{c.pais}</span>
                        </div>
                      </td>
                      <td className="py-3 px-2 text-right tabular-nums text-gray-700">{c.started.toLocaleString('pt-BR')}</td>
                      <td className="py-3 px-2 text-right tabular-nums text-gray-700">{c.completed.toLocaleString('pt-BR')}</td>
                      <td className="py-3 px-2 text-right tabular-nums text-gray-500">{c.completion_rate}%</td>
                      <td className="py-3 px-2 text-right tabular-nums font-semibold text-gray-900">{c.paid}</td>
                      <td className="py-3 px-2 text-right">
                        <span className={`inline-block px-2 py-0.5 rounded-full border text-xs font-bold tabular-nums ${badge.bg} ${badge.text} ${badge.border}`}>
                          {c.conv_rate}%
                        </span>
                      </td>
                      <td className="py-3 px-2 text-right tabular-nums font-bold text-emerald-600">
                        {c.revenue > 0 ? fmt$(c.revenue) : '—'}
                      </td>
                      <td className="py-3 pl-2 text-right">
                        {c.paid === 0 ? (
                          <span className="text-gray-300 text-xs">—</span>
                        ) : (
                          <div className="flex items-center justify-end gap-1.5 text-[11px]">
                            <span style={{ color: NATGLOW_COLOR }} className="font-semibold tabular-nums">Q {c.natglow_paid}</span>
                            <span className="text-gray-300">·</span>
                            <span style={{ color: DETOX_COLOR }}   className="font-semibold tabular-nums">D {c.detox_paid}</span>
                          </div>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        {!loading && filteredSortedCountries.length > 0 && (
          <div className="mt-4 pt-4 border-t border-gray-100 flex flex-wrap items-center gap-x-5 gap-y-2 text-[11px] text-gray-400">
            <span className="font-semibold">Legenda Conv. %:</span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block w-2 h-2 rounded-full bg-emerald-400" />
              ≥ 5% (excelente · escalar ads)
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block w-2 h-2 rounded-full bg-amber-400" />
              2–5% (ok · testar criativos)
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block w-2 h-2 rounded-full bg-rose-400" />
              &lt; 2% (caro · revisar)
            </span>
          </div>
        )}
      </section>

      {/* Per-country age cross-tab — which age converts best in each country.
          Required for FB Ads targeting where winning age varies by country
          (e.g. México 30-39 vs Argentina 40-49). Only renders countries
          with ≥10 leads (server-side filter) to avoid noise. */}
      {!loading && countryAgeBreakdown.length > 0 && (
        <section className="bg-white rounded-2xl border border-gray-100 p-5">
          <SectionHeader
            title="Conversão por idade em cada país"
            hint="Qual faixa etária converte melhor em cada país. Use para segmentar audiência por idade no Facebook Ads"
          />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {countryAgeBreakdown.map(c => {
              const topAge      = c.top_age
              const topAgeData  = topAge ? c.by_age[topAge] : null
              const maxConvRate = Math.max(...AGE_BUCKETS.map(a => c.by_age[a]?.conv_rate ?? 0), 0.1)
              return (
                <div key={c.pais} className="border border-gray-100 rounded-xl p-4">
                  {/* Country header */}
                  <div className="flex items-baseline justify-between gap-2 mb-1">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <MapPin className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                      <span className="font-bold text-gray-800 truncate">{c.nome}</span>
                      <span className="text-[10px] text-gray-400 font-mono">{c.pais}</span>
                    </div>
                    <span className="text-xs text-gray-500 tabular-nums flex-shrink-0">
                      {c.conv_rate}% · {fmt$(c.revenue)}
                    </span>
                  </div>

                  {/* Highlight: best-converting age */}
                  {topAge && topAgeData && topAgeData.paid > 0 ? (
                    <div className="my-3 px-3 py-2 rounded-lg bg-emerald-50/70 border border-emerald-100">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-700">
                        Idade que mais converte
                      </p>
                      <p className="text-sm font-bold text-emerald-700 tabular-nums">
                        {AGE_LABELS[topAge]} · {topAgeData.conv_rate}%
                        <span className="text-emerald-600 font-normal text-xs ml-1.5">
                          ({topAgeData.paid} de {topAgeData.started})
                        </span>
                      </p>
                    </div>
                  ) : (
                    <p className="my-3 text-[11px] text-gray-400 italic">Ainda sem conversão neste país.</p>
                  )}

                  {/* All ages */}
                  <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1.5">
                    Todas as idades
                  </p>
                  <div className="space-y-1.5">
                    {AGE_BUCKETS.map(age => {
                      const slot   = c.by_age[age]
                      if (!slot || slot.started === 0) return null
                      const isTop  = age === topAge
                      const pctBar = (slot.conv_rate / maxConvRate) * 100
                      return (
                        <div key={age} className="space-y-0.5">
                          <div className="flex items-baseline justify-between gap-2 text-xs">
                            <span className={`tabular-nums ${isTop ? 'font-bold text-emerald-700' : 'text-gray-600'}`}>
                              {AGE_LABELS[age]}
                            </span>
                            <span className={`tabular-nums ${isTop ? 'font-bold text-emerald-700' : 'text-gray-500'}`}>
                              {slot.conv_rate}%
                              <span className="text-gray-400 font-normal ml-1">({slot.paid}/{slot.started})</span>
                            </span>
                          </div>
                          <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${isTop ? 'bg-emerald-500' : 'bg-violet-400'}`}
                              style={{ width: `${pctBar}%` }}
                            />
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
          <p className="text-[10px] text-gray-400 mt-4 text-center">
            Só países com ≥10 leads aparecem · Idade que mais converte exige ≥5 leads naquela faixa
          </p>
        </section>
      )}
    </div>
  )
}
