import React, { useEffect, useState, useCallback, useRef } from 'react'
import {
  ClipboardList, Users, TrendingUp, Trophy,
  Download, ChevronDown, ChevronUp,
} from 'lucide-react'
import { ArrowClockwise } from '@phosphor-icons/react'
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, Cell,
} from 'recharts'
import FunnelBars from './components/FunnelBars'
import ChartSkeleton from './components/ChartSkeleton'
import ChartTooltip from './components/ChartTooltip'
import SectionHeader from './components/SectionHeader'
import ErrorBanner from './components/ErrorBanner'
import { useAdminFetch } from './hooks/useAdminFetch'

// ── constants ────────────────────────────────────────────────────────────────

// Funnels (Bold vs Detox) — both currently use the same Hotmart product ($17),
// distinguished server-side by funnel_events event_type prefix and cta_clicked.metadata.source.
const PLANS = [
  { key: 'bold',  label: 'Quiz Bold',  short: 'Bold $17',  color: '#0891b2' },
  { key: 'detox', label: 'Quiz Detox', short: 'Detox $17', color: '#7c3aed' },
]

const PERIODS = [
  { key: '7d',  label: '7 dias' },
  { key: '30d', label: '30 dias' },
  { key: '90d', label: '90 dias' },
]

const DIAG_CONFIG = {
  red:   { label: 'Vermelho (cabelo muito danificado)', bg: 'bg-red-50',    text: 'text-red-600',    bar: '#f87171' },
  amber: { label: 'Âmbar (cabelo com danos moderados)', bg: 'bg-amber-50',  text: 'text-amber-600',  bar: '#fbbf24' },
  green: { label: 'Verde (cabelo em bom estado)',       bg: 'bg-emerald-50',text: 'text-emerald-600',bar: '#34d399' },
}

const QUESTION_LABELS = {
  age:          { title: 'Faixa etária',            options: { '18_29': '18–29 anos', '30_39': '30–39 anos', '40_49': '40–49 anos', '50_plus': '50+ anos' } },
  hairType:     { title: 'Tipo de cabelo',          options: { liso: 'Liso', ondulado: 'Ondulado', cacheado: 'Cacheado', crespo: 'Crespo' } },
  washFreq:     { title: 'Frequência de lavagem',   options: { daily: 'Todo dia', '3_4': '3-4x/semana', '1_2': '1-2x/semana' } },
  waterTemp:    { title: 'Temperatura da água',     options: { hot: 'Quente', warm: 'Morna', cold: 'Fria' } },
  heatTools:    { title: 'Uso de calor',            options: { daily: 'Todo dia', few: 'Algumas vezes', rarely: 'Raramente' } },
  hydration:    { title: 'Hidratação',              options: { regularly: 'Regularmente', sometimes: 'Às vezes', never: 'Nunca' } },
  chemProducts: { title: 'Produtos químicos',       options: { yes_heavy: 'Sim (forte)', yes_mild: 'Sim (suave)', no: 'Não' } },
  // New fields from persuasive funnels
  symptomsIntensity: { title: 'Intensidade dos sintomas', options: { '30days': 'Mais de 30 dias', '1year': 'Mais de 1 ano', months: 'Há meses', years: 'Há anos' } },
  finalChoice:       { title: 'Escolha final',            options: { yes: 'Sim, quero', doubts: 'Tenho dúvidas' } },
}

const AGE_LABELS = QUESTION_LABELS.age.options
const AGE_ORDER  = ['18_29', '30_39', '40_49', '50_plus']

// Build a "top value" helper for displaying the predominant answer in each
// cross-tabulated field on the per-age breakdown cards.
function topValue(distObj, optionLabels) {
  const entries = Object.entries(distObj || {})
  if (!entries.length) return null
  entries.sort((a, b) => b[1] - a[1])
  const [key, count] = entries[0]
  const total = entries.reduce((a, [, n]) => a + n, 0)
  return {
    label: optionLabels?.[key] ?? key,
    count,
    pct: total > 0 ? Math.round((count / total) * 100) : 0,
  }
}

