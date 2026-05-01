import React, { useEffect, useState, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAdminAuth } from '@/lib/AdminAuthContext'
import {
  RefreshCw, AlertCircle, Check, DollarSign,
  Tag, Clock, WrenchIcon, AlertTriangle, Settings,
} from 'lucide-react'

const DEFAULTS = {
  displayed_price: '6.99',
  crossed_price: '$47.99',
  promo_badge: 'Oferta Especial de Lançamento',
  timer_enabled: 'true',
  timer_minutes: '15',
  maintenance_mode: 'false',
  maintenance_text: 'Estamos em manutenção. Voltamos em breve! 🌿',
}

function Toggle({ checked, onChange, disabled }) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      disabled={disabled}
      className={`relative inline-flex w-11 h-6 rounded-full transition-colors duration-200 flex-shrink-0 ${
        checked ? 'bg-stone-800' : 'bg-stone-200'
      } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
    >
      <span
        className={`inline-block w-5 h-5 rounded-full bg-white shadow-sm mt-0.5 transition-transform duration-200 ${
          checked ? 'translate-x-5' : 'translate-x-0.5'
        }`}
      />
    </button>
  )
}

function SaveIndicator({ state }) {
  if (state === 'saving') {
    return (
      <span className="flex items-center gap-1 text-xs text-stone-400 font-medium">
        <div className="w-3 h-3 border-2 border-stone-300 border-t-stone-600 rounded-full animate-spin" />
        Salvando…
      </span>
    )
  }
  if (state === 'saved') {
    return (
      <span className="flex items-center gap-1 text-xs text-emerald-600 font-semibold">
        <Check className="w-3.5 h-3.5" /> Salvo ✓
      </span>
    )
  }
  return null
}

function ConfigCard({ icon: Icon, iconBg, iconColor, title, desc, children, saveState }) {
  return (
    <div className="bg-white rounded-2xl border border-stone-100 p-5">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={`w-9 h-9 rounded-xl ${iconBg} flex items-center justify-center flex-shrink-0`}>
            <Icon className={`w-[18px] h-[18px] ${iconColor}`} />
          </div>
          <div>
            <p className="font-bold text-stone-800 text-sm">{title}</p>
            {desc && <p className="text-xs text-stone-400 mt-0.5 leading-snug">{desc}</p>}
          </div>
        </div>
        <SaveIndicator state={saveState} />
      </div>
      {children}
    </div>
  )
}

export default function AdminSettings() {
  const { adminToken, clearAdminToken } = useAdminAuth()
  const navigate = useNavigate()
  const [config, setConfig] = useState(DEFAULTS)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [saveStates, setSaveStates] = useState({})
  const debounceTimers = useRef({})
  const savedTimers = useRef({})

  const baseUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1`
  const authHeaders = useCallback(() => ({
    Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
    apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
    'x-admin-token': adminToken,
    'Content-Type': 'application/json',
  }), [adminToken])

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`${baseUrl}/admin-config`, {
        headers: {
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
          'Content-Type': 'application/json',
        },
      })
      if (res.status === 401 || res.status === 403) {
        clearAdminToken(); navigate('/admin/login', { replace: true }); return
      }
      const result = await res.json()
      if (result?.error) throw new Error(result.error)
      setConfig({ ...DEFAULTS, ...result })
    } catch (e) {
      setError(e?.message ?? 'Erro ao carregar configurações')
    } finally {
      setLoading(false)
    }
  }, [adminToken, clearAdminToken, navigate]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { load() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const saveKey = useCallback(async (chave, valor) => {
    setSaveStates(s => ({ ...s, [chave]: 'saving' }))
    try {
      const res = await fetch(`${baseUrl}/admin-config`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ chave, valor }),
      })
      if (res.status === 401 || res.status === 403) {
        clearAdminToken(); navigate('/admin/login', { replace: true }); return
      }
      const result = await res.json()
      if (result?.error) throw new Error(result.error)
      setSaveStates(s => ({ ...s, [chave]: 'saved' }))
      clearTimeout(savedTimers.current[chave])
      savedTimers.current[chave] = setTimeout(() => {
        setSaveStates(s => ({ ...s, [chave]: null }))
      }, 3000)
    } catch {
      setSaveStates(s => ({ ...s, [chave]: null }))
    }
  }, [adminToken, clearAdminToken, navigate]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleText = (chave, value) => {
    setConfig(c => ({ ...c, [chave]: value }))
    clearTimeout(debounceTimers.current[chave])
    debounceTimers.current[chave] = setTimeout(() => saveKey(chave, value), 1000)
  }

  const handleToggle = (chave, checked) => {
    const value = checked ? 'true' : 'false'
    setConfig(c => ({ ...c, [chave]: value }))
    saveKey(chave, value)
  }

  if (loading) {
    return (
      <div className="flex flex-col gap-6 max-w-3xl">
        <div>
          <h1 className="text-xl font-extrabold text-stone-900">Configurações do Produto</h1>
          <p className="text-sm text-stone-400 mt-0.5">Parâmetros dinâmicos do NatGlow</p>
        </div>
        <div className="flex items-center justify-center py-20">
          <div className="w-7 h-7 border-4 border-stone-200 border-t-stone-700 rounded-full animate-spin" />
        </div>
      </div>
    )
  }

  const timerEnabled = config.timer_enabled === 'true'
  const maintenanceMode = config.maintenance_mode === 'true'

  return (
    <div className="flex flex-col gap-6 max-w-3xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-extrabold text-stone-900">Configurações do Produto</h1>
          <p className="text-sm text-stone-400 mt-0.5">Edite e o app aplica em tempo real · auto-salva 1s após parar de digitar</p>
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="flex items-center gap-2 text-sm font-semibold text-stone-500 hover:text-stone-800 bg-white border border-stone-200 rounded-xl px-3 py-2 transition-all disabled:opacity-40"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          Recarregar
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

      {/* Displayed price */}
      <ConfigCard
        icon={DollarSign} iconBg="bg-emerald-50" iconColor="text-emerald-500"
        title="Preço exibido na /Results"
        desc="Valor que aparece em destaque no card de preço"
        saveState={saveStates.displayed_price}
      >
        <div className="relative">
          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400 text-sm font-semibold">$</span>
          <input
            type="text"
            value={config.displayed_price}
            onChange={e => handleText('displayed_price', e.target.value)}
            className="w-full border border-stone-200 rounded-xl pl-7 pr-4 py-2.5 text-sm text-stone-800 outline-none focus:border-stone-400 transition-colors"
            placeholder="6.99"
          />
        </div>
        <p className="text-xs text-stone-400 mt-2">
          Preview: <span className="font-bold text-stone-700 text-base">${config.displayed_price}</span>/mês
        </p>
      </ConfigCard>

      {/* Crossed price */}
      <ConfigCard
        icon={Tag} iconBg="bg-red-50" iconColor="text-red-400"
        title='Preço riscado ("de")'
        desc="Preço original exibido riscado para criar percepção de desconto"
        saveState={saveStates.crossed_price}
      >
        <input
          type="text"
          value={config.crossed_price}
          onChange={e => handleText('crossed_price', e.target.value)}
          className="w-full border border-stone-200 rounded-xl px-4 py-2.5 text-sm text-stone-800 outline-none focus:border-stone-400 transition-colors"
          placeholder="$47.99"
        />
        <p className="text-xs text-stone-400 mt-2">
          Preview: <span className="line-through text-stone-400">{config.crossed_price}</span>{' '}
          <span className="font-bold text-stone-700">${config.displayed_price}</span>
        </p>
      </ConfigCard>

      {/* Promo badge */}
      <ConfigCard
        icon={Tag} iconBg="bg-violet-50" iconColor="text-violet-500"
        title="Texto do badge de promoção"
        desc="Badge exibido no topo do card de preço"
        saveState={saveStates.promo_badge}
      >
        <input
          type="text"
          value={config.promo_badge}
          onChange={e => handleText('promo_badge', e.target.value)}
          className="w-full border border-stone-200 rounded-xl px-4 py-2.5 text-sm text-stone-800 outline-none focus:border-stone-400 transition-colors"
          placeholder="Oferta Especial de Lançamento"
        />
        <div className="mt-2">
          <span className="inline-flex items-center text-xs font-semibold px-3 py-1 rounded-full bg-pink-50 text-pink-700 border border-pink-100">
            {config.promo_badge || 'Preview do badge'}
          </span>
        </div>
      </ConfigCard>

      {/* Timer */}
      <ConfigCard
        icon={Clock} iconBg="bg-amber-50" iconColor="text-amber-500"
        title="Timer de urgência"
        desc="Contador regressivo exibido na /Results para aumentar conversão"
        saveState={saveStates.timer_enabled ?? saveStates.timer_minutes}
      >
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-stone-700">Ativar timer</p>
              <p className="text-xs text-stone-400">Exibe o contador regressivo na página de resultados</p>
            </div>
            <Toggle
              checked={timerEnabled}
              onChange={checked => handleToggle('timer_enabled', checked)}
            />
          </div>

          {timerEnabled && (
            <div>
              <label className="text-xs font-semibold text-stone-600 mb-1.5 block">
                Duração (minutos)
              </label>
              <input
                type="number"
                min={1} max={60}
                value={config.timer_minutes}
                onChange={e => handleText('timer_minutes', e.target.value)}
                className="w-full border border-stone-200 rounded-xl px-4 py-2.5 text-sm text-stone-800 outline-none focus:border-stone-400 transition-colors"
                placeholder="15"
              />
              <p className="text-xs text-stone-400 mt-1.5">
                O timer começa ao entrar na /Results e não reinicia na mesma sessão.
              </p>
            </div>
          )}
        </div>
      </ConfigCard>

      {/* Maintenance mode */}
      <ConfigCard
        icon={WrenchIcon} iconBg={maintenanceMode ? 'bg-red-50' : 'bg-stone-100'} iconColor={maintenanceMode ? 'text-red-500' : 'text-stone-400'}
        title="Modo manutenção"
        desc={maintenanceMode ? '⚠️ ATIVO — a /Results está mostrando a tela de manutenção' : 'Inativo — a /Results está funcionando normalmente'}
        saveState={saveStates.maintenance_mode ?? saveStates.maintenance_text}
      >
        <div className="flex flex-col gap-4">
          {maintenanceMode && (
            <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
              <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-red-600 font-semibold leading-snug">
                Modo manutenção ATIVO. A página /Results está inacessível para todas as usuárias.
                Desative quando terminar.
              </p>
            </div>
          )}

          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-stone-700">Ativar modo manutenção</p>
              <p className="text-xs text-stone-400">Bloqueia o acesso à /Results e exibe a mensagem abaixo</p>
            </div>
            <Toggle
              checked={maintenanceMode}
              onChange={checked => handleToggle('maintenance_mode', checked)}
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-stone-600 mb-1.5 block">
              Mensagem exibida durante manutenção
            </label>
            <textarea
              rows={3}
              value={config.maintenance_text}
              onChange={e => handleText('maintenance_text', e.target.value)}
              className="w-full border border-stone-200 rounded-xl px-4 py-2.5 text-sm text-stone-800 outline-none focus:border-stone-400 transition-colors resize-none"
              placeholder="Estamos em manutenção. Voltamos em breve!"
            />
          </div>
        </div>
      </ConfigCard>

      {/* Info banner */}
      <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 flex items-start gap-3">
        <Settings className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-semibold text-blue-700 mb-0.5">Como funciona o auto-save</p>
          <p className="text-xs text-blue-600 leading-relaxed">
            Campos de texto salvam automaticamente 1 segundo após você parar de digitar.
            Toggles salvam imediatamente ao clicar.
            As alterações são aplicadas em tempo real pela tabela <code className="bg-blue-100 px-1 rounded text-xs">admin_config</code> no Supabase.
          </p>
        </div>
      </div>
    </div>
  )
}
