import React, { useEffect, useState, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAdminAuth } from '@/lib/AdminAuthContext'
import {
  Search, AlertCircle, ChevronLeft, ChevronRight,
  ChevronUp, ChevronDown, X,
} from 'lucide-react'
import { ArrowClockwise } from '@phosphor-icons/react'

const PER_PAGE = 20

const STATUS_BADGE = {
  active:     { label: 'Ativa',       bg: 'bg-emerald-100', text: 'text-emerald-700' },
  pending:    { label: 'Pendente',    bg: 'bg-amber-100',   text: 'text-amber-700' },
  refunded:   { label: 'Reembolsada', bg: 'bg-red-100',     text: 'text-red-700' },
  chargeback: { label: 'Chargeback',  bg: 'bg-rose-950/10', text: 'text-rose-800' },
  inactive:   { label: 'Inativa',     bg: 'bg-gray-100',    text: 'text-gray-500' },
}

const LANG_FLAG = { en: '🇺🇸', es: '🇪🇸' }

// Currently /quiz, /quiz-bold, /quiz-meta and /quiz-detox all write 'one_time_basic' as pricing_plan.
// The funnel is differentiated by event_type prefix in funnel_events, not by plan_key.
// Legacy plans kept so historical orders still display correctly.
const PLAN_BADGE = {
  one_time_basic:    { label: 'NatGlow $17',     bg: 'bg-cyan-50',    text: 'text-cyan-700' },
  one_time_standard: { label: 'Completo $27 (legado)', bg: 'bg-violet-50',  text: 'text-violet-700' },
  one_time_premium:  { label: 'VIP $47 (legado)',      bg: 'bg-amber-50',   text: 'text-amber-700' },
}

const DIAGNOSIS_BADGE = {
  green: { label: 'Leve',     bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-400' },
  amber: { label: 'Moderado', bg: 'bg-amber-50',   text: 'text-amber-700',   dot: 'bg-amber-400' },
  red:   { label: 'Severo',   bg: 'bg-red-50',     text: 'text-red-700',     dot: 'bg-red-400' },
}

const QUIZ_LABELS = {
  washFreq:     { label: 'Lavagem capilar',   options: { daily: 'Diariamente', '3_4': '3-4x/semana', '1_2': '1-2x/semana' } },
  waterTemp:    { label: 'Água do banho',     options: { hot: 'Quente', warm: 'Morna', cold: 'Fria' } },
  heatTools:    { label: 'Calor (secador/chapinha)', options: { daily: 'Todo dia', few: 'Algumas vezes', rarely: 'Raramente' } },
  hydration:    { label: 'Hidratação',        options: { regularly: 'Regularmente', sometimes: 'Às vezes', never: 'Nunca' } },
  chemProducts: { label: 'Produtos químicos', options: { yes_heavy: 'Sim (fortes)', yes_mild: 'Sim (suaves)', no: 'Não' } },
  hairType:     { label: 'Tipo de cabelo',    options: { liso: 'Liso', ondulado: 'Ondulado', cacheado: 'Cacheado', crespo: 'Crespo' } },
  age:          { label: 'Faixa etária',      options: { '18_29': '18–29', '30_39': '30–39', '40_49': '40–49', '50_plus': '50+' } },
  // New fields from persuasive funnels (quiz / quiz-bold / quiz-meta / quiz-detox)
  symptomsIntensity: { label: 'Intensidade dos sintomas', options: { '30days': 'Mais de 30 dias', '1year': 'Mais de 1 ano', months: 'Há meses', years: 'Há anos' } },
  finalChoice:       { label: 'Escolha final',            options: { yes: 'Sim, quero', doubts: 'Tenho dúvidas' } },
}

function StatusBadge({ status }) {
  const s = STATUS_BADGE[status] ?? STATUS_BADGE.inactive
  return (
    <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${s.bg} ${s.text}`}>
      {s.label}
    </span>
  )
}

function DiagnosisBadge({ diagnosis }) {
  if (!diagnosis) return <span className="text-xs text-gray-300">—</span>
  const d = DIAGNOSIS_BADGE[diagnosis]
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full ${d.bg} ${d.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${d.dot}`} />
      {d.label}
    </span>
  )
}

function SortIcon({ col, sort, order }) {
  if (sort !== col) return <ChevronUp className="w-3 h-3 opacity-20" />
  return order === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />
}