// Comparison table metric definitions
const METRICS = [
  { key: 'quiz_started',    label: 'Visitas únicas no quiz',       fmt: v => v,            higherBetter: true,  group: 'Funil' },
  { key: 'completion_rate', label: 'Taxa de conclusão do quiz',    fmt: v => `${v}%`,      higherBetter: true,  group: 'Funil' },
  { key: 'results_viewed',  label: 'Visualizações da Results',     fmt: v => v,            higherBetter: true,  group: 'Funil' },
  { key: 'cta_clicked',     label: 'Cliques no CTA',               fmt: v => v,            higherBetter: true,  group: 'Funil' },
  { key: 'conversions',     label: 'Conversões pagas',             fmt: v => v,            higherBetter: true,  group: 'Funil' },
  { key: 'conversion_rate', label: 'Taxa de conversão Quiz→Pago',  fmt: v => `${v}%`,      higherBetter: true,  group: 'Funil' },
  { key: 'revenue_period',  label: 'Receita total no período',     fmt: v => `$${v}`,      higherBetter: true,  group: 'Receita' },
  { key: 'avg_ticket',      label: 'Ticket médio',                 fmt: v => `$${v}`,      higherBetter: true,  group: 'Receita' },
  { key: 'refund_rate',     label: 'Taxa de reembolso',            fmt: v => `${v}%`,      higherBetter: false, group: 'Receita' },
  { key: 'roi_score',       label: 'ROI score (conversão × preço)',fmt: v => v.toFixed(4), higherBetter: true,  group: 'ROI', highlight: true },
]

// ── helpers ──────────────────────────────────────────────────────────────────

function fmt$(v) { return `$${Number(v ?? 0).toFixed(2)}` }

function cellClass(value, allValues, higherBetter, specialNull = false) {
  if (value == null) return 'text-gray-400'
  if (specialNull) {
    // Only compare cells that have actual values
    const valid = allValues.filter(v => v != null)
    if (valid.length < 2) return 'text-gray-700'
    const best  = higherBetter ? Math.max(...valid) : Math.min(...valid)
    const worst = higherBetter ? Math.min(...valid) : Math.max(...valid)
    if (value === best)  return 'bg-emerald-50 text-emerald-800 font-bold'
    if (value === worst) return 'bg-red-50 text-red-700'
    return 'text-gray-700'
  }
  const best  = higherBetter ? Math.max(...allValues) : Math.min(...allValues)
  const worst = higherBetter ? Math.min(...allValues) : Math.max(...allValues)
  if (value === best)  return 'bg-emerald-50 text-emerald-800 font-bold'
  if (value === worst) return 'bg-red-50 text-red-700'
  return 'text-gray-700'
}

function exportCSV(plans, metrics) {
  const headers = ['Métrica', ...plans.map(p => p.label)]
  const rows = metrics.map(m => {
    const vals = plans.map(p => {
      const v = p[m.key]
      return v != null ? m.fmt(v) : '—'
    })
    return [m.label, ...vals]
  })
  const csv = [headers, ...rows].map(r => r.map(c => `"${c}"`).join(',')).join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  link.href = URL.createObjectURL(blob)
  link.download = `natglow-comparacao-${new Date().toISOString().slice(0, 10)}.csv`
  link.click()
}

// ── sub-components ────────────────────────────────────────────────────────────


function SigBadge({ level }) {
  if (level === 'significant') return (
    <span className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-700">
      ✓ Significativo (p&lt;0.05)
    </span>
  )
  if (level === 'trend') return (
    <span className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full bg-amber-100 text-amber-700">
      ~ Tendência
    </span>
  )
  return (
    <span className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full bg-gray-100 text-gray-500">
      ⏳ Aguardando dados
    </span>
  )
}

