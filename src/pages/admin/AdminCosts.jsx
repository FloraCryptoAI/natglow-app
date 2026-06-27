import React, { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAdminAuth } from '@/lib/AdminAuthContext'
import {
  AlertCircle, Plus, Pencil, Trash2, X, Check,
  DollarSign, TrendingUp, TrendingDown, Percent, ChevronLeft, ChevronRight,
} from 'lucide-react'
import { ArrowClockwise } from '@phosphor-icons/react'
import {
  ResponsiveContainer, BarChart, Bar, LineChart, Line,
  PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend,
} from 'recharts'

// ── constants ──────────────────────────────────────────

const CATEGORIES = [
  { key: 'trafego_pago', label: 'Tráfego Pago',  emoji: '📢' },
  { key: 'freelancer',   label: 'Freelancer',     emoji: '👩‍💻' },
  { key: 'ferramentas',  label: 'Ferramentas',    emoji: '🛠️' },
  { key: 'outros',       label: 'Outros',         emoji: '📝' },
]

// Overloaded use of admin_costs.pricing_plan to encode the funnel (not a true
// plan_key). New ad costs should be tagged 'bold' or 'detox' so ROI splits per
// funnel. Legacy one_time_* values still exist in the DB for historical costs
// but are no longer offered in the dropdown — they roll up to 'global' in ROI.
const FUNNEL_OPTIONS = [
  { value: null,    label: 'Global / não vinculado' },
  { value: 'bold',  label: 'Quiz Bold' },
  { value: 'detox', label: 'Quiz Detox' },
]

const CONFIDENCE_CONFIG = {
  high:   { label: 'Confiável',        className: 'text-emerald-700 bg-emerald-50' },
  medium: { label: 'Tendência',        className: 'text-amber-700 bg-amber-50' },
  low:    { label: 'Aguardando dados', className: 'text-gray-500 bg-gray-100' },
}

const PERIODS = [
  { key: 'today',         label: 'Hoje' },
  { key: '7d',            label: '7 dias' },
  { key: '30d',           label: '30 dias' },
  { key: 'current_month', label: 'Mês atual' },
  { key: 'custom',        label: 'Personalizado' },
]

const TODAY = new Date().toISOString().slice(0, 10)

// ── shared UI helpers ──────────────────────────────────

function SectionHeader({ title }) {
  return <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">{title}</p>
}

function ChartTooltip({ active, payload, label, prefix = '' }) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-gray-900 text-white rounded-xl px-3 py-2.5 shadow-xl text-xs">
      <p className="font-bold mb-1">{label}</p>
      {payload.map(p => (
        <p key={p.dataKey} className="font-medium" style={{ color: p.color }}>
          {p.name}: {prefix}
          {typeof p.value === 'number' ? p.value.toFixed(2) : p.value}
        </p>
      ))}
    </div>
  )
}

function ChartSkeleton({ h = 200 }) {
  return <div className="animate-pulse bg-gray-50 rounded-xl" style={{ height: h }} />
}

function MetricCard({ icon: Icon, iconBg, iconColor, label, value, sub, loading, highlight }) {
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
    <div className={`rounded-2xl border p-5 ${highlight ? 'bg-violet-50 border-violet-200' : 'bg-white border-gray-100'}`}>
      <div className="flex items-center gap-3 mb-3">
        <div className={`w-9 h-9 rounded-xl ${iconBg} flex items-center justify-center flex-shrink-0`}>
          <Icon className={`w-[18px] h-[18px] ${iconColor}`} />
        </div>
        <span className="text-sm text-gray-500 font-medium leading-tight">{label}</span>
      </div>
      <p className={`text-3xl font-extrabold tracking-tight ${highlight ? 'text-violet-600' : 'text-gray-900'}`}>{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
    </div>
  )
}

function ErrorBanner({ message, onRetry }) {
  return (
    <div className="bg-red-50 border border-red-200 rounded-2xl p-4 flex items-start gap-3">
      <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
      <p className="text-sm text-red-600 flex-1">{message}</p>
      {onRetry && (
        <button onClick={onRetry} className="text-sm font-semibold text-red-600 hover:text-red-700 flex items-center gap-1.5 flex-shrink-0">
          <ArrowClockwise size={14} weight="fill" /> Tentar novamente
        </button>
      )}
    </div>
  )
}

// ── period selector ────────────────────────────────────

