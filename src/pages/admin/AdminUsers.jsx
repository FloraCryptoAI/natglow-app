import React, { useEffect, useState, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAdminAuth } from '@/lib/AdminAuthContext'
import {
  Search, AlertCircle, ChevronLeft, ChevronRight,
  ChevronUp, ChevronDown, X, ExternalLink, Loader2,
} from 'lucide-react'
import { ArrowClockwise } from '@phosphor-icons/react'

const PER_PAGE = 20

const STATUS_BADGE = {
  active:   { label: 'Ativa',        bg: 'bg-emerald-100', text: 'text-emerald-700' },
  canceled: { label: 'Cancelada',    bg: 'bg-red-100',     text: 'text-red-700' },
  past_due: { label: 'Inadimplente', bg: 'bg-amber-100',   text: 'text-amber-700' },
  inactive: { label: 'Inativa',      bg: 'bg-gray-100',    text: 'text-gray-500' },
}

const LANG_FLAG = { en: '🇺🇸', es: '🇪🇸' }

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

function CancelModal({ user, onConfirm, onCancel, loading }) {
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-xl">
        <h3 className="text-lg font-extrabold text-gray-900 mb-2">Cancelar assinatura</h3>
        <p className="text-sm text-gray-500 mb-6 leading-relaxed">
          Tem certeza que deseja cancelar a assinatura de <strong className="text-gray-800">{user?.email}</strong>?
          Esta ação não pode ser desfeita.
        </p>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            disabled={loading}
            className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-all disabled:opacity-40"
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="flex-1 px-4 py-2.5 rounded-xl bg-red-500 text-white text-sm font-bold hover:bg-red-600 transition-all disabled:opacity-40 flex items-center justify-center gap-2"
          >
            {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            Confirmar cancelamento
          </button>
        </div>
      </div>
    </div>
  )
}

function UserDrawer({ user, data, loading, onClose }) {
  const { subscription, quiz, payments } = data ?? {}

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
              {subscription?.current_period_end && (
                <div>
                  <p className="text-xs text-gray-400 mb-0.5">Próxima cobrança</p>
                  <p className="text-sm font-semibold text-gray-700">
                    {new Date(subscription.current_period_end).toLocaleDateString('pt-BR')}
                  </p>
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
                          {new Date(p.created * 1000).toLocaleDateString('pt-BR')}
                        </p>
                        <span className={`text-[11px] font-bold px-1.5 py-0.5 rounded-full ${
                          p.status === 'paid' ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'
                        }`}>
                          {p.status === 'paid' ? 'Pago' : p.status}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-gray-900">
                          ${(p.amount / 100).toFixed(2)}
                        </span>
                        {p.hosted_invoice_url && (
                          <a
                            href={p.hosted_invoice_url}
                            target="_blank"
                            rel="noreferrer"
                            className="p-1 text-gray-400 hover:text-gray-600"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-400">Nenhum pagamento registrado.</p>
              )}
            </section>

            {user.status === 'active' && subscription?.stripe_subscription_id && (
              <section className="px-6 py-5">
                <button
                  onClick={() => {}}
                  className="w-full py-2.5 rounded-xl border border-red-200 text-red-500 text-sm font-bold hover:bg-red-50 transition-all"
                >
                  Cancelar assinatura
                </button>
              </section>
            )}
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
  const [sort, setSort] = useState('created_at')
  const [order, setOrder] = useState('desc')

  const [selectedUser, setSelectedUser] = useState(null)
  const [drawerData, setDrawerData] = useState(null)
  const [drawerLoading, setDrawerLoading] = useState(false)

  const [cancelTarget, setCancelTarget] = useState(null)
  const [cancelLoading, setCancelLoading] = useState(false)

  const searchTimer = useRef(null)
  const totalPages = Math.ceil(total / PER_PAGE)

  const authHeaders = {
    Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
    apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
    'x-admin-token': adminToken,
    'Content-Type': 'application/json',
  }
  const baseUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1`

  const loadUsers = useCallback(async (p = page, s = search, sf = statusFilter, so = sort, or = order) => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams({
        mode: 'list', page: String(p), per_page: String(PER_PAGE),
        sort: so, order: or,
      })
      if (s) params.set('search', s)
      if (sf) params.set('status', sf)

      const res = await fetch(`${baseUrl}/admin-users?${params}`, { headers: authHeaders })
      if (res.status === 401 || res.status === 403) {
        clearAdminToken(); navigate('/admin/login', { replace: true }); return
      }
      const result = await res.json()
      if (result?.error) throw new Error(result.error)
      setUsers(result.users ?? [])
      setTotal(result.total ?? 0)
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
      loadUsers(1, val, statusFilter, sort, order)
    }, 350)
  }

  const handleStatusFilter = (val) => {
    setStatusFilter(val)
    setPage(1)
    loadUsers(1, search, val, sort, order)
  }

  const handleSort = (col) => {
    const newOrder = sort === col && order === 'desc' ? 'asc' : 'desc'
    setSort(col)
    setOrder(newOrder)
    setPage(1)
    loadUsers(1, search, statusFilter, col, newOrder)
  }

  const handlePage = (p) => {
    setPage(p)
    loadUsers(p, search, statusFilter, sort, order)
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

  const handleCancelConfirm = async () => {
    if (!cancelTarget) return
    setCancelLoading(true)
    try {
      const res = await fetch(`${baseUrl}/admin-cancel-subscription`, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({ stripe_subscription_id: cancelTarget.stripe_subscription_id }),
      })
      const result = await res.json()
      if (result?.error) throw new Error(result.error)
      setCancelTarget(null)
      closeDrawer()
      loadUsers(page, search, statusFilter, sort, order)
    } catch (e) {
      alert(`Erro ao cancelar: ${e?.message}`)
    } finally {
      setCancelLoading(false)
    }
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
    <div className="flex flex-col gap-6 max-w-6xl">
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
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar por email…"
            value={search}
            onChange={e => handleSearch(e.target.value)}
            className="pl-9 pr-4 py-2 border border-gray-200 rounded-xl text-sm text-gray-700 bg-white outline-none focus:border-violet-400 w-64"
          />
        </div>
        <select
          value={statusFilter}
          onChange={e => handleStatusFilter(e.target.value)}
          className="border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-700 bg-white outline-none focus:border-violet-400"
        >
          <option value="">Todos os status</option>
          <option value="active">Ativas</option>
          <option value="canceled">Canceladas</option>
          <option value="past_due">Inadimplentes</option>
          <option value="inactive">Inativas</option>
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
          onCancel={() => setCancelTarget(selectedUser)}
        />
      )}

      {cancelTarget && (
        <CancelModal
          user={cancelTarget}
          onConfirm={handleCancelConfirm}
          onCancel={() => setCancelTarget(null)}
          loading={cancelLoading}
        />
      )}
    </div>
  )
}