function WinnerCard({ significance, plans }) {
  if (!significance?.winner_key) return null
  const winnerPlan = PLANS.find(p => p.key === significance.winner_key)
  const winnerData = plans?.find(p => p.plan_key === significance.winner_key)
  if (!winnerPlan || !winnerData) return null

  return (
    <div
      className="rounded-2xl p-5 border"
      style={{ background: 'linear-gradient(135deg, #f5f3ff, #ede9fe)', borderColor: '#c4b5fd' }}
    >
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-violet-100 flex items-center justify-center flex-shrink-0">
            <Trophy className="w-5 h-5 text-violet-600" />
          </div>
          <div>
            <p className="text-xs font-bold text-violet-500 uppercase tracking-wider mb-0.5">
              Vencedor estimado por ROI
            </p>
            <p className="text-xl font-extrabold text-violet-900">{winnerPlan.label}</p>
          </div>
        </div>
        <div className="flex flex-col items-end gap-2">
          <SigBadge level={significance.level} />
          {significance.z_score > 0 && (
            <span className="text-xs text-gray-500">Z = {significance.z_score}</span>
          )}
        </div>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3">
        <div className="bg-white/70 rounded-xl p-3 text-center">
          <p className="text-xs text-gray-500 mb-0.5">Conversão</p>
          <p className="text-lg font-extrabold text-violet-800">{winnerData.conversion_rate}%</p>
        </div>
        <div className="bg-white/70 rounded-xl p-3 text-center">
          <p className="text-xs text-gray-500 mb-0.5">Ticket médio</p>
          <p className="text-lg font-extrabold text-violet-800">${winnerData.avg_ticket ?? winnerData.price}</p>
        </div>
      </div>
      {significance.note && (
        <p className="mt-3 text-xs text-violet-700 bg-white/50 rounded-xl px-3 py-2 leading-relaxed">
          {significance.note}
        </p>
      )}
    </div>
  )
}