function PeriodSelector({ period, onPeriod, customStart, customEnd, onCustomStart, onCustomEnd, onApply }) {
  return (
    <div className="flex flex-col gap-2 min-w-0 flex-1 sm:flex-none">
      <div className="overflow-x-auto">
        <div className="flex bg-white border border-gray-200 rounded-xl p-1 gap-0.5 min-w-max">
          {PERIODS.map(p => (
            <button
              key={p.key}
              onClick={() => onPeriod(p.key)}
              className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-all ${
                period === p.key ? 'bg-violet-600 text-white' : 'text-gray-500 hover:text-gray-800'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>
      {period === 'custom' && (
        <div className="flex items-center gap-2 text-sm">
          <input
            type="date" value={customStart} onChange={e => onCustomStart(e.target.value)}
            className="flex-1 min-w-0 rounded-xl border border-gray-200 px-2.5 py-1.5 text-sm text-gray-700 focus:outline-none focus:border-violet-400"
          />
          <span className="text-gray-400 flex-shrink-0">→</span>
          <input
            type="date" value={customEnd} onChange={e => onCustomEnd(e.target.value)}
            className="flex-1 min-w-0 rounded-xl border border-gray-200 px-2.5 py-1.5 text-sm text-gray-700 focus:outline-none focus:border-violet-400"
          />
          {onApply && (
            <button
              onClick={onApply}
              className="flex-shrink-0 px-3 py-1.5 rounded-xl bg-violet-600 text-white text-sm font-semibold"
            >
              Aplicar
            </button>
          )}
        </div>
      )}
    </div>
  )
}

// ── cost form modal ────────────────────────────────────

function CostFormModal({ open, onClose, onSave, initial, saving }) {
  const [form, setForm] = useState({
    data:             TODAY,
    categoria:        'trafego_pago',
    descricao_outros: '',
    valor:            '',
    observacao:       '',
    pricing_plan:     null,
    ...initial,
  })
  const [errors, setErrors] = useState({})

  useEffect(() => {
    if (open) {
      setForm({ data: TODAY, categoria: 'trafego_pago', descricao_outros: '', valor: '', observacao: '', pricing_plan: null, ...initial })
      setErrors({})
    }
  }, [open, JSON.stringify(initial)])  // eslint-disable-line react-hooks/exhaustive-deps

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const validate = () => {
    const e = {}
    if (!form.data)  e.data = 'Data obrigatória'
    if (!form.valor || isNaN(Number(form.valor)) || Number(form.valor) <= 0) e.valor = 'Valor inválido'
    if (form.categoria === 'outros' && !form.descricao_outros?.trim()) e.descricao_outros = 'Descrição obrigatória para Outros'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSave = () => {
    if (!validate()) return
    onSave({
      data:             form.data,
      categoria:        form.categoria,
      descricao_outros: form.categoria === 'outros' ? form.descricao_outros.trim() : null,
      valor:            Number(form.valor),
      observacao:       form.observacao?.trim() || null,
      pricing_plan:     form.pricing_plan || null,
    })
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <p className="font-bold text-gray-900">{initial?.id ? 'Editar custo' : 'Registrar custo'}</p>
          <button onClick={onClose} className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Data */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Data</label>
            <input
              type="date" value={form.data}
              onChange={e => set('data', e.target.value)}
              className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-700 focus:outline-none focus:border-violet-400"
            />
            {errors.data && <p className="text-xs text-red-500 mt-1">{errors.data}</p>}
          </div>

          {/* Categoria */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Categoria</label>
            <div className="grid grid-cols-2 gap-2">
              {CATEGORIES.map(cat => (
                <button
                  key={cat.key}
                  onClick={() => set('categoria', cat.key)}
                  className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-sm font-medium transition-all ${
                    form.categoria === cat.key
                      ? 'bg-violet-50 border-violet-300 text-violet-600'
                      : 'border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  <span>{cat.emoji}</span>
                  <span>{cat.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Descrição (somente para Outros) */}
          {form.categoria === 'outros' && (
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                Descreva o custo <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={form.descricao_outros}
                onChange={e => set('descricao_outros', e.target.value)}
                placeholder="Ex: Domínio, Curso, Design..."
                className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-700 placeholder:text-gray-300 focus:outline-none focus:border-violet-400"
              />
              {errors.descricao_outros && <p className="text-xs text-red-500 mt-1">{errors.descricao_outros}</p>}
            </div>
          )}

          {/* Valor */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Valor ($)</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-medium">$</span>
              <input
                type="number" min="0" step="0.01" value={form.valor}
                onChange={e => set('valor', e.target.value)}
                placeholder="0.00"
                className="w-full rounded-xl border border-gray-200 pl-7 pr-3 py-2 text-sm text-gray-700 placeholder:text-gray-300 focus:outline-none focus:border-violet-400"
              />
            </div>
            {errors.valor && <p className="text-xs text-red-500 mt-1">{errors.valor}</p>}
          </div>

          {/* Vincular a plano */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
              Vincular a funil <span className="text-gray-400 font-normal">(opcional)</span>
            </label>
            <select
              value={form.pricing_plan ?? ''}
              onChange={e => set('pricing_plan', e.target.value || null)}
              className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-700 focus:outline-none focus:border-violet-400 bg-white"
            >
              {FUNNEL_OPTIONS.map(o => (
                <option key={o.value ?? 'null'} value={o.value ?? ''}>{o.label}</option>
              ))}
            </select>
            <p className="text-xs text-gray-400 mt-1">Usado no cálculo de ROI por funil. Recomendado para Tráfego Pago.</p>
          </div>

          {/* Observação */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Observação <span className="text-gray-400 font-normal">(opcional)</span></label>
            <textarea
              value={form.observacao}
              onChange={e => set('observacao', e.target.value)}
              placeholder="Detalhes adicionais..."
              rows={2}
              className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-700 placeholder:text-gray-300 focus:outline-none focus:border-violet-400 resize-none"
            />
          </div>
        </div>

        <div className="px-5 pb-5 flex gap-2 justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-sm font-semibold text-gray-500 hover:bg-gray-100 transition-all"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-violet-600 text-white text-sm font-semibold hover:bg-violet-700 transition-all disabled:opacity-50"
          >
            {saving ? <ArrowClockwise size={14} weight="fill" className="animate-spin" /> : <Check className="w-3.5 h-3.5" />}
            {initial?.id ? 'Salvar' : 'Registrar'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── delete confirm modal ───────────────────────────────

function DeleteModal({ open, cost, onClose, onConfirm, deleting }) {
  if (!open || !cost) return null
  const catInfo = CATEGORIES.find(c => c.key === cost.categoria)
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
        <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-4">
          <Trash2 className="w-5 h-5 text-red-500" />
        </div>
        <p className="font-bold text-gray-900 text-center mb-1">Excluir custo?</p>
        <p className="text-sm text-gray-500 text-center mb-5">
          {catInfo?.emoji} {catInfo?.label}
          {cost.descricao_outros ? ` (${cost.descricao_outros})` : ''}
          {' '}· <strong>${Number(cost.valor).toFixed(2)}</strong>
        </p>
        <div className="flex gap-2">
          <button onClick={onClose} className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-all">
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            disabled={deleting}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-red-500 text-white text-sm font-semibold hover:bg-red-600 transition-all disabled:opacity-50"
          >
            {deleting ? <ArrowClockwise size={14} weight="fill" className="animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
            Excluir
          </button>
        </div>
      </div>
    </div>
  )
}

// ── pie chart tooltip ──────────────────────────────────

function PieTooltip({ active, payload }) {
  if (!active || !payload?.length) return null
  const d = payload[0]
  return (
    <div className="bg-gray-900 text-white rounded-xl px-3 py-2 shadow-xl text-xs">
      <p className="font-bold mb-0.5">{d.name}</p>
      <p className="font-medium" style={{ color: d.payload.color }}>
        ${Number(d.value).toFixed(2)} ({d.payload.pct}%)
      </p>
    </div>
  )
}

// ── main page ──────────────────────────────────────────

export default function AdminCosts() {
  const { adminToken, clearAdminToken } = useAdminAuth()
  const navigate = useNavigate()

  const supabaseUrl    = import.meta.env.VITE_SUPABASE_URL
  const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

  const authHeaders = useCallback(() => ({
    Authorization: `Bearer ${supabaseAnonKey}`,
    apikey: supabaseAnonKey,
    'x-admin-token': adminToken,
    'Content-Type': 'application/json',
  }), [adminToken, supabaseAnonKey])

  const baseUrl = `${supabaseUrl}/functions/v1/admin-costs`

  const handleUnauth = (status) => {
    if (status === 401 || status === 403) {
      clearAdminToken()
      navigate('/admin/login', { replace: true })
      return true
    }
    return false
  }

  // ── ROI state ─────────────────────────────────────────
  const [roiPeriod,     setRoiPeriod]     = useState('30d')
  const [roiCustomStart, setRoiCustomStart] = useState('')
  const [roiCustomEnd,   setRoiCustomEnd]   = useState('')
  const [roiData,       setRoiData]       = useState(null)
  const [loadingRoi,    setLoadingRoi]    = useState(true)
  const [errorRoi,      setErrorRoi]      = useState(null)

  // ── List state ────────────────────────────────────────
  const [page,           setPage]          = useState(1)
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [listPeriod,     setListPeriod]    = useState('all')
  const [listCustomStart, setListCustomStart] = useState('')
  const [listCustomEnd,   setListCustomEnd]   = useState('')
  const [costs,          setCosts]         = useState([])
  const [costsTotal,     setCostsTotal]    = useState(0)
  const [loadingList,    setLoadingList]   = useState(true)
  const [errorList,      setErrorList]     = useState(null)

  // ── Form state ────────────────────────────────────────
  const [formOpen,    setFormOpen]    = useState(false)
  const [editingCost, setEditingCost] = useState(null)
  const [saving,      setSaving]      = useState(false)

  // ── Delete state ──────────────────────────────────────
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleting,     setDeleting]     = useState(false)

  // ── fetch ROI ─────────────────────────────────────────
  const loadRoi = useCallback(async (p = roiPeriod, cs = roiCustomStart, ce = roiCustomEnd) => {
    setLoadingRoi(true)
    setErrorRoi(null)
    try {
      const params = new URLSearchParams({ mode: 'roi', period: p })
      if (p === 'custom') { params.set('start', cs); params.set('end', ce) }
      const res = await fetch(`${baseUrl}?${params}`, { headers: authHeaders() })
      if (handleUnauth(res.status)) return
      const result = await res.json()
      if (result?.error) throw new Error(result.error)
      setRoiData(result)
    } catch (e) {
      setErrorRoi(e?.message ?? 'Erro ao carregar dados de ROI')
    } finally {
      setLoadingRoi(false)
    }
  }, [adminToken]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── fetch list ────────────────────────────────────────
  const loadList = useCallback(async (p = page, cat = categoryFilter, lp = listPeriod, ls = listCustomStart, le = listCustomEnd) => {
    setLoadingList(true)
    setErrorList(null)
    try {
      const params = new URLSearchParams({
        mode: 'list', page: String(p), categoria: cat, period: lp,
      })
      if (lp === 'custom') { params.set('start', ls); params.set('end', le) }
      const res = await fetch(`${baseUrl}?${params}`, { headers: authHeaders() })
      if (handleUnauth(res.status)) return
      const result = await res.json()
      if (result?.error) throw new Error(result.error)
      setCosts(result.costs ?? [])
      setCostsTotal(result.total ?? 0)
    } catch (e) {
      setErrorList(e?.message ?? 'Erro ao carregar custos')
    } finally {
      setLoadingList(false)
    }
  }, [adminToken]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { loadRoi() }, []) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { loadList() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const handleRoiPeriod = (p) => {
    setRoiPeriod(p)
    if (p !== 'custom') loadRoi(p)
  }
  const handleRoiCustomApply = () => {
    if (roiCustomStart && roiCustomEnd) loadRoi('custom', roiCustomStart, roiCustomEnd)
  }

  const handleListFilter = (cat, lp) => {
    setCategoryFilter(cat)
    setListPeriod(lp)
    setPage(1)
    loadList(1, cat, lp, listCustomStart, listCustomEnd)
  }

  const handleSave = async (formData) => {
    setSaving(true)
    try {
      const isEdit = !!editingCost?.id
      const url    = isEdit ? `${baseUrl}?id=${editingCost.id}` : baseUrl
      const method = isEdit ? 'PATCH' : 'POST'
      const res = await fetch(url, { method, headers: authHeaders(), body: JSON.stringify(formData) })
      if (handleUnauth(res.status)) return
      const result = await res.json()
      if (result?.error) throw new Error(result.error)
      setFormOpen(false)
      setEditingCost(null)
      loadList(page, categoryFilter, listPeriod)
      loadRoi(roiPeriod, roiCustomStart, roiCustomEnd)
    } catch (e) {
      alert(e?.message ?? 'Erro ao salvar custo')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      const res = await fetch(`${baseUrl}?id=${deleteTarget.id}`, { method: 'DELETE', headers: authHeaders() })
      if (handleUnauth(res.status)) return
      const result = await res.json()
      if (!res.ok || result?.error) throw new Error(result?.error ?? 'Erro ao excluir custo')
      setDeleteTarget(null)
      loadList(page, categoryFilter, listPeriod)
      loadRoi(roiPeriod, roiCustomStart, roiCustomEnd)
    } catch (e) {
      alert(e?.message ?? 'Erro ao excluir custo')
    } finally {
      setDeleting(false)
    }
  }

  const openEdit = (cost) => {
    setEditingCost({
      id:               cost.id,
      data:             cost.data,
      categoria:        cost.categoria,
      descricao_outros: cost.descricao_outros ?? '',
      valor:            String(cost.valor),
      observacao:       cost.observacao ?? '',
      pricing_plan:     cost.pricing_plan ?? null,
    })
    setFormOpen(true)
  }

  const pageSize  = 20
  const totalPages = Math.ceil(costsTotal / pageSize)

  const summary = roiData?.summary ?? {}
  const sixMonthData   = roiData?.sixMonthData ?? []
  const catDist        = roiData?.categoryDistribution ?? []
  const trafficByMonth = roiData?.trafficRoiByMonth ?? []

  const fmt = v => `$${Number(v ?? 0).toFixed(2)}`

  return (
    <>
      <CostFormModal
        open={formOpen}
        onClose={() => { setFormOpen(false); setEditingCost(null) }}
        onSave={handleSave}
        initial={editingCost}
        saving={saving}
      />
      <DeleteModal
        open={!!deleteTarget}
        cost={deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        deleting={deleting}
      />

      <div className="flex flex-col gap-8 max-w-5xl mx-auto">

        {/* ── Page header ─────────────────────────────── */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-xl font-extrabold text-gray-900">Custos & ROI</h1>
            <p className="text-sm text-gray-400 mt-0.5">Registro de custos e retorno sobre investimento</p>
          </div>
          <button
            onClick={() => { setFormOpen(true); setEditingCost(null) }}
            className="flex items-center gap-2 bg-violet-600 text-white text-sm font-semibold px-4 py-2.5 rounded-xl hover:bg-violet-700 transition-all shadow-sm shadow-violet-200"
          >
            <Plus className="w-4 h-4" />
            Registrar custo
          </button>
        </div>

        {/* ══════════════════════════════════════════════
            SEÇÃO A: Registro de Custos
        ══════════════════════════════════════════════ */}
        <section>
          <SectionHeader title="Registro de custos" />

          {/* Filters */}
          <div className="flex flex-col gap-2 mb-4">
            <div className="flex flex-wrap items-center gap-2">
              {/* Category filter */}
              <div className="flex bg-white border border-gray-200 rounded-xl p-1 gap-0.5">
                <button
                  onClick={() => handleListFilter('all', listPeriod)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-all ${
                    categoryFilter === 'all' ? 'bg-violet-600 text-white' : 'text-gray-500 hover:text-gray-800'
                  }`}
                >
                  Todas
                </button>
                {CATEGORIES.map(c => (
                  <button
                    key={c.key}
                    onClick={() => handleListFilter(c.key, listPeriod)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-all ${
                      categoryFilter === c.key ? 'bg-violet-600 text-white' : 'text-gray-500 hover:text-gray-800'
                    }`}
                  >
                    {c.emoji}
                  </button>
                ))}
              </div>
            </div>

            {/* Period filter for list — scrollable horizontally */}
            <div className="overflow-x-auto">
              <div className="flex bg-white border border-gray-200 rounded-xl p-1 gap-0.5 min-w-max">
                <button
                  onClick={() => handleListFilter(categoryFilter, 'all')}
                  className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-all ${
                    listPeriod === 'all' ? 'bg-violet-600 text-white' : 'text-gray-500 hover:text-gray-800'
                  }`}
                >
                  Todos
                </button>
                {PERIODS.map(p => (
                  <button
                    key={p.key}
                    onClick={() => handleListFilter(categoryFilter, p.key)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-all ${
                      listPeriod === p.key ? 'bg-violet-600 text-white' : 'text-gray-500 hover:text-gray-800'
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            {listPeriod === 'custom' && (
              <div className="flex items-center gap-2 text-sm">
                <input type="date" value={listCustomStart} onChange={e => setListCustomStart(e.target.value)}
                  className="flex-1 min-w-0 rounded-xl border border-gray-200 px-2.5 py-1.5 text-sm text-gray-700 focus:outline-none focus:border-violet-400" />
                <span className="text-gray-400 flex-shrink-0">→</span>
                <input type="date" value={listCustomEnd} onChange={e => setListCustomEnd(e.target.value)}
                  className="flex-1 min-w-0 rounded-xl border border-gray-200 px-2.5 py-1.5 text-sm text-gray-700 focus:outline-none focus:border-violet-400" />
                <button
                  onClick={() => loadList(1, categoryFilter, 'custom', listCustomStart, listCustomEnd)}
                  className="px-3 py-1.5 rounded-xl bg-violet-600 text-white text-sm font-semibold flex-shrink-0"
                >
                  Aplicar
                </button>
              </div>
            )}
          </div>

          {errorList && <div className="mb-4"><ErrorBanner message={errorList} onRetry={() => loadList()} /></div>}

          {/* Table */}
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
            {loadingList ? (
              <div className="flex items-center justify-center py-16">
                <div className="w-7 h-7 border-4 border-gray-200 border-t-violet-600 rounded-full animate-spin" />
              </div>
            ) : costs.length === 0 ? (
              <div className="flex flex-col items-center py-16 gap-2">
                <p className="text-gray-400 text-sm font-medium">Nenhum custo registrado</p>
                <button
                  onClick={() => { setFormOpen(true); setEditingCost(null) }}
                  className="text-violet-600 text-sm font-semibold hover:underline"
                >
                  Registrar primeiro custo
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50">
                      {['Data', 'Categoria', 'Funil', 'Descrição', 'Valor', 'Observação', ''].map(h => (
                        <th key={h} className="text-left px-4 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {costs.map(cost => {
                      const cat = CATEGORIES.find(c => c.key === cost.categoria)
                      const funnelLabel =
                        cost.pricing_plan === 'bold'  ? { txt: 'Bold',  cls: 'bg-cyan-100 text-cyan-700' } :
                        cost.pricing_plan === 'detox' ? { txt: 'Detox', cls: 'bg-violet-100 text-violet-700' } :
                        cost.pricing_plan          ? { txt: 'Legado', cls: 'bg-gray-100 text-gray-500' } :
                        null
                      return (
                        <tr key={cost.id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{cost.data}</td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-700 bg-gray-100 px-2.5 py-1 rounded-full">
                              {cat?.emoji} {cat?.label}
                            </span>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            {funnelLabel ? (
                              <span className={`inline-flex text-xs font-semibold px-2.5 py-1 rounded-full ${funnelLabel.cls}`}>
                                {funnelLabel.txt}
                              </span>
                            ) : (
                              <span className="text-gray-300 text-xs">—</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-gray-500 max-w-[180px] truncate">
                            {cost.descricao_outros || '—'}
                          </td>
                          <td className="px-4 py-3 font-bold text-gray-900 tabular-nums whitespace-nowrap">
                            ${Number(cost.valor).toFixed(2)}
                          </td>
                          <td className="px-4 py-3 text-gray-400 max-w-[200px] truncate text-xs">
                            {cost.observacao || '—'}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => openEdit(cost)}
                                className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-all"
                                title="Editar"
                              >
                                <Pencil className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => setDeleteTarget(cost)}
                                className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-all"
                                title="Excluir"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-3 px-1">
              <p className="text-xs text-gray-400">
                {costsTotal} registro{costsTotal !== 1 ? 's' : ''} · página {page} de {totalPages}
              </p>
              <div className="flex items-center gap-1">
                <button
                  disabled={page === 1}
                  onClick={() => { const p = page - 1; setPage(p); loadList(p, categoryFilter, listPeriod) }}
                  className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  disabled={page >= totalPages}
                  onClick={() => { const p = page + 1; setPage(p); loadList(p, categoryFilter, listPeriod) }}
                  className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </section>

        {/* ══════════════════════════════════════════════
            SEÇÃO B: Dashboard de ROI
        ══════════════════════════════════════════════ */}
        <section>
          <div className="flex items-start justify-between flex-wrap gap-3 mb-4">
            <SectionHeader title="Dashboard de ROI" />
            <div className="flex items-start gap-2 w-full sm:w-auto">
              <PeriodSelector
                period={roiPeriod} onPeriod={handleRoiPeriod}
                customStart={roiCustomStart} customEnd={roiCustomEnd}
                onCustomStart={setRoiCustomStart} onCustomEnd={setRoiCustomEnd}
                onApply={handleRoiCustomApply}
              />
              <button
                onClick={() => loadRoi(roiPeriod, roiCustomStart, roiCustomEnd)}
                disabled={loadingRoi}
                className="flex-shrink-0 flex items-center justify-center w-10 h-10 bg-white border border-gray-200 rounded-xl text-gray-400 hover:text-gray-700 hover:border-gray-300 transition-all disabled:opacity-40"
              >
                <ArrowClockwise size={16} weight="fill" className={loadingRoi ? 'animate-spin' : ''} />
              </button>
            </div>
          </div>

          {errorRoi && <div className="mb-4"><ErrorBanner message={errorRoi} onRetry={() => loadRoi()} /></div>}

          {/* Summary cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
            <MetricCard
              icon={TrendingDown} iconBg="bg-red-50" iconColor="text-red-400"
              label="Custos do período"
              value={loadingRoi ? '—' : fmt(summary.totalCosts)}
              loading={loadingRoi}
            />
            <MetricCard
              icon={DollarSign} iconBg="bg-emerald-50" iconColor="text-emerald-500"
              label="Receita do período"
              value={loadingRoi ? '—' : fmt(summary.totalRevenue)}
              sub="Via Hotmart"
              loading={loadingRoi}
            />
            <MetricCard
              icon={TrendingUp} iconBg="bg-blue-50" iconColor="text-blue-500"
              label="Lucro líquido"
              value={loadingRoi ? '—' : fmt(summary.profit)}
              loading={loadingRoi}
              highlight={!loadingRoi && summary.profit > 0}
            />
            <MetricCard
              icon={Percent} iconBg="bg-violet-50" iconColor="text-violet-500"
              label="Margem líquida"
              value={loadingRoi ? '—' : `${summary.margin ?? 0}%`}
              sub="Lucro ÷ Receita"
              loading={loadingRoi}
            />
            <MetricCard
              icon={TrendingUp} iconBg="bg-orange-50" iconColor="text-orange-500"
              label="ROI tráfego pago"
              value={loadingRoi ? '—' : (summary.trafficRoi != null ? `${summary.trafficRoi}×` : '—')}
              sub={loadingRoi || !summary.trafficCosts ? undefined : `$${Number(summary.trafficCosts).toFixed(2)} em anúncios`}
              loading={loadingRoi}
            />
          </div>

          {/* ROI per funnel table */}
          {!loadingRoi && (roiData?.funnelRoi?.length ?? 0) > 0 && (
            <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden mb-4">
              <div className="px-5 pt-5 pb-3">
                <p className="font-bold text-gray-800 mb-0.5">ROI por funil (Bold vs Detox)</p>
                <p className="text-xs text-gray-400">
                  Vendas atribuídas via funnel_events.metadata.source × custo de ads vinculado no período
                </p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50">
                      {['Funil', 'Vendas', 'Receita', 'Custo de ads', 'CPA', 'ROI', 'Confiabilidade'].map(h => (
                        <th key={h} className="text-left px-4 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {(roiData?.funnelRoi ?? []).map(p => {
                      const conf = CONFIDENCE_CONFIG[p.confidence_level] ?? CONFIDENCE_CONFIG.low
                      return (
                        <tr key={p.funnel} className="hover:bg-gray-50 transition-colors">
                          <td className="px-4 py-3 font-semibold text-gray-800 whitespace-nowrap">{p.label}</td>
                          <td className="px-4 py-3 text-gray-600 tabular-nums">{p.sales}</td>
                          <td className="px-4 py-3 font-bold text-gray-900 tabular-nums">{fmt(p.revenue_contribution)}</td>
                          <td className="px-4 py-3 text-gray-600 tabular-nums">{p.traffic_costs > 0 ? fmt(p.traffic_costs) : <span className="text-gray-300">—</span>}</td>
                          <td className="px-4 py-3 text-gray-600 tabular-nums">{p.cpa != null ? fmt(p.cpa) : <span className="text-gray-300">—</span>}</td>
                          <td className="px-4 py-3 font-bold tabular-nums">
                            {p.roi != null
                              ? <span className={p.roi >= 1 ? 'text-emerald-600' : 'text-red-500'}>{p.roi}×</span>
                              : <span className="text-gray-300">—</span>
                            }
                          </td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold ${conf.className}`}>
                              {conf.label}
                            </span>
                          </td>
                        </tr>
                      )
                    })}
                    <tr className="border-t border-gray-200 bg-gray-50">
                      <td className="px-4 py-3 font-bold text-gray-800">Total</td>
                      <td className="px-4 py-3 font-bold text-gray-800 tabular-nums">
                        {(roiData?.funnelRoi ?? []).filter(p => p.funnel !== 'global').reduce((a, p) => a + p.sales, 0)}
                      </td>
                      <td className="px-4 py-3 font-bold text-gray-800 tabular-nums">
                        {fmt((roiData?.funnelRoi ?? []).filter(p => p.funnel !== 'global').reduce((a, p) => a + p.revenue_contribution, 0))}
                      </td>
                      <td className="px-4 py-3 font-bold text-gray-800 tabular-nums">
                        {fmt((roiData?.funnelRoi ?? []).reduce((a, p) => a + p.traffic_costs, 0))}
                      </td>
                      <td className="px-4 py-3" />
                      <td className="px-4 py-3" />
                      <td className="px-4 py-3" />
                    </tr>
                  </tbody>
                </table>
              </div>
              <p className="px-5 py-3 text-xs text-gray-400 border-t border-gray-50">
                Vincule cada custo de Tráfego Pago a "Quiz Bold" ou "Quiz Detox" no formulário para que o ROI separe por funil. Custos não vinculados aparecem em "Global".
              </p>
            </div>
          )}

          {/* Chart 1: Receita vs Custos vs Lucro */}
          <div className="bg-white rounded-2xl border border-gray-100 p-5 mb-4">
            <p className="font-bold text-gray-800 mb-1">Receita × Custos × Lucro</p>
            <p className="text-xs text-gray-400 mb-4">Últimos 6 meses (receita Hotmart + custos registrados)</p>
            {loadingRoi ? (
              <ChartSkeleton h={220} />
            ) : sixMonthData.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-12">Sem dados.</p>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={sixMonthData} barGap={2} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                  <YAxis tickFormatter={v => `$${v}`} tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} width={52} />
                  <Tooltip content={({ active, payload, label }) => <ChartTooltip active={active} payload={payload} label={label} prefix="$" />} />
                  <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} formatter={v => <span className="text-gray-500">{v}</span>} />
                  <Bar dataKey="receita" name="Receita"  fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={28} />
                  <Bar dataKey="custos"  name="Custos"   fill="#f87171" radius={[4, 4, 0, 0]} maxBarSize={28} />
                  <Bar dataKey="lucro"   name="Lucro"    fill="#7c3aed" radius={[4, 4, 0, 0]} maxBarSize={28} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Charts 2 + 3 side by side */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Pie: distribuição de custos */}
            <div className="bg-white rounded-2xl border border-gray-100 p-5">
              <p className="font-bold text-gray-800 mb-1">Distribuição de custos</p>
              <p className="text-xs text-gray-400 mb-4">Por categoria no período</p>
              {loadingRoi ? (
                <ChartSkeleton h={200} />
              ) : catDist.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-12">Sem custos no período.</p>
              ) : (
                <div className="flex items-center gap-4">
                  <ResponsiveContainer width="60%" height={200}>
                    <PieChart>
                      <Pie
                        data={catDist} dataKey="value" nameKey="name"
                        cx="50%" cy="50%" outerRadius={80} innerRadius={48}
                      >
                        {catDist.map(entry => (
                          <Cell key={entry.key} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip content={<PieTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="flex-1 space-y-2">
                    {catDist.map(entry => (
                      <div key={entry.key} className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: entry.color }} />
                        <span className="text-xs text-gray-600 flex-1 leading-tight">{entry.name}</span>
                        <span className="text-xs font-bold text-gray-700">{entry.pct}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Line: ROI tráfego pago por mês */}
            <div className="bg-white rounded-2xl border border-gray-100 p-5">
              <p className="font-bold text-gray-800 mb-1">ROI (Tráfego pago)</p>
              <p className="text-xs text-gray-400 mb-4">Receita ÷ custo de anúncios por mês</p>
              {loadingRoi ? (
                <ChartSkeleton h={200} />
              ) : trafficByMonth.every(m => m.roi == null) ? (
                <p className="text-sm text-gray-400 text-center py-12">Sem custos de tráfego pago.</p>
              ) : (
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart
                    data={trafficByMonth.map(m => ({ ...m, roi: m.roi ?? 0 }))}
                    margin={{ top: 4, right: 4, bottom: 0, left: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
                    <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                    <YAxis
                      tickFormatter={v => `${v}×`}
                      tick={{ fontSize: 11, fill: '#9ca3af' }}
                      axisLine={false} tickLine={false} width={40}
                    />
                    <Tooltip
                      content={({ active, payload, label }) => {
                        if (!active || !payload?.length) return null
                        const d = payload[0]
                        return (
                          <div className="bg-gray-900 text-white rounded-xl px-3 py-2 shadow-xl text-xs">
                            <p className="font-bold mb-1">{label}</p>
                            <p className="font-medium text-orange-400">ROI: {d.value}×</p>
                          </div>
                        )
                      }}
                    />
                    <Line
                      type="monotone" dataKey="roi" name="ROI"
                      stroke="#f97316" strokeWidth={2.5}
                      dot={{ r: 3.5, fill: '#f97316', strokeWidth: 0 }}
                      activeDot={{ r: 5 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        </section>
      </div>
    </>
  )
}
