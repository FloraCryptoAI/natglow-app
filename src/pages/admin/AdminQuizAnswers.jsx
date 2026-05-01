import React, { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAdminAuth } from '@/lib/AdminAuthContext'
import { RefreshCw, AlertCircle, ClipboardList, Users, TrendingUp } from 'lucide-react'
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, Cell,
} from 'recharts'

const DIAG_CONFIG = {
  red:   { label: 'Vermelho — Cabelo muito danificado', bg: 'bg-red-50',    text: 'text-red-600',    bar: '#f87171' },
  amber: { label: 'Âmbar — Cabelo com danos moderados', bg: 'bg-amber-50',  text: 'text-amber-600',  bar: '#fbbf24' },
  green: { label: 'Verde — Cabelo em bom estado',       bg: 'bg-emerald-50',text: 'text-emerald-600',bar: '#34d399' },
}

const QUESTION_LABELS = {
  washFreq: {
    title: 'Frequência de lavagem',
    options: {
      daily: 'Todo dia',
      '3_4': '3-4x por semana',
      '1_2': '1-2x por semana',
    },
  },
  waterTemp: {
    title: 'Temperatura da água',
    options: {
      hot:  'Quente',
      warm: 'Morna',
      cold: 'Fria',
    },
  },
  heatTools: {
    title: 'Uso de calor',
    options: {
      daily:  'Todo dia',
      few:    'Algumas vezes',
      rarely: 'Raramente',
    },
  },
  hydration: {
    title: 'Hidratação',
    options: {
      regularly: 'Regularmente',
      sometimes: 'Às vezes',
      never:     'Nunca',
    },
  },
  chemProducts: {
    title: 'Produtos químicos',
    options: {
      yes_heavy: 'Sim (forte)',
      yes_mild:  'Sim (suave)',
      no:        'Não',
    },
  },
}

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

function ChartSkeleton({ h = 160 }) {
  return <div className="animate-pulse bg-stone-50 rounded-xl" style={{ height: h }} />
}

function SectionHeader({ title }) {
  return <p className="text-xs font-bold text-stone-400 uppercase tracking-wider mb-3">{title}</p>
}

