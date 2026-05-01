import React, { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAdminAuth } from '@/lib/AdminAuthContext'
import { RefreshCw, AlertCircle, Globe, Users, TrendingUp, UserPlus } from 'lucide-react'
import {
  ResponsiveContainer, PieChart, Pie, Cell, Tooltip,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend,
  LineChart, Line,
} from 'recharts'

const LANG_COLORS = { es: '#10b981', en: '#6366f1' }

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
          {p.name}: {p.value}
        </p>
      ))}
    </div>
  )
}

function ChartSkeleton({ h = 200 }) {
  return <div className="animate-pulse bg-stone-50 rounded-xl" style={{ height: h }} />
}

function SectionHeader({ title }) {
  return <p className="text-xs font-bold text-stone-400 uppercase tracking-wider mb-3">{title}</p>
}

function LangPie({ langStarts }) {
  const total = (langStarts?.es ?? 0) + (langStarts?.en ?? 0)
  if (total === 0) return <p className="text-sm text-stone-400 text-center py-8">Sem dados ainda.</p>

  const pieData = [
    { name: 'Espanhol (ES)', value: langStarts.es, color: LANG_COLORS.es },
    { name: 'Inglês (EN)', value: langStarts.en, color: LANG_COLORS.en },
  ]

  const CustomLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent, index }) => {
    if (percent < 0.05) return null
    const RADIAN = Math.PI / 180
    const r = innerRadius + (outerRadius - innerRadius) * 0.5
    const x = cx + r * Math.cos(-midAngle * RADIAN)
    const y = cy + r * Math.sin(-midAngle * RADIAN)
    return (
      <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" fontSize={13} fontWeight={700}>
        {`${(percent * 100).toFixed(0)}%`}
      </text>
    )
  }

  return (
    <div className="flex flex-col sm:flex-row items-center gap-6">
      <div className="w-full sm:w-48 flex-shrink-0">
        <ResponsiveContainer width="100%" height={180}>
          <PieChart>
            <Pie
              data={pieData} cx="50%" cy="50%"
              innerRadius={44} outerRadius={80}
              dataKey="value" labelLine={false}
              label={CustomLabel}
            >
              {pieData.map((entry, i) => (
                <Cell key={i} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null
                const d = payload[0]
                return (
                  <div className="bg-white border border-stone-100 rounded-xl px-3 py-2 shadow-lg text-sm">
                    <p className="font-bold" style={{ color: d.payload.color }}>{d.name}</p>
                    <p className="text-stone-700">{d.value} sessões</p>
                  </div>
                )
              }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div className="flex flex-col gap-3 flex-1">
        {pieData.map(d => (
          <div key={d.name} className="flex items-center gap-3">
            <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: d.color }} />
            <span className="text-sm text-stone-600 flex-1">{d.name}</span>
            <span className="text-sm font-bold text-stone-900 tabular-nums">{d.value}</span>
            <span className="text-xs text-stone-400 tabular-nums w-10 text-right">
              {total > 0 ? `${((d.value / total) * 100).toFixed(1)}%` : '—'}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function AdminGeography() {
  const { adminToken, clearAdminToken } = useAdminAuth()
  const navigate = useNavigate()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

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

  const langStarts   = data?.langStarts   ?? { es: 0, en: 0 }
  const langConverts = data?.langConverts ?? { es: 0, en: 0 }
  const topCountries = data?.topCountries ?? []
  const monthlyTrend = data?.monthlyTrend ?? []

  const totalStarts    = langStarts.es + langStarts.en
  const totalConverts  = langConverts.es + langConverts.en
  const convES = langStarts.es > 0 ? ((langConverts.es / langStarts.es) * 100).toFixed(1) : '—'
  const convEN = langStarts.en > 0 ? ((langConverts.en / langStarts.en) * 100).toFixed(1) : '—'
  const maxCountry = topCountries[0]?.count ?? 1

  return (
    <div className="flex flex-col gap-6 max-w-5xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-extrabold text-stone-900">Idioma & Geografia</h1>
          <p className="text-sm text-stone-400 mt-0.5">Distribuição por idioma e origem geográfica</p>
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
          <button onClick={load} className="text-sm font-semibold text-red-600 hover:text-red-700 flex items-center gap-1.5">
            <RefreshCw className="w-3.5 h-3.5" /> Tentar novamente
          </button>
        </div>
      )}

      {/* Summary metrics */}
      <section>
        <SectionHeader title="Resumo" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard
            icon={Users} iconBg="bg-emerald-50" iconColor="text-emerald-500"
            label="Total iniciaram (ES)"
            value={loading ? '—' : langStarts.es}
            sub={loading ? undefined : `${totalStarts > 0 ? ((langStarts.es / totalStarts) * 100).toFixed(1) : 0}% do total`}
            loading={loading}
          />
          <MetricCard
            icon={Users} iconBg="bg-indigo-50" iconColor="text-indigo-500"
            label="Total iniciaram (EN)"
            value={loading ? '—' : langStarts.en}
            sub={loading ? undefined : `${totalStarts > 0 ? ((langStarts.en / totalStarts) * 100).toFixed(1) : 0}% do total`}
            loading={loading}
          />
          <MetricCard
            icon={TrendingUp} iconBg="bg-emerald-50" iconColor="text-emerald-600"
            label="Conversão ES"
            value={loading ? '—' : (convES !== '—' ? `${convES}%` : '—')}
            sub={`${langConverts.es} assinantes ES`}
            loading={loading}
          />
          <MetricCard
            icon={TrendingUp} iconBg="bg-indigo-50" iconColor="text-indigo-600"
            label="Conversão EN"
            value={loading ? '—' : (convEN !== '—' ? `${convEN}%` : '—')}
            sub={`${langConverts.en} assinantes EN`}
            loading={loading}
          />
        </div>
      </section>

      {/* New subs this week / month */}
      <section>
        <SectionHeader title="Novas assinaturas por idioma" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="bg-white rounded-2xl border border-stone-100 p-5">
            <p className="font-bold text-stone-800 mb-4">Esta semana</p>
            {loading ? <ChartSkeleton h={56} /> : (
              <div className="flex flex-col gap-2.5">
                {[
                  { lang: 'ES', value: data?.weekEs ?? 0, color: LANG_COLORS.es },
                  { lang: 'EN', value: data?.weekEn ?? 0, color: LANG_COLORS.en },
                ].map(r => (
                  <div key={r.lang} className="flex items-center gap-3">
                    <span className="text-xs font-bold text-stone-500 w-6">{r.lang}</span>
                    <div className="flex-1 h-2 bg-stone-100 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{ width: `${Math.min(100, r.value * 20)}%`, background: r.color }}
                      />
                    </div>
                    <span className="text-sm font-bold text-stone-700 w-5 text-right">{r.value}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-white rounded-2xl border border-stone-100 p-5">
            <p className="font-bold text-stone-800 mb-4">Este mês</p>
            {loading ? <ChartSkeleton h={56} /> : (
              <div className="flex flex-col gap-2.5">
                {[
                  { lang: 'ES', value: data?.monthEs ?? 0, color: LANG_COLORS.es },
                  { lang: 'EN', value: data?.monthEn ?? 0, color: LANG_COLORS.en },
                ].map(r => {
                  const maxMonth = Math.max(data?.monthEs ?? 0, data?.monthEn ?? 0, 1)
                  return (
                    <div key={r.lang} className="flex items-center gap-3">
                      <span className="text-xs font-bold text-stone-500 w-6">{r.lang}</span>
                      <div className="flex-1 h-2 bg-stone-100 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{ width: `${(r.value / maxMonth) * 100}%`, background: r.color }}
                        />
                      </div>
                      <span className="text-sm font-bold text-stone-700 w-5 text-right">{r.value}</span>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Language distribution pie */}
      <section className="bg-white rounded-2xl border border-stone-100 p-5">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center flex-shrink-0">
            <Globe className="w-[18px] h-[18px] text-emerald-500" />
          </div>
          <p className="font-bold text-stone-800">Distribuição por idioma — quizzes iniciados</p>
          {!loading && (
            <span className="ml-auto text-sm text-stone-400 font-medium">{totalStarts} total</span>
          )}
        </div>
        {loading ? <ChartSkeleton h={200} /> : <LangPie langStarts={langStarts} />}
      </section>

      {/* Monthly trend */}
      <section className="bg-white rounded-2xl border border-stone-100 p-5">
        <p className="font-bold text-stone-800 mb-4">Evolução mensal ES vs EN — assinaturas</p>
        {loading ? (
          <ChartSkeleton h={220} />
        ) : monthlyTrend.every(m => m.es === 0 && m.en === 0) ? (
          <p className="text-sm text-stone-400 text-center py-12">Sem dados de conversão no período.</p>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={monthlyTrend} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f5f5f4" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#a8a29e' }} axisLine={false} tickLine={false} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#a8a29e' }} axisLine={false} tickLine={false} width={28} />
              <Tooltip content={({ active, payload, label }) => (
                <ChartTooltip active={active} payload={payload} label={label} />
              )} />
              <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }}
                formatter={v => <span className="text-stone-500">{v}</span>} />
              <Line
                type="monotone" dataKey="es" name="Espanhol (ES)"
                stroke={LANG_COLORS.es} strokeWidth={2.5}
                dot={{ r: 3.5, fill: LANG_COLORS.es, strokeWidth: 0 }}
                activeDot={{ r: 5 }}
              />
              <Line
                type="monotone" dataKey="en" name="Inglês (EN)"
                stroke={LANG_COLORS.en} strokeWidth={2.5}
                dot={{ r: 3.5, fill: LANG_COLORS.en, strokeWidth: 0 }}
                activeDot={{ r: 5 }}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </section>

      {/* Top 10 countries */}
      <section className="bg-white rounded-2xl border border-stone-100 p-5">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0">
            <Globe className="w-[18px] h-[18px] text-blue-500" />
          </div>
          <p className="font-bold text-stone-800">Top 10 países de origem</p>
          <span className="ml-auto text-xs text-stone-400">por quizzes iniciados</span>
        </div>
        {loading ? (
          <ChartSkeleton h={240} />
        ) : topCountries.length === 0 ? (
          <div className="py-12 text-center">
            <Globe className="w-8 h-8 text-stone-200 mx-auto mb-2" />
            <p className="text-sm text-stone-400">Sem dados de país ainda.</p>
            <p className="text-xs text-stone-300 mt-0.5">Os países aparecem quando o Cloudflare envia o header CF-IPCountry.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {topCountries.map((c, i) => (
              <div key={c.pais} className="flex items-center gap-3">
                <span className="text-sm text-stone-400 font-medium w-5 text-right flex-shrink-0">{i + 1}</span>
                <span className="text-sm font-semibold text-stone-700 w-36 flex-shrink-0 truncate">{c.nome}</span>
                <div className="flex-1 h-2 bg-stone-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-400 rounded-full transition-all duration-500"
                    style={{ width: `${(c.count / maxCountry) * 100}%` }}
                  />
                </div>
                <span className="text-sm font-bold text-stone-700 w-8 text-right tabular-nums">{c.count}</span>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Conversion rate comparison chart */}
      <section className="bg-white rounded-2xl border border-stone-100 p-5">
        <p className="font-bold text-stone-800 mb-4">Taxa de conversão por idioma</p>
        {loading ? (
          <ChartSkeleton h={160} />
        ) : (
          <ResponsiveContainer width="100%" height={160}>
            <BarChart
              data={[
                { lang: 'Espanhol (ES)', taxa: parseFloat(convES) || 0, fill: LANG_COLORS.es },
                { lang: 'Inglês (EN)',   taxa: parseFloat(convEN) || 0, fill: LANG_COLORS.en },
              ]}
              margin={{ top: 4, right: 4, bottom: 0, left: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#f5f5f4" vertical={false} />
              <XAxis dataKey="lang" tick={{ fontSize: 11, fill: '#a8a29e' }} axisLine={false} tickLine={false} />
              <YAxis
                tickFormatter={v => `${v}%`}
                tick={{ fontSize: 11, fill: '#a8a29e' }}
                axisLine={false} tickLine={false} width={40}
              />
              <Tooltip
                content={({ active, payload, label }) => {
                  if (!active || !payload?.length) return null
                  return (
                    <div className="bg-white border border-stone-100 rounded-xl px-3 py-2 shadow-lg text-sm">
                      <p className="font-bold text-stone-700">{label}</p>
                      <p className="text-stone-600">{payload[0].value}% de conversão</p>
                    </div>
                  )
                }}
              />
              <Bar dataKey="taxa" name="Conversão" radius={[6, 6, 0, 0]} maxBarSize={80}>
                {[
                  { fill: LANG_COLORS.es },
                  { fill: LANG_COLORS.en },
                ].map((entry, index) => (
                  <Cell key={index} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </section>
    </div>
  )
}
