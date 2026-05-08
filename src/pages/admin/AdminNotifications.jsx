import React, { useEffect, useState, useCallback } from 'react'
import {
  Bell, Send, History, BarChart2,
  ChevronLeft, ChevronRight, Search, Loader2,
  CheckCheck,
} from 'lucide-react'
import { ArrowClockwise } from '@phosphor-icons/react'
import {
  ResponsiveContainer, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip,
} from 'recharts'
import MetricCard from './components/MetricCard'
import SectionHeader from './components/SectionHeader'
import ChartSkeleton from './components/ChartSkeleton'
import ChartTooltip from './components/ChartTooltip'
import ErrorBanner from './components/ErrorBanner'
import { useAdminFetch } from './hooks/useAdminFetch'

const TABS = [
  { key: 'send',    label: 'Enviar Nova',  icon: Send },
  { key: 'history', label: 'Histórico',    icon: History },
  { key: 'stats',   label: 'Estatísticas', icon: BarChart2 },
]

const SEGMENTS = [
  { key: 'all_active',    label: 'Todas ativas' },
  { key: 'by_plan',       label: 'Por plano' },
  { key: 'by_status',     label: 'Por status' },
  { key: 'inactive_days', label: 'Inativas há X dias' },
  { key: 'user_email',    label: 'Individual (email)' },
]

const PLANS = [
  { key: 'monthly_499',  label: '$4.99/mês' },
  { key: 'monthly_699',  label: '$6.99/mês' },
  { key: 'monthly_1499', label: '$14.99/mês' },
]

const STATUSES = [
  { key: 'active',   label: 'Ativa' },
  { key: 'canceled', label: 'Cancelada' },
  { key: 'past_due', label: 'Inadimplente' },
  { key: 'inactive', label: 'Inativa' },
]

const CHANNEL_BADGE = {
  inapp: { label: 'In-app',      bg: 'bg-blue-50',   text: 'text-blue-700' },
  push:  { label: 'Push',        bg: 'bg-violet-50', text: 'text-violet-700' },
  both:  { label: 'In-app+Push', bg: 'bg-brand-bg',  text: 'text-brand-dark' },
}

function fmtDate(ts) {
  if (!ts) return '—'
  return new Date(ts).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })
}

function pct(a, b) {
  if (!b) return '0%'
  return `${((a / b) * 100).toFixed(1)}%`
}