function QuestionChart({ field, dist, loading }) {
  const cfg = QUESTION_LABELS[field]
  if (!cfg) return null

  const chartData = Object.entries(cfg.options).map(([key, label]) => ({
    label,
    count: dist?.[field]?.[key] ?? 0,
  })).filter(d => d.count > 0)

  const total = chartData.reduce((s, d) => s + d.count, 0)

  if (loading) return (
    <div className="bg-white rounded-2xl border border-stone-100 p-5">
      <div className="h-4 bg-stone-100 rounded w-36 mb-4 animate-pulse" />
      <ChartSkeleton h={140} />
    </div>
  )

  return (
    <div className="bg-white rounded-2xl border border-stone-100 p-5">
      <div className="flex items-center justify-between mb-4">
        <p className="font-bold text-stone-800 text-sm">{cfg.title}</p>
        <span className="text-xs text-stone-400 font-medium">{total} respostas</span>
      </div>
      {total === 0 ? (
        <p className="text-sm text-stone-400 text-center py-8">Sem dados ainda.</p>
      ) : (
        <div className="space-y-3">
          {chartData.map(d => (
            <div key={d.label} className="flex items-center gap-3">
              <span className="text-xs text-stone-600 w-28 flex-shrink-0 leading-tight">{d.label}</span>
              <div className="flex-1 h-2 bg-stone-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-brand rounded-full transition-all duration-500"
                  style={{ width: total > 0 ? `${(d.count / total) * 100}%` : '0%' }}
                />
              </div>
              <span className="text-xs font-bold text-stone-700 w-8 text-right tabular-nums">{d.count}</span>
              <span className="text-xs text-stone-400 w-10 text-right tabular-nums">
                {total > 0 ? `${((d.count / total) * 100).toFixed(0)}%` : '—'}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function ComparisonChart({ field, convertedAnswers, abandonedAnswers, loading }) {
  const cfg = QUESTION_LABELS[field]
  if (!cfg || loading) return null

  const chartData = Object.entries(cfg.options).map(([key, label]) => ({
    label,
    convertidos: convertedAnswers?.[field]?.[key] ?? 0,
    abandonaram: abandonedAnswers?.[field]?.[key] ?? 0,
  })).filter(d => d.convertidos + d.abandonaram > 0)

  if (chartData.length === 0) return null

  return (
    <div className="bg-white rounded-2xl border border-stone-100 p-5">
      <p className="font-bold text-stone-800 text-sm mb-1">{cfg.title}</p>
      <p className="text-xs text-stone-400 mb-4">Convertidas vs. abandonaram em /Results</p>
      <ResponsiveContainer width="100%" height={150}>
        <BarChart data={chartData} barGap={2} margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f5f5f4" vertical={false} />
          <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#a8a29e' }} axisLine={false} tickLine={false} />
          <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: '#a8a29e' }} axisLine={false} tickLine={false} width={24} />
          <Tooltip content={({ active, payload, label }) => (
            <ChartTooltip active={active} payload={payload} label={label} />
          )} />
          <Bar dataKey="convertidos" name="Assinaram"   fill="#10b981" radius={[3,3,0,0]} maxBarSize={28} />
          <Bar dataKey="abandonaram" name="Abandonaram" fill="#f87171" radius={[3,3,0,0]} maxBarSize={28} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

export default function AdminQuizAnswers() {
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
      const res = await fetch(`${baseUrl}/admin-quiz`, { headers: authHeaders })
      if (res.status === 401 || res.status === 403) {
        clearAdminToken(); navigate('/admin/login', { replace: true }); return
      }
      const result = await res.json()
      if (result?.error) throw new Error(result.error)
      setData(result)
    } catch (e) {
      setError(e?.message ?? 'Erro ao carregar dados do quiz')
    } finally {
      setLoading(false)
    }
  }, [adminToken, clearAdminToken, navigate]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { load() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const dist             = data?.dist             ?? {}
  const diagDist         = data?.diagDist         ?? { red: 0, amber: 0, green: 0 }
  const diagConversion   = data?.diagConversion   ?? {}
  const convertedAnswers = data?.convertedAnswers ?? {}
  const abandonedAnswers = data?.abandonedAnswers ?? {}

  const totalDiag = (diagDist.red ?? 0) + (diagDist.amber ?? 0) + (diagDist.green ?? 0)

  const diagChartData = [
    { label: 'Vermelho', count: diagDist.red   ?? 0, fill: '#f87171' },
    { label: 'Âmbar',   count: diagDist.amber ?? 0, fill: '#fbbf24' },
    { label: 'Verde',   count: diagDist.green ?? 0, fill: '#34d399' },
  ]

  return (
    <div className="flex flex-col gap-6 max-w-5xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-extrabold text-stone-900">Respostas do Quiz</h1>
          <p className="text-sm text-stone-400 mt-0.5">Análise das respostas e comportamento de conversão</p>
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

      {/* Overview metrics */}
      <section>
        <SectionHeader title="Visão geral" />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <MetricCard
            icon={ClipboardList} iconBg="bg-violet-50" iconColor="text-violet-500"
            label="Quiz iniciados"
            value={loading ? '—' : (data?.totalStarted ?? 0)}
            loading={loading}
          />
          <MetricCard
            icon={Users} iconBg="bg-brand-pale" iconColor="text-brand"
            label="Quiz completados"
            value={loading ? '—' : (data?.totalCompleted ?? 0)}
            loading={loading}
          />
          <MetricCard
            icon={TrendingUp} iconBg="bg-emerald-50" iconColor="text-emerald-500"
            label="Taxa de conclusão"
            value={loading ? '—' : `${data?.completionRate ?? 0}%`}
            sub="Completados ÷ iniciados"
            loading={loading}
          />
        </div>
      </section>

      {/* Diagnosis distribution */}
      <section>
        <SectionHeader title="Diagnóstico recebido" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Distribution bars */}
          <div className="bg-white rounded-2xl border border-stone-100 p-5">
            <div className="flex items-center justify-between mb-4">
              <p className="font-bold text-stone-800">Distribuição de diagnóstico</p>
              {!loading && <span className="text-sm text-stone-400">{totalDiag} total</span>}
            </div>
            {loading ? <ChartSkeleton h={100} /> : (
              <div className="space-y-3">
                {Object.entries(DIAG_CONFIG).map(([key, cfg]) => {
                  const count = diagDist[key] ?? 0
                  return (
                    <div key={key} className="flex items-center gap-3">
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${cfg.bg} ${cfg.text} w-16 text-center flex-shrink-0`}>
                        {key === 'red' ? 'Verm.' : key === 'amber' ? 'Âmbar' : 'Verde'}
                      </span>
                      <div className="flex-1 h-2 bg-stone-100 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{ width: totalDiag > 0 ? `${(count / totalDiag) * 100}%` : '0%', background: DIAG_CONFIG[key].bar }}
                        />
                      </div>
                      <span className="text-sm font-bold text-stone-700 w-8 text-right tabular-nums">{count}</span>
                      <span className="text-xs text-stone-400 w-10 text-right tabular-nums">
                        {totalDiag > 0 ? `${((count / totalDiag) * 100).toFixed(0)}%` : '—'}
                      </span>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Diagnosis bar chart */}
          <div className="bg-white rounded-2xl border border-stone-100 p-5">
            <p className="font-bold text-stone-800 mb-4">Diagnóstico × taxa de conversão</p>
            {loading ? <ChartSkeleton h={140} /> : (
              <div className="space-y-3">
                {Object.entries(diagConversion).map(([key, val]) => {
                  const cfg = DIAG_CONFIG[key]
                  if (!cfg) return null
                  return (
                    <div key={key} className="flex flex-col gap-1">
                      <div className="flex items-center justify-between">
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${cfg.bg} ${cfg.text}`}>
                          {key === 'red' ? 'Vermelho' : key === 'amber' ? 'Âmbar' : 'Verde'}
                        </span>
                        <span className="text-sm font-bold text-stone-700 tabular-nums">
                          {val.rate ?? 0}% conversão
                        </span>
                      </div>
                      <div className="flex-1 h-1.5 bg-stone-100 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full"
                          style={{ width: `${val.rate ?? 0}%`, background: cfg.bar }}
                        />
                      </div>
                      <p className="text-xs text-stone-400">{val.converted ?? 0} assinaram de {val.total ?? 0}</p>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {/* Description callouts */}
        {!loading && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-3">
            {Object.entries(DIAG_CONFIG).map(([key, cfg]) => (
              <div key={key} className={`rounded-xl p-3 ${cfg.bg}`}>
                <p className={`text-xs font-bold ${cfg.text} mb-0.5`}>
                  {key === 'red' ? '🔴' : key === 'amber' ? '🟡' : '🟢'} {key === 'red' ? 'Vermelho' : key === 'amber' ? 'Âmbar' : 'Verde'}
                </p>
                <p className="text-xs text-stone-600 leading-snug">
                  {key === 'red' ? 'Score ≥ 8 — cabelo muito danificado por químicos + calor' :
                   key === 'amber' ? 'Score 4-7 — danos moderados, rotina inconsistente' :
                   'Score < 4 — bons hábitos, baixa agressão capilar'}
                </p>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Question distributions */}
      <section>
        <SectionHeader title="Distribuição por pergunta" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {Object.keys(QUESTION_LABELS).map(field => (
            <QuestionChart key={field} field={field} dist={dist} loading={loading} />
          ))}
        </div>
      </section>

      {/* Converted vs abandoned comparison */}
      <section>
        <SectionHeader title="Perfil comparativo — assinaram vs. abandonaram em /Results" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {Object.keys(QUESTION_LABELS).filter(f => !['hairType','age'].includes(f)).map(field => (
            <ComparisonChart
              key={field}
              field={field}
              convertedAnswers={convertedAnswers}
              abandonedAnswers={abandonedAnswers}
              loading={loading}
            />
          ))}
        </div>
        {!loading && (
          <p className="text-xs text-stone-400 mt-2 text-center">
            "Assinaram" = mesma sessão do quiz que depois completou pagamento · "Abandonaram" = viram /Results mas não converteram
          </p>
        )}
      </section>
    </div>
  )
}
