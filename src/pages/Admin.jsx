import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Users, CreditCard, TrendingUp, RefreshCw, LogOut } from 'lucide-react'
import { useAdminAuth } from '@/lib/AdminAuthContext'

const STATUS_BADGE = {
  active:   { label: 'Ativo',      bg: 'bg-emerald-100', text: 'text-emerald-700' },
  canceled: { label: 'Cancelado',  bg: 'bg-red-100',     text: 'text-red-700' },
  past_due: { label: 'Em atraso',  bg: 'bg-amber-100',   text: 'text-amber-700' },
  inactive: { label: 'Inativo',    bg: 'bg-stone-100',   text: 'text-stone-500' },
}

function StatusBadge({ status }) {
  const s = STATUS_BADGE[status] ?? STATUS_BADGE.inactive
  return (
    <span className={`text-xs font-bold px-2 py-1 rounded-full ${s.bg} ${s.text}`}>
      {s.label}
    </span>
  )
}

export default function Admin() {
  const { isAdmin, adminToken, clearAdminToken } = useAdminAuth()
  const navigate = useNavigate()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('metrics')

  const loadData = async () => {
    setLoading(true)
    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
      const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY
      const res = await fetch(`${supabaseUrl}/functions/v1/admin-data`, {
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'apikey': supabaseAnonKey,
          'Content-Type': 'application/json',
        },
      })
      if (res.status === 401) {
        clearAdminToken()
        navigate('/admin/login', { replace: true })
        return
      }
      const result = await res.json()
      if (result?.error) throw new Error(result.error)
      setData(result)
    } catch (err) {
      console.error('Erro ao carregar dados admin:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (isAdmin) loadData()
  }, [isAdmin])

  const handleLogout = () => {
    clearAdminToken()
    navigate('/admin/login', { replace: true })
  }

  const activeCount = data?.activeCount ?? 0
  const totalUsers = data?.totalUsers ?? 0
  const subscriptions = data?.subscriptions ?? []
  const planPrice = parseFloat((import.meta.env.VITE_PLAN_PRICE ?? '19.90').replace('R$ ', '').replace(',', '.'))
  const mrr = activeCount * planPrice

  return (
    <div className="min-h-screen bg-stone-100" style={{ fontFamily: 'system-ui, sans-serif' }}>
      {/* Header */}
      <header className="bg-white border-b border-stone-200 sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/logo.png" alt="NatGlow" className="w-8 h-8 rounded-xl" />
            <span className="font-bold text-stone-800 text-sm">Admin — NatGlow</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={loadData}
              className="p-2 text-stone-400 hover:text-stone-600 transition-colors"
              title="Atualizar dados"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={handleLogout}
              className="p-2 text-stone-400 hover:text-stone-600 transition-colors"
              title="Sair"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-4 py-6 flex flex-col gap-6">

        {/* Tabs */}
        <div className="flex gap-1 bg-white border border-stone-200 rounded-xl p-1 w-fit">
          {[
            { id: 'metrics', label: 'Métricas' },
            { id: 'subscribers', label: 'Assinantes' },
          ].map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                tab === t.id
                  ? 'bg-stone-900 text-white'
                  : 'text-stone-500 hover:text-stone-800'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-4 border-stone-200 border-t-stone-800 rounded-full animate-spin" />
          </div>
        ) : (
          <>
            {/* Metrics tab */}
            {tab === 'metrics' && (
              <div className="flex flex-col gap-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="bg-white rounded-2xl border border-stone-100 p-5">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center">
                        <Users className="w-5 h-5 text-blue-500" />
                      </div>
                      <span className="text-sm text-stone-500 font-medium">Total de usuários</span>
                    </div>
                    <p className="text-3xl font-extrabold text-stone-900">{totalUsers}</p>
                  </div>

                  <div className="bg-white rounded-2xl border border-stone-100 p-5">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center">
                        <CreditCard className="w-5 h-5 text-emerald-500" />
                      </div>
                      <span className="text-sm text-stone-500 font-medium">Assinantes ativos</span>
                    </div>
                    <p className="text-3xl font-extrabold text-stone-900">{activeCount}</p>
                    {totalUsers > 0 && (
                      <p className="text-xs text-stone-400 mt-1">
                        {((activeCount / totalUsers) * 100).toFixed(1)}% de conversão
                      </p>
                    )}
                  </div>

                  <div className="bg-white rounded-2xl border border-stone-100 p-5">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-9 h-9 rounded-xl bg-amber-50 flex items-center justify-center">
                        <TrendingUp className="w-5 h-5 text-amber-500" />
                      </div>
                      <span className="text-sm text-stone-500 font-medium">MRR estimado</span>
                    </div>
                    <p className="text-3xl font-extrabold text-stone-900">
                      R$ {mrr.toFixed(2).replace('.', ',')}
                    </p>
                  </div>
                </div>

                {/* Status breakdown */}
                <div className="bg-white rounded-2xl border border-stone-100 p-5">
                  <p className="font-bold text-stone-800 mb-4">Distribuição por status</p>
                  <div className="flex flex-wrap gap-3">
                    {Object.entries(
                      subscriptions.reduce((acc, s) => {
                        acc[s.status] = (acc[s.status] ?? 0) + 1
                        return acc
                      }, {})
                    ).map(([status, count]) => (
                      <div key={status} className="flex items-center gap-2">
                        <StatusBadge status={status} />
                        <span className="text-sm font-bold text-stone-700">{count}</span>
                      </div>
                    ))}
                    {subscriptions.length === 0 && (
                      <p className="text-sm text-stone-400">Nenhuma assinatura ainda.</p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Subscribers tab */}
            {tab === 'subscribers' && (
              <div className="bg-white rounded-2xl border border-stone-100 overflow-hidden">
                {subscriptions.length === 0 ? (
                  <div className="py-16 text-center text-stone-400">
                    <CreditCard className="w-10 h-10 mx-auto mb-3 opacity-30" />
                    <p className="font-medium">Nenhuma assinatura ainda</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-stone-100 bg-stone-50">
                          <th className="text-left px-5 py-3 text-xs font-bold text-stone-500 uppercase tracking-wider">Email</th>
                          <th className="text-left px-5 py-3 text-xs font-bold text-stone-500 uppercase tracking-wider">Status</th>
                          <th className="text-left px-5 py-3 text-xs font-bold text-stone-500 uppercase tracking-wider">Próx. cobrança</th>
                          <th className="text-left px-5 py-3 text-xs font-bold text-stone-500 uppercase tracking-wider">Desde</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-stone-50">
                        {subscriptions.map(s => (
                          <tr key={s.id} className="hover:bg-stone-50 transition-colors">
                            <td className="px-5 py-3 text-stone-700 font-medium">{s.email}</td>
                            <td className="px-5 py-3"><StatusBadge status={s.status} /></td>
                            <td className="px-5 py-3 text-stone-500">
                              {s.current_period_end
                                ? new Date(s.current_period_end).toLocaleDateString('pt-BR')
                                : '—'}
                            </td>
                            <td className="px-5 py-3 text-stone-500">
                              {new Date(s.created_at).toLocaleDateString('pt-BR')}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