function ComparisonTable({ plans, loading }) {
  const [expanded, setExpanded] = useState({ Funil: true, Receita: true, Retenção: true, Valor: true, ROI: true })

  if (loading) return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-3 animate-pulse">
      {[1, 2, 3, 4, 5, 6, 7].map(i => (
        <div key={i} className="flex gap-4">
          <div className="h-4 bg-gray-100 rounded w-48" />
          {[1, 2, 3, 4].map(j => <div key={j} className="h-4 bg-gray-100 rounded w-20" />)}
        </div>
      ))}
    </div>
  )

  if (!plans?.length) return null

  const groups = [...new Set(METRICS.map(m => m.group))]

  return (
    <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50">
              <th className="text-left px-4 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider w-52">
                Métrica
              </th>
              {PLANS.map(p => (
                <th key={p.key} className="text-center px-3 py-3 text-xs font-bold uppercase tracking-wider whitespace-nowrap" style={{ color: p.color }}>
                  {p.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {groups.map(group => {
              const groupMetrics = METRICS.filter(m => m.group === group)
              const isOpen = expanded[group] !== false
              return (
                <React.Fragment key={group}>
                  <tr
                    className="border-t border-b border-gray-100 bg-gray-50/60 cursor-pointer hover:bg-gray-100/60 transition-colors"
                    onClick={() => setExpanded(e => ({ ...e, [group]: !isOpen }))}
                  >
                    <td colSpan={4} className="px-4 py-2">
                      <span className="flex items-center gap-2 text-xs font-bold text-gray-500 uppercase tracking-wider">
                        {isOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                        {group}
                      </span>
                    </td>
                  </tr>
                  {isOpen && groupMetrics.map(metric => {
                    const allVals = plans.map(p => p[metric.key])
                    return (
                      <tr
                        key={metric.key}
                        className={`border-b border-gray-50 hover:bg-gray-50/40 transition-colors ${metric.highlight ? 'bg-violet-50/30' : ''}`}
                      >
                        <td className={`px-4 py-3 text-gray-700 text-xs ${metric.highlight ? 'font-bold text-violet-700' : ''}`}>
                          {metric.label}
                          {metric.highlight && <span className="ml-1 text-violet-400">★</span>}
                        </td>
                        {plans.map(plan => {
                          const val = plan[metric.key]
                          const cls = cellClass(val, allVals, metric.higherBetter, metric.specialNull)
                          return (
                            <td key={plan.plan_key} className={`px-3 py-3 text-center tabular-nums text-xs ${cls}`}>
                              {val != null ? metric.fmt(val) : '—'}
                            </td>
                          )
                        })}
                      </tr>
                    )
                  })}
                </React.Fragment>
              )
            })}
          </tbody>
        </table>
      </div>
      <div className="border-t border-gray-100 px-4 py-3 flex items-center justify-between flex-wrap gap-2">
        <p className="text-xs text-gray-400">
          🟢 Melhor · 🔴 Pior na métrica · ★ Métrica principal de ROI
        </p>
        <button
          onClick={() => exportCSV(plans, METRICS)}
          className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 hover:text-gray-800 border border-gray-200 px-3 py-1.5 rounded-xl hover:border-gray-300 transition-all"
        >
          <Download className="w-3.5 h-3.5" />
          Exportar CSV
        </button>
      </div>
    </div>
  )
}


// ── Individual mode sub-components ───────────────────────────────────────────

const INDIVIDUAL_STEPS = [
  { key: 'quiz_started',   label: 'Iniciaram o quiz',      color: '#7c3aed' },
  { key: 'quiz_completed', label: 'Completaram o quiz',    color: '#2563eb' },
  { key: 'results_viewed', label: 'Viram os resultados',   color: '#8b5cf6' },
  { key: 'cta_clicked',    label: 'Clicaram em Assinar',   color: '#d97706' },
  { key: 'conversions',    label: 'Pagamento confirmado',  color: '#059669' },
]

function IndividualFunnel({ planData }) {
  if (!planData) return null
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5">
      <p className="font-bold text-gray-800 mb-4">Funil: {PLANS.find(p => p.key === planData.plan_key)?.label}</p>
      <FunnelBars
        steps={INDIVIDUAL_STEPS.map(s => ({ label: s.label, color: s.color, count: planData[s.key] ?? 0 }))}
      />
      <div className="mt-4 grid grid-cols-2 gap-3">
        <div className="bg-gray-50 rounded-xl p-3 text-center">
          <p className="text-xs text-gray-500 mb-0.5">Conversão quiz→pago</p>
          <p className="text-xl font-extrabold text-gray-900">{planData.conversion_rate}%</p>
        </div>
        <div className="bg-gray-50 rounded-xl p-3 text-center">
          <p className="text-xs text-gray-500 mb-0.5">Conclusão do quiz</p>
          <p className="text-xl font-extrabold text-gray-900">{planData.completion_rate}%</p>
        </div>
      </div>
    </div>
  )
}

function LangCountryPanel({ quizData, loading }) {
  if (loading) return <ChartSkeleton h={140} />

  const langDist    = quizData?.langDist    ?? {}
  const countryDist = quizData?.countryDist ?? []
  const totalLang   = Object.values(langDist).reduce((a, b) => a + b, 0) || 1

  const LANG_COLOR = { es: '#7c3aed', en: '#2563eb', unknown: '#9ca3af' }
  const LANG_LABEL = { es: '🇪🇸 Espanhol', en: '🇺🇸 Inglês', unknown: 'Desconhecido' }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <div className="bg-white rounded-2xl border border-gray-100 p-5">
        <p className="font-bold text-gray-800 text-sm mb-4">Idioma (quiz iniciado)</p>
        <div className="space-y-3">
          {Object.entries(langDist).sort((a, b) => b[1] - a[1]).map(([lang, count]) => (
            <div key={lang} className="flex items-center gap-3">
              <span className="text-xs font-semibold text-gray-600 w-28 flex-shrink-0 truncate">
                {LANG_LABEL[lang] ?? lang.toUpperCase()}
              </span>
              <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full"
                  style={{ width: `${(count / totalLang) * 100}%`, background: LANG_COLOR[lang] ?? '#6b7280' }}
                />
              </div>
              <span className="text-xs font-bold text-gray-700 w-8 text-right tabular-nums">{count}</span>
              <span className="text-xs text-gray-400 w-10 text-right tabular-nums">
                {((count / totalLang) * 100).toFixed(0)}%
              </span>
            </div>
          ))}
          {Object.keys(langDist).length === 0 && (
            <p className="text-sm text-gray-400 text-center py-6">Sem dados de idioma.</p>
          )}
        </div>
      </div>
      <div className="bg-white rounded-2xl border border-gray-100 p-5">
        <p className="font-bold text-gray-800 text-sm mb-4">Top países (quiz iniciado)</p>
        {countryDist.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-6">Sem dados de país.</p>
        ) : (
          <div className="space-y-2.5">
            {countryDist.slice(0, 6).map(({ country, count }) => (
              <div key={country} className="flex items-center gap-3">
                <span className="text-xs font-semibold text-gray-600 w-10 flex-shrink-0">{country}</span>
                <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-violet-500 rounded-full"
                    style={{ width: countryDist[0]?.count > 0 ? `${(count / countryDist[0].count) * 100}%` : '0%' }}
                  />
                </div>
                <span className="text-xs font-bold text-gray-700 w-8 text-right tabular-nums">{count}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
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
    <div className="bg-white rounded-2xl border border-gray-100 p-5">
      <div className="h-4 bg-gray-100 rounded w-36 mb-4 animate-pulse" />
      <ChartSkeleton h={120} />
    </div>
  )

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5">
      <div className="flex items-center justify-between mb-4">
        <p className="font-bold text-gray-800 text-sm">{cfg.title}</p>
        <span className="text-xs text-gray-400">{total} respostas</span>
      </div>
      {total === 0 ? (
        <p className="text-sm text-gray-400 text-center py-8">Sem dados.</p>
      ) : (
        <div className="space-y-3">
          {chartData.map(d => (
            <div key={d.label} className="flex items-center gap-3">
              <span className="text-xs text-gray-600 w-28 flex-shrink-0 leading-tight">{d.label}</span>
              <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-violet-500 rounded-full transition-all duration-500"
                  style={{ width: `${(d.count / total) * 100}%` }}
                />
              </div>
              <span className="text-xs font-bold text-gray-700 w-8 text-right tabular-nums">{d.count}</span>
              <span className="text-xs text-gray-400 w-10 text-right tabular-nums">
                {((d.count / total) * 100).toFixed(0)}%
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
    <div className="bg-white rounded-2xl border border-gray-100 p-5">
      <p className="font-bold text-gray-800 text-sm mb-1">{cfg.title}</p>
      <p className="text-xs text-gray-400 mb-4">Convertidas vs. abandonaram</p>
      <ResponsiveContainer width="100%" height={140}>
        <BarChart data={chartData} barGap={2} margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
          <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
          <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} width={24} />
          <Tooltip content={<ChartTooltip />} />
          <Bar dataKey="convertidos" name="Assinaram"   fill="#10b981" radius={[3,3,0,0]} maxBarSize={28} />
          <Bar dataKey="abandonaram" name="Abandonaram" fill="#f87171" radius={[3,3,0,0]} maxBarSize={28} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

// ── Per-age cohort analysis ──────────────────────────────────────────────────
// Same design language as QuestionChart / LangCountryPanel / IndividualFunnel
// elsewhere in this page: white card, gray-100 border, violet-500 bars,
// gray-50 stat boxes. No emojis, no colored backdrops — keeps the page
// scannable as one consistent surface.
const TRAIT_DIMENSIONS = [
  { key: 'hairType',          label: 'Cabelo' },
  { key: 'symptomsIntensity', label: 'Sintomas' },
  { key: 'heatTools',         label: 'Calor' },
  { key: 'chemProducts',      label: 'Químicos' },
  { key: 'hydration',         label: 'Hidratação' },
]

function AgeBreakdownSection({ ageBreakdown, loading, productPrice = 17 }) {
  if (loading) return null
  const buckets = AGE_ORDER
    .map(age => ({ age, ...(ageBreakdown[age] ?? null) }))
    .filter(b => b.started)  // skip empty buckets

  if (buckets.length === 0) return null

  return (
    <section>
      <SectionHeader title="Análise por faixa etária" />
      <p className="text-xs text-gray-400 mb-4 -mt-2">
        Qual idade converte mais e quais perfis predominam em cada cohort
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {buckets.map(b => {
          const convPct = b.conv_rate ?? 0
          const revenue = (b.converted ?? 0) * productPrice

          return (
            <div key={b.age} className="bg-white rounded-2xl border border-gray-100 p-5">
              {/* Header — same pattern as QuestionChart */}
              <div className="flex items-center justify-between mb-4">
                <p className="font-bold text-gray-800 text-sm">{AGE_LABELS[b.age] ?? b.age}</p>
                <span className="text-xs text-gray-400">{b.converted} de {b.started}</span>
              </div>

              {/* Two stat tiles — same pattern as IndividualFunnel */}
              <div className="grid grid-cols-2 gap-3 mb-5">
                <div className="bg-gray-50 rounded-xl p-3 text-center">
                  <p className="text-xs text-gray-500 mb-0.5">Conversão</p>
                  <p className="text-xl font-extrabold text-gray-900 tabular-nums">{convPct}%</p>
                </div>
                <div className="bg-gray-50 rounded-xl p-3 text-center">
                  <p className="text-xs text-gray-500 mb-0.5">Receita</p>
                  <p className="text-xl font-extrabold text-gray-900 tabular-nums">${revenue}</p>
                </div>
              </div>

              {/* Predominant trait per dimension — same row pattern as
                  QuestionChart (label / bar / value / %) */}
              <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-3">
                Perfil predominante
              </p>
              <div className="space-y-3">
                {TRAIT_DIMENSIONS.map(({ key, label }) => {
                  const top = topValue(b[key], QUESTION_LABELS[key]?.options)
                  if (!top) return null
                  return (
                    <div key={key} className="flex items-center gap-3">
                      <span className="text-xs font-semibold text-gray-600 w-20 flex-shrink-0 truncate">
                        {label}
                      </span>
                      <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-violet-500 rounded-full transition-all duration-500"
                          style={{ width: `${top.pct}%` }}
                        />
                      </div>
                      <span className="text-xs font-medium text-gray-700 w-20 text-right truncate" title={top.label}>
                        {top.label}
                      </span>
                      <span className="text-xs text-gray-400 w-10 text-right tabular-nums">{top.pct}%</span>
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export default function AdminQuizAnswers() {
  const { apiFetch } = useAdminFetch()

  const [mode, setMode]           = useState('comparison')  // 'comparison' | plan_key
  const [period, setPeriod]       = useState('30d')
  const [compData, setCompData]   = useState(null)
  const [quizData, setQuizData]   = useState(null)
  const [compLoading, setCompLoading] = useState(true)
  const [quizLoading, setQuizLoading] = useState(false)
  const [error, setError]         = useState(null)

  const loadComparison = useCallback(async (p = period) => {
    setCompLoading(true)
    setError(null)
    try {
      const result = await apiFetch(`/admin-multiplan?period=${p}`)
      if (!result) return
      setCompData(result)
    } catch (e) {
      setError(e?.message ?? 'Erro ao carregar dados de comparação')
    } finally {
      setCompLoading(false)
    }
  }, [apiFetch, period])

  const loadIndividualQuiz = useCallback(async (funnel) => {
    setQuizLoading(true)
    try {
      // funnel = 'bold' | 'detox' — selects event_type prefix on the server
      // (quiz_bold_* vs quiz_detox_*). The legacy `plan` query param is for
      // pricing_plan filtering, which is not what we want here.
      const result = await apiFetch(`/admin-quiz?funnel=${funnel}`)
      if (!result) return
      setQuizData(result)
    } catch {
      setQuizData(null)
    } finally {
      setQuizLoading(false)
    }
  }, [apiFetch])

  // Always load comparison data (drives both modes)
  useEffect(() => { loadComparison() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Load individual quiz data when switching to a plan mode
  useEffect(() => {
    if (mode !== 'comparison') loadIndividualQuiz(mode)
  }, [mode]) // eslint-disable-line react-hooks/exhaustive-deps

  const handlePeriod = (p) => {
    setPeriod(p)
    loadComparison(p)
  }

  const handleMode = (m) => {
    setMode(m)
    if (m !== 'comparison' && (!quizData || m !== mode)) {
      loadIndividualQuiz(m)
    }
  }

  const handleRefresh = () => {
    loadComparison(period)
    if (mode !== 'comparison') loadIndividualQuiz(mode)
  }

  // Data derived from compData
  const plans        = compData?.plans ?? []
  const significance = compData?.significance ?? null
  const selectedPlanData = plans.find(p => p.plan_key === mode) ?? null

  // Quiz analysis data for individual mode
  const dist             = quizData?.dist             ?? {}
  const diagDist         = quizData?.diagDist         ?? { red: 0, amber: 0, green: 0 }
  const diagConversion   = quizData?.diagConversion   ?? {}
  const convertedAnswers = quizData?.convertedAnswers ?? {}
  const abandonedAnswers = quizData?.abandonedAnswers ?? {}
  const ageBreakdown     = quizData?.ageBreakdown     ?? {}
  const totalDiag = (diagDist.red ?? 0) + (diagDist.amber ?? 0) + (diagDist.green ?? 0)

  const isLoading = compLoading || (mode !== 'comparison' && quizLoading)

  return (
    <div className="flex flex-col gap-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-extrabold text-gray-900">Respostas do Quiz</h1>
          <p className="text-sm text-gray-400 mt-0.5">
            {mode === 'comparison' ? 'Comparação dos 3 produtos' : `Análise individual (${PLANS.find(p => p.key === mode)?.label})`}
          </p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={isLoading}
          className="flex items-center justify-center w-10 h-10 bg-white border border-gray-200 rounded-xl text-gray-400 hover:text-gray-700 hover:border-gray-300 transition-all disabled:opacity-40"
        >
          <ArrowClockwise size={16} weight="fill" className={isLoading ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* Mode tabs + period filter row */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between flex-wrap">
        {/* Mode tabs */}
        <div className="overflow-x-auto">
          <div className="flex bg-white border border-gray-200 rounded-xl p-1 gap-0.5 min-w-max">
            <button
              onClick={() => handleMode('comparison')}
              className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-all ${
                mode === 'comparison' ? 'bg-violet-600 text-white' : 'text-gray-500 hover:text-gray-800'
              }`}
            >
              Comparação
            </button>
            {PLANS.map(p => (
              <button
                key={p.key}
                onClick={() => handleMode(p.key)}
                className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-all whitespace-nowrap ${
                  mode === p.key ? 'text-white' : 'text-gray-500 hover:text-gray-800'
                }`}
                style={mode === p.key ? { background: p.color } : {}}
              >
                {p.short}
              </button>
            ))}
          </div>
        </div>

        {/* Period filter (only in comparison mode) */}
        {mode === 'comparison' && (
          <div className="flex bg-white border border-gray-200 rounded-xl p-1 gap-0.5">
            {PERIODS.map(p => (
              <button
                key={p.key}
                onClick={() => handlePeriod(p.key)}
                className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-all ${
                  period === p.key ? 'bg-violet-600 text-white' : 'text-gray-500 hover:text-gray-800'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {error && <ErrorBanner message={error} onRetry={handleRefresh} />}

      {/* ── COMPARISON MODE ── */}
      {mode === 'comparison' && (
        <>
          {/* Winner card */}
          {!compLoading && significance && (
            <WinnerCard significance={significance} plans={plans} />
          )}
          {compLoading && <div className="h-32 bg-violet-50 rounded-2xl animate-pulse border border-violet-100" />}

          {/* Comparison table */}
          <section>
            <SectionHeader title={`Comparação detalhada (últimos ${period === '7d' ? '7' : period === '30d' ? '30' : '90'} dias)`} />
            <ComparisonTable plans={plans} loading={compLoading} />
          </section>
        </>
      )}

      {/* ── INDIVIDUAL MODE ── */}
      {mode !== 'comparison' && (
        <>
          {/* Individual funnel visual */}
          <section>
            <SectionHeader title="Funil de conversão" />
            {compLoading ? (
              <div className="bg-white rounded-2xl border border-gray-100 p-5 animate-pulse space-y-4">
                {[1,2,3,4,5].map(i => <div key={i} className="h-8 bg-gray-100 rounded-xl" style={{ width: `${100 - i*12}%` }} />)}
              </div>
            ) : (
              <IndividualFunnel planData={selectedPlanData} />
            )}
          </section>

          {/* Language + country */}
          <section>
            <SectionHeader title="Geografia e idioma (histórico completo)" />
            <LangCountryPanel quizData={quizData} loading={quizLoading} />
          </section>

          {/* Quiz overview metrics */}
          <section>
            <SectionHeader title="Visão geral do quiz" />
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {[
                { icon: ClipboardList, iconBg: 'bg-violet-50', iconColor: 'text-violet-500', label: 'Quiz iniciados (histórico)', value: quizLoading ? '—' : (quizData?.totalStarted ?? 0) },
                { icon: Users,         iconBg: 'bg-violet-50', iconColor: 'text-violet-500', label: 'Quiz completados',           value: quizLoading ? '—' : (quizData?.totalCompleted ?? 0) },
                { icon: TrendingUp,    iconBg: 'bg-emerald-50', iconColor: 'text-emerald-500', label: 'Taxa de conclusão',       value: quizLoading ? '—' : `${quizData?.completionRate ?? 0}%` },
              ].map(({ icon: Icon, iconBg, iconColor, label, value }) => (
                <div key={label} className={`bg-white rounded-2xl border border-gray-100 p-5 ${quizLoading ? 'animate-pulse' : ''}`}>
                  <div className="flex items-center gap-3 mb-3">
                    <div className={`w-9 h-9 rounded-xl ${iconBg} flex items-center justify-center flex-shrink-0`}>
                      <Icon className={`w-[18px] h-[18px] ${iconColor}`} />
                    </div>
                    <span className="text-sm text-gray-500 font-medium leading-tight">{label}</span>
                  </div>
                  <p className="text-3xl font-extrabold text-gray-900 tracking-tight">{value}</p>
                </div>
              ))}
            </div>
          </section>

          {/* Diagnosis distribution */}
          <section>
            <SectionHeader title="Diagnóstico recebido" />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-white rounded-2xl border border-gray-100 p-5">
                <div className="flex items-center justify-between mb-4">
                  <p className="font-bold text-gray-800">Distribuição de diagnóstico</p>
                  {!quizLoading && <span className="text-sm text-gray-400">{totalDiag} total</span>}
                </div>
                {quizLoading ? <ChartSkeleton h={100} /> : (
                  <div className="space-y-3">
                    {Object.entries(DIAG_CONFIG).map(([key, cfg]) => {
                      const count = diagDist[key] ?? 0
                      return (
                        <div key={key} className="flex items-center gap-3">
                          <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${cfg.bg} ${cfg.text} w-16 text-center flex-shrink-0`}>
                            {key === 'red' ? 'Verm.' : key === 'amber' ? 'Âmbar' : 'Verde'}
                          </span>
                          <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                            <div className="h-full rounded-full transition-all duration-500" style={{ width: totalDiag > 0 ? `${(count / totalDiag) * 100}%` : '0%', background: cfg.bar }} />
                          </div>
                          <span className="text-sm font-bold text-gray-700 w-8 text-right tabular-nums">{count}</span>
                          <span className="text-xs text-gray-400 w-10 text-right tabular-nums">{totalDiag > 0 ? `${((count / totalDiag) * 100).toFixed(0)}%` : '—'}</span>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
              <div className="bg-white rounded-2xl border border-gray-100 p-5">
                <p className="font-bold text-gray-800 mb-4">Diagnóstico × taxa de conversão</p>
                {quizLoading ? <ChartSkeleton h={120} /> : (
                  <div className="space-y-3">
                    {Object.entries(diagConversion).map(([key, val]) => {
                      const cfg = DIAG_CONFIG[key]
                      if (!cfg) return null
                      return (
                        <div key={key} className="flex flex-col gap-1">
                          <div className="flex items-center justify-between">
                            <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${cfg.bg} ${cfg.text}`}>{key === 'red' ? 'Vermelho' : key === 'amber' ? 'Âmbar' : 'Verde'}</span>
                            <span className="text-sm font-bold text-gray-700 tabular-nums">{val.rate ?? 0}% conversão</span>
                          </div>
                          <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                            <div className="h-full rounded-full" style={{ width: `${val.rate ?? 0}%`, background: cfg.bar }} />
                          </div>
                          <p className="text-xs text-gray-400">{val.converted ?? 0} assinaram de {val.total ?? 0}</p>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>
          </section>

          {/* Question distributions */}
          <section>
            <SectionHeader title="Distribuição por pergunta" />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {Object.keys(QUESTION_LABELS).map(field => (
                <QuestionChart key={field} field={field} dist={dist} loading={quizLoading} />
              ))}
            </div>
          </section>

          {/* Per-age cohort analysis (informs ad targeting + creative copy) */}
          <AgeBreakdownSection ageBreakdown={ageBreakdown} loading={quizLoading} />

          {/* Converted vs abandoned */}
          <section>
            <SectionHeader title="Perfil comparativo: assinaram vs. abandonaram" />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {Object.keys(QUESTION_LABELS).map(field => (
                <ComparisonChart
                  key={field}
                  field={field}
                  convertedAnswers={convertedAnswers}
                  abandonedAnswers={abandonedAnswers}
                  loading={quizLoading}
                />
              ))}
            </div>
            {!quizLoading && (
              <p className="text-xs text-gray-400 mt-2 text-center">
                "Assinaram" (mesma sessão que depois completou pagamento), "Abandonaram" (viram /Results mas não converteram)
              </p>
            )}
          </section>
        </>
      )}
    </div>
  )
}