// ─── Sub-tab: Enviar Nova ─────────────────────────────────────────────────────
function SendTab({ apiFetch, onSent }) {
  const [segment, setSegment]         = useState('all_active')
  const [segmentValue, setSegmentValue] = useState('')
  const [titleEn, setTitleEn]         = useState('')
  const [titleEs, setTitleEs]         = useState('')
  const [bodyEn, setBodyEn]           = useState('')
  const [bodyEs, setBodyEs]           = useState('')
  const [url, setUrl]                 = useState('')
  const [channelInapp, setChannelInapp] = useState(true)
  const [channelPush, setChannelPush] = useState(true)
  const [sending, setSending]         = useState(false)
  const [result, setResult]           = useState(null)
  const [lookupLoading, setLookupLoading] = useState(false)
  const [lookupResult, setLookupResult]   = useState(null)

  const handleLookup = async () => {
    if (!segmentValue.trim()) return
    setLookupLoading(true)
    setLookupResult(null)
    const data = await apiFetch(`/admin-notifications?mode=lookup&email=${encodeURIComponent(segmentValue.trim())}`)
    setLookupResult(data)
    setLookupLoading(false)
  }

  const canSend = () => {
    if (!titleEn || !titleEs || !bodyEn || !bodyEs) return false
    if (!channelInapp && !channelPush) return false
    if (segment === 'user_email' && (!lookupResult?.found)) return false
    if (segment === 'by_plan' && !segmentValue) return false
    if (segment === 'by_status' && !segmentValue) return false
    if (segment === 'inactive_days' && !segmentValue) return false
    return true
  }

  const handleSend = async () => {
    if (!canSend()) return
    setSending(true)
    setResult(null)
    const channels = channelInapp && channelPush ? ['both']
      : channelInapp ? ['inapp'] : ['push']
    const body = {
      segmentation: { type: segment, value: segmentValue },
      title_en: titleEn, title_es: titleEs,
      body_en: bodyEn, body_es: bodyEs,
      url: url || null,
      channels,
    }
    const data = await apiFetch('/admin-notifications', { method: 'POST', body: JSON.stringify(body) })
    setSending(false)
    setResult(data)
    if (data?.ok) onSent?.()
  }

  const inputCls = 'w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl bg-white focus:outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100 transition-all'
  const labelCls = 'block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wide'

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-5">

      {/* Destinatários */}
      <div>
        <p className={labelCls}>Destinatários</p>
        <div className="flex flex-wrap gap-2 mb-3">
          {SEGMENTS.map(s => (
            <button
              key={s.key}
              onClick={() => { setSegment(s.key); setSegmentValue(''); setLookupResult(null) }}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                segment === s.key
                  ? 'bg-violet-600 text-white'
                  : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>

        {segment === 'by_plan' && (
          <select value={segmentValue} onChange={e => setSegmentValue(e.target.value)} className={inputCls}>
            <option value="">Selecione o plano</option>
            {PLANS.map(p => <option key={p.key} value={p.key}>{p.label}</option>)}
          </select>
        )}
        {segment === 'by_status' && (
          <select value={segmentValue} onChange={e => setSegmentValue(e.target.value)} className={inputCls}>
            <option value="">Selecione o status</option>
            {STATUSES.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
          </select>
        )}
        {segment === 'inactive_days' && (
          <input
            type="number" min="1" max="365"
            placeholder="Ex: 30"
            value={segmentValue}
            onChange={e => setSegmentValue(e.target.value)}
            className={inputCls}
          />
        )}
        {segment === 'user_email' && (
          <div className="space-y-2">
            <div className="flex gap-2">
              <input
                type="email"
                placeholder="email@exemplo.com"
                value={segmentValue}
                onChange={e => { setSegmentValue(e.target.value); setLookupResult(null) }}
                className={`${inputCls} flex-1`}
                onKeyDown={e => e.key === 'Enter' && handleLookup()}
              />
              <button
                onClick={handleLookup}
                disabled={lookupLoading || !segmentValue.trim()}
                className="flex items-center gap-1.5 px-4 py-2 bg-violet-600 text-white text-sm font-semibold rounded-xl hover:bg-violet-700 disabled:opacity-40 transition-all"
              >
                {lookupLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                Buscar
              </button>
            </div>
            {lookupResult && (
              <div className={`p-3 rounded-xl text-sm ${lookupResult.found ? 'bg-emerald-50 border border-emerald-200' : 'bg-red-50 border border-red-200'}`}>
                {lookupResult.found ? (
                  <div className="flex items-center gap-3">
                    <CheckCheck className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                    <span className="font-medium text-emerald-800">{lookupResult.name || lookupResult.email}</span>
                    <span className="text-xs text-emerald-600 bg-emerald-100 px-2 py-0.5 rounded-full">{lookupResult.plan}</span>
                    <span className="text-xs text-emerald-600">{lookupResult.status}</span>
                  </div>
                ) : (
                  <p className="text-red-700 font-medium">Email não encontrado na base</p>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Títulos */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className={labelCls}>Título EN</label>
          <input value={titleEn} onChange={e => setTitleEn(e.target.value)} placeholder="Title in English" className={inputCls} />
        </div>
        <div>
          <label className={labelCls}>Título ES</label>
          <input value={titleEs} onChange={e => setTitleEs(e.target.value)} placeholder="Título en Español" className={inputCls} />
        </div>
      </div>

      {/* Mensagens */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className={labelCls}>Mensagem EN</label>
          <textarea rows={3} value={bodyEn} onChange={e => setBodyEn(e.target.value)} placeholder="Message body in English" className={`${inputCls} resize-none`} />
        </div>
        <div>
          <label className={labelCls}>Mensagem ES</label>
          <textarea rows={3} value={bodyEs} onChange={e => setBodyEs(e.target.value)} placeholder="Cuerpo del mensaje en Español" className={`${inputCls} resize-none`} />
        </div>
      </div>

      {/* URL destino */}
      <div>
        <label className={labelCls}>URL destino (opcional)</label>
        <input value={url} onChange={e => setUrl(e.target.value)} placeholder="/HairDashboard ou URL externa" className={inputCls} />
      </div>

      {/* Canal */}
      <div>
        <p className={labelCls}>Canal de envio</p>
        <div className="flex gap-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <button
              role="switch" aria-checked={channelInapp}
              onClick={() => setChannelInapp(v => !v)}
              className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${channelInapp ? 'bg-violet-600' : 'bg-gray-200'}`}
            >
              <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow-sm transition-transform ${channelInapp ? 'translate-x-4' : 'translate-x-1'}`} />
            </button>
            <span className="text-sm font-medium text-gray-700">In-app (sino)</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <button
              role="switch" aria-checked={channelPush}
              onClick={() => setChannelPush(v => !v)}
              className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${channelPush ? 'bg-violet-600' : 'bg-gray-200'}`}
            >
              <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow-sm transition-transform ${channelPush ? 'translate-x-4' : 'translate-x-1'}`} />
            </button>
            <span className="text-sm font-medium text-gray-700">Push</span>
          </label>
        </div>
      </div>

      {/* Resultado */}
      {result && (
        <div className={`p-4 rounded-xl text-sm ${result.ok ? 'bg-emerald-50 border border-emerald-200 text-emerald-800' : 'bg-red-50 border border-red-200 text-red-800'}`}>
          {result.ok
            ? `✓ Enviado: ${result.sent ?? 0} destinatárias, ${result.failed ?? 0} falhas`
            : `Erro: ${result.error ?? 'Falha no envio'}`}
        </div>
      )}

      {/* Ações */}
      <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
        <button
          onClick={handleSend}
          disabled={sending || !canSend()}
          className="flex items-center gap-2 px-5 py-2.5 bg-violet-600 text-white text-sm font-semibold rounded-xl hover:bg-violet-700 disabled:opacity-40 transition-all"
        >
          {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          {sending ? 'Enviando...' : 'Enviar agora'}
        </button>
      </div>
    </div>
  )
}

// ─── Sub-tab: Histórico ───────────────────────────────────────────────────────
function HistoryTab({ apiFetch }) {
  const [rows, setRows]   = useState([])
  const [total, setTotal] = useState(0)
  const [page, setPage]   = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const PER_PAGE = 20

  const load = useCallback(async (p = page) => {
    setLoading(true)
    setError(null)
    const data = await apiFetch(`/admin-notifications?mode=history&page=${p}`)
    if (data) { setRows(data.rows ?? []); setTotal(data.total ?? 0) }
    else setError('Erro ao carregar histórico')
    setLoading(false)
  }, [apiFetch, page])

  useEffect(() => { load(1) }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const totalPages = Math.ceil(total / PER_PAGE)

  const describeSegment = (seg) => {
    if (!seg) return 'Todas ativas'
    const map = {
      all_active:    'Todas ativas',
      by_plan:       `Plano: ${seg.value ?? ''}`,
      by_status:     `Status: ${seg.value ?? ''}`,
      inactive_days: `Inativas há ${seg.value ?? '?'} dias`,
      user_email:    `Email: ${seg.value ?? ''}`,
    }
    return map[seg.type] ?? JSON.stringify(seg)
  }

  return (
    <div>
      {error && <ErrorBanner message={error} onRetry={() => load(page)} />}

      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100">
              {['Data', 'Segmentação', 'Título (EN)', 'Canal', 'Enviadas', 'Clicks'].map(h => (
                <th key={h} className="px-4 py-3 text-left text-[11px] font-bold text-gray-400 uppercase tracking-wide whitespace-nowrap">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i} className="border-b border-gray-50 animate-pulse">
                  {Array.from({ length: 6 }).map((__, j) => (
                    <td key={j} className="px-4 py-3">
                      <div className="h-3 bg-gray-100 rounded-full w-20" />
                    </td>
                  ))}
                </tr>
              ))
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-sm text-gray-400">
                  Nenhum envio registrado ainda
                </td>
              </tr>
            ) : rows.map(row => {
              const badge = CHANNEL_BADGE[row.channels?.[0]] ?? CHANNEL_BADGE.inapp
              return (
                <tr key={row.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{fmtDate(row.sent_at)}</td>
                  <td className="px-4 py-3 text-gray-700 max-w-[180px] truncate">{describeSegment(row.segmentation)}</td>
                  <td className="px-4 py-3 text-gray-700 max-w-[200px] truncate">{row.title_en}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-bold px-2 py-1 rounded-full ${badge.bg} ${badge.text}`}>
                      {badge.label}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-700">
                    {row.total_sent}
                    {row.total_failed > 0 && (
                      <span className="ml-1 text-xs text-red-500">({row.total_failed} falhas)</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-700">
                    {row.total_clicked}
                    <span className="ml-1 text-xs text-gray-400">
                      ({pct(row.total_clicked, row.total_sent)})
                    </span>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
            <p className="text-xs text-gray-400">
              {total} envios · página {page} de {totalPages}
            </p>
            <div className="flex gap-1">
              <button
                onClick={() => { const p = page - 1; setPage(p); load(p) }}
                disabled={page <= 1}
                className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-30 transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => { const p = page + 1; setPage(p); load(p) }}
                disabled={page >= totalPages}
                className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-30 transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Sub-tab: Estatísticas ────────────────────────────────────────────────────
function StatsTab({ apiFetch }) {
  const [data, setData]   = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    const result = await apiFetch('/admin-notifications?mode=stats')
    if (result) setData(result)
    else setError('Erro ao carregar estatísticas')
    setLoading(false)
  }, [apiFetch])

  useEffect(() => { load() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const chartData = data?.chartData ?? []

  return (
    <div className="space-y-5">
      {error && <ErrorBanner message={error} onRetry={load} />}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          icon={Bell} iconBg="bg-violet-50" iconColor="text-violet-500"
          label="Assinantes push opt-in"
          value={loading ? '—' : (data?.pushOptInCount ?? 0)}
          loading={loading}
        />
        <MetricCard
          icon={BarChart2} iconBg="bg-blue-50" iconColor="text-blue-500"
          label="Taxa de opt-in push"
          value={loading ? '—' : `${data?.optInRate ?? 0}%`}
          loading={loading}
        />
        <MetricCard
          icon={Send} iconBg="bg-emerald-50" iconColor="text-emerald-500"
          label="Enviadas este mês"
          value={loading ? '—' : (data?.sentThisMonth ?? 0)}
          loading={loading}
        />
        <MetricCard
          icon={CheckCheck} iconBg="bg-amber-50" iconColor="text-amber-500"
          label="Click rate médio"
          value={loading ? '—' : `${data?.avgClickRate ?? 0}%`}
          loading={loading}
        />
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 p-5">
        <SectionHeader title="Envios últimos 30 dias" />
        {loading ? <ChartSkeleton h={220} /> : (
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
              <defs>
                <linearGradient id="gradNotif" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#7c3aed" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#7c3aed" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#9ca3af' }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} tickLine={false} axisLine={false} />
              <Tooltip content={<ChartTooltip />} />
              <Area type="monotone" dataKey="sent" name="Enviadas" stroke="#7c3aed" strokeWidth={2} fill="url(#gradNotif)" dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  )
}

// ─── AdminNotifications (root) ────────────────────────────────────────────────
export default function AdminNotifications() {
  const { apiFetch } = useAdminFetch()
  const [tab, setTab] = useState('send')
  const [historyKey, setHistoryKey] = useState(0)

  return (
    <div className="flex flex-col gap-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-extrabold text-gray-900">Notificações</h1>
          <p className="text-sm text-gray-400 mt-0.5">Envio de notificações push e in-app</p>
        </div>
      </div>

      {/* Sub-tabs */}
      <div className="flex bg-white border border-gray-200 rounded-xl p-1 gap-0.5 w-fit">
        {TABS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
              tab === key
                ? 'bg-violet-600 text-white shadow-sm'
                : 'text-gray-500 hover:text-gray-800 hover:bg-gray-50'
            }`}
          >
            <Icon className="w-3.5 h-3.5" />
            {label}
          </button>
        ))}
      </div>

      {/* Content */}
      {tab === 'send' && (
        <SendTab
          apiFetch={apiFetch}
          onSent={() => setHistoryKey(k => k + 1)}
        />
      )}
      {tab === 'history' && <HistoryTab key={historyKey} apiFetch={apiFetch} />}
      {tab === 'stats'   && <StatsTab apiFetch={apiFetch} />}
    </div>
  )
}