function UserDrawer({ user, data, loading, onClose, onSetStatus }) {
  const { subscription, quiz, payments } = data ?? {}
  const [confirmRevoke, setConfirmRevoke] = useState(false)
  const [revoking, setRevoking] = useState(false)

  const handleRevoke = async () => {
    setRevoking(true)
    await onSetStatus(user.user_id, 'refunded')
    setRevoking(false)
    setConfirmRevoke(false)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-40 flex">
      <div className="flex-1 bg-black/40" onClick={onClose} />
      <div className="w-full max-w-md bg-white shadow-2xl overflow-y-auto flex flex-col">
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100 sticky top-0 bg-white z-10">
          <h2 className="font-extrabold text-gray-900 text-base truncate pr-4">{user.email}</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 flex-shrink-0">
            <X className="w-4 h-4" />
          </button>
        </div>

        {loading ? (
          <div className="flex-1 flex items-center justify-center py-20">
            <div className="w-7 h-7 border-4 border-gray-200 border-t-violet-600 rounded-full animate-spin" />
          </div>
        ) : (
          <div className="flex-1 flex flex-col gap-0 divide-y divide-gray-100">

            <section className="px-6 py-5 space-y-3">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Informações</p>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: 'Status', value: <StatusBadge status={user.status} /> },
                  { label: 'Diagnóstico', value: <DiagnosisBadge diagnosis={user.diagnosis} /> },
                  { label: 'Idioma', value: user.idioma ? `${LANG_FLAG[user.idioma] ?? '🌍'} ${user.idioma?.toUpperCase()}` : '—' },
                  { label: 'País', value: user.pais ?? '—' },
                  { label: 'Desde', value: user.created_at ? new Date(user.created_at).toLocaleDateString('pt-BR') : '—' },
                  { label: 'Último acesso', value: data?.user?.last_sign_in_at ? new Date(data.user.last_sign_in_at).toLocaleDateString('pt-BR') : '—' },
                ].map(({ label, value }) => (
                  <div key={label}>
                    <p className="text-xs text-gray-400 mb-0.5">{label}</p>
                    <div className="text-sm font-semibold text-gray-700">{value}</div>
                  </div>
                ))}
              </div>

              {(user.status === 'active' || user.status === 'pending') && (
                <div className="pt-1">
                  {!confirmRevoke ? (
                    <button
                      onClick={() => setConfirmRevoke(true)}
                      className="w-full py-2 rounded-xl border border-red-200 text-red-600 text-sm font-semibold hover:bg-red-50 transition-colors"
                    >
                      Revogar acesso
                    </button>
                  ) : (
                    <div className="bg-red-50 border border-red-200 rounded-xl p-3 space-y-2">
                      <p className="text-xs font-semibold text-red-700">
                        Marcar como reembolsada e revogar acesso imediatamente?
                      </p>
                      <div className="flex gap-2">
                        <button
                          onClick={handleRevoke}
                          disabled={revoking}
                          className="flex-1 py-1.5 rounded-lg bg-red-600 text-white text-xs font-bold hover:bg-red-700 disabled:opacity-50"
                        >
                          {revoking ? 'Revogando…' : 'Confirmar'}
                        </button>
                        <button
                          onClick={() => setConfirmRevoke(false)}
                          className="flex-1 py-1.5 rounded-lg border border-gray-200 text-gray-600 text-xs font-semibold hover:bg-gray-50"
                        >
                          Cancelar
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </section>

            <section className="px-6 py-5">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Respostas do Quiz</p>
              {quiz?.answers ? (
                <div className="space-y-2">
                  {Object.entries(QUIZ_LABELS).map(([key, { label, options }]) => {
                    const val = quiz.answers[key]
                    if (!val) return null
                    return (
                      <div key={key} className="flex items-center justify-between py-1">
                        <span className="text-xs text-gray-500">{label}</span>
                        <span className="text-xs font-semibold text-gray-800 bg-gray-100 px-2.5 py-1 rounded-lg">
                          {options[val] ?? val}
                        </span>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <p className="text-sm text-gray-400">Quiz realizado antes do rastreamento ou dados indisponíveis.</p>
              )}
            </section>

            <section className="px-6 py-5">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Histórico de pagamentos</p>
              {payments && payments.length > 0 ? (
                <div className="space-y-2">
                  {payments.map(p => (
                    <div key={p.id} className="flex items-center justify-between py-1.5 border-b border-gray-50 last:border-0">
                      <div>
                        <p className="text-xs font-semibold text-gray-700">
                          {p.date ? new Date(p.date).toLocaleDateString('pt-BR') : '—'}
                        </p>
                        <span className={`text-[11px] font-bold px-1.5 py-0.5 rounded-full ${
                          p.status === 'active' ? 'bg-emerald-50 text-emerald-600' :
                          p.status === 'refunded' ? 'bg-red-50 text-red-600' :
                          'bg-amber-50 text-amber-600'
                        }`}>
                          {p.status === 'active' ? 'Pago' : p.status === 'refunded' ? 'Reembolsado' : p.status}
                        </span>
                      </div>
                      <span className="text-sm font-bold text-gray-900">
                        ${Number(p.amount ?? 0).toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-400">Nenhum pagamento registrado.</p>
              )}
            </section>

          </div>
        )}
      </div>
    </div>
  )
}

export default function AdminUsers() {
  const { adminToken, clearAdminToken } = useAdminAuth()
  const navigate = useNavigate()

  const [users, setUsers] = useState([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [planFilter, setPlanFilter] = useState('')
  const [sort, setSort] = useState('created_at')
  const [order, setOrder] = useState('desc')

  const [selectedUser, setSelectedUser] = useState(null)
  const [drawerData, setDrawerData] = useState(null)
  const [drawerLoading, setDrawerLoading] = useState(false)



  const searchTimer = useRef(null)
  const totalPages = Math.ceil(total / PER_PAGE)

  const authHeaders = {
    Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
    apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
    'x-admin-token': adminToken,
    'Content-Type': 'application/json',
  }
  const baseUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1`

  const loadUsers = useCallback(async (p = page, s = search, sf = statusFilter, so = sort, or = order, pf = planFilter) => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams({
        mode: 'list', page: String(p), per_page: String(PER_PAGE),
        sort: so, order: or,
      })
      if (s)  params.set('search', s)
      if (sf) params.set('status', sf)

      const res = await fetch(`${baseUrl}/admin-users?${params}`, { headers: authHeaders })
      if (res.status === 401 || res.status === 403) {
        clearAdminToken(); navigate('/admin/login', { replace: true }); return
      }
      const result = await res.json()
      if (result?.error) throw new Error(result.error)
      // Client-side plan filter (server doesn't filter by plan yet — keeps edge fn simple)
      const filtered = pf
        ? (result.users ?? []).filter(u => (u.pricing_plan ?? 'one_time_basic') === pf)
        : (result.users ?? [])
      setUsers(filtered)
      setTotal(pf ? filtered.length : (result.total ?? 0))
    } catch (e) {
      setError(e?.message ?? 'Erro ao carregar usuárias')
    } finally {
      setLoading(false)
    }
  }, [adminToken, clearAdminToken, navigate, baseUrl]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { loadUsers() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const handleSearch = (val) => {
    setSearch(val)
    clearTimeout(searchTimer.current)
    searchTimer.current = setTimeout(() => {
      setPage(1)
      loadUsers(1, val, statusFilter, sort, order, planFilter)
    }, 350)
  }

  const handleStatusFilter = (val) => {
    setStatusFilter(val)
    setPage(1)
    loadUsers(1, search, val, sort, order, planFilter)
  }

  const handlePlanFilter = (val) => {
    setPlanFilter(val)
    setPage(1)
    loadUsers(1, search, statusFilter, sort, order, val)
  }

  const handleSort = (col) => {
    const newOrder = sort === col && order === 'desc' ? 'asc' : 'desc'
    setSort(col)
    setOrder(newOrder)
    setPage(1)
    loadUsers(1, search, statusFilter, col, newOrder, planFilter)
  }

  const handlePage = (p) => {
    setPage(p)
    loadUsers(p, search, statusFilter, sort, order, planFilter)
  }

  const openDrawer = async (user) => {
    setSelectedUser(user)
    setDrawerData(null)
    setDrawerLoading(true)
    try {
      const params = new URLSearchParams({ mode: 'detail', user_id: user.user_id })
      const res = await fetch(`${baseUrl}/admin-users?${params}`, { headers: authHeaders })
      const result = await res.json()
      setDrawerData(result)
    } catch {
      setDrawerData({})
    } finally {
      setDrawerLoading(false)
    }
  }

  const closeDrawer = () => { setSelectedUser(null); setDrawerData(null) }

  const handleSetStatus = async (userId, newStatus) => {
    try {
      await fetch(`${baseUrl}/admin-users?mode=set_status`, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({ user_id: userId, status: newStatus }),
      })
      // Update list optimistically
      setUsers(prev => prev.map(u => u.user_id === userId ? { ...u, status: newStatus } : u))
    } catch { /* non-fatal */ }
  }


  const Th = ({ col, label }) => (
    <th
      className="text-left px-4 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider cursor-pointer hover:text-gray-800 select-none"
      onClick={() => handleSort(col)}
    >
      <span className="flex items-center gap-1">
        {label}
        <SortIcon col={col} sort={sort} order={order} />
      </span>
    </th>
  )

  return (
    <div className="flex flex-col gap-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-extrabold text-gray-900">Usuárias</h1>
          <p className="text-sm text-gray-400 mt-0.5">
            {loading ? 'Carregando…' : `${total.toLocaleString()} assinantes`}
          </p>
        </div>
        <button
          onClick={() => loadUsers()}
          disabled={loading}
          className="flex items-center justify-center w-10 h-10 bg-white border border-gray-200 rounded-xl text-gray-400 hover:text-gray-700 hover:border-gray-300 transition-all disabled:opacity-40"
        >
          <ArrowClockwise size={16} weight="fill" className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar por email…"
            value={search}
            onChange={e => handleSearch(e.target.value)}
            className="pl-9 pr-4 py-2 border border-gray-200 rounded-xl text-sm text-gray-700 bg-white outline-none focus:border-violet-400 w-full"
          />
        </div>
        <select
          value={statusFilter}
          onChange={e => handleStatusFilter(e.target.value)}
          className="border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-700 bg-white outline-none focus:border-violet-400"
        >
          <option value="">Todos os status</option>
          <option value="active">Ativas</option>
          <option value="pending">Pendentes</option>
          <option value="refunded">Reembolsadas</option>
          <option value="chargeback">Chargeback</option>
        </select>
        <select
          value={planFilter}
          onChange={e => handlePlanFilter(e.target.value)}
          className="border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-700 bg-white outline-none focus:border-violet-400"
        >
          <option value="">Todos os planos</option>
          <option value="one_time_basic">NatGlow $17 (Bold/Detox)</option>
          <option value="one_time_standard">Completo $27 (legado)</option>
          <option value="one_time_premium">VIP $47 (legado)</option>
        </select>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-4 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-7 h-7 border-4 border-gray-200 border-t-violet-600 rounded-full animate-spin" />
          </div>
        ) : users.length === 0 ? (
          <div className="py-16 text-center text-gray-400">
            <p className="font-medium">Nenhuma usuária encontrada</p>
            {search && <p className="text-sm mt-1">Tente buscar por outro email</p>}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <Th col="email"      label="Email" />
                  <Th col="created_at" label="Cadastro" />
                  <Th col="status"     label="Status" />
                  <th className="text-left px-4 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">Plano</th>
                  <th className="text-left px-4 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">Último acesso</th>
                  <th className="text-left px-4 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">Diagnóstico</th>
                  <th className="text-left px-4 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">Idioma</th>
                  <th className="text-left px-4 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">País</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {users.map(u => (
                  <tr
                    key={u.user_id}
                    className="hover:bg-gray-50 cursor-pointer transition-colors"
                    onClick={() => openDrawer(u)}
                  >
                    <td className="px-4 py-3 text-gray-700 font-medium max-w-[220px] truncate">{u.email}</td>
                    <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                      {u.created_at ? new Date(u.created_at).toLocaleDateString('pt-BR') : '—'}
                    </td>
                    <td className="px-4 py-3"><StatusBadge status={u.status} /></td>
                    <td className="px-4 py-3">
                      {(() => {
                        const p = PLAN_BADGE[u.pricing_plan ?? 'one_time_basic'] ?? PLAN_BADGE.one_time_basic
                        return (
                          <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${p.bg} ${p.text}`}>
                            {p.label}
                          </span>
                        )
                      })()}
                    </td>
                    <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                      {u.last_sign_in_at ? new Date(u.last_sign_in_at).toLocaleDateString('pt-BR') : '—'}
                    </td>
                    <td className="px-4 py-3"><DiagnosisBadge diagnosis={u.diagnosis} /></td>
                    <td className="px-4 py-3 text-gray-500">
                      {u.idioma ? `${LANG_FLAG[u.idioma] ?? '🌍'} ${u.idioma.toUpperCase()}` : '—'}
                    </td>
                    <td className="px-4 py-3 text-gray-500">{u.pais ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {!loading && totalPages > 1 && (
          <div className="border-t border-gray-100 px-4 py-3 flex items-center justify-between">
            <p className="text-xs text-gray-400">
              {(page - 1) * PER_PAGE + 1}–{Math.min(page * PER_PAGE, total)} de {total.toLocaleString()}
            </p>
            <div className="flex gap-1">
              <button
                onClick={() => handlePage(page - 1)}
                disabled={page === 1}
                className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 disabled:opacity-30"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                const p = Math.max(1, Math.min(page - 2, totalPages - 4)) + i
                return (
                  <button
                    key={p}
                    onClick={() => handlePage(p)}
                    className={`w-7 h-7 rounded-lg text-xs font-bold transition-all ${
                      p === page ? 'bg-violet-600 text-white' : 'text-gray-500 hover:bg-gray-100'
                    }`}
                  >
                    {p}
                  </button>
                )
              })}
              <button
                onClick={() => handlePage(page + 1)}
                disabled={page === totalPages}
                className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 disabled:opacity-30"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {selectedUser && (
        <UserDrawer
          user={selectedUser}
          data={drawerData}
          loading={drawerLoading}
          onClose={closeDrawer}
          onSetStatus={handleSetStatus}
        />
      )}
    </div>
  )
}
