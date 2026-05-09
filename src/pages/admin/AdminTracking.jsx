import React, { useState, useEffect, useCallback } from 'react'
import { Settings2, Activity, BarChart2, Eye, EyeOff, CheckCircle2, XCircle, AlertCircle, RefreshCw, Loader2 } from 'lucide-react'
import { useAdminFetch } from './hooks/useAdminFetch'
import { toast } from 'sonner'

const TABS = [
  { key: 'config',      label: 'Configuração',     icon: Settings2 },
  { key: 'status',      label: 'Status & Eventos',  icon: Activity  },
  { key: 'attribution', label: 'Attribution',       icon: BarChart2 },
]

const PUBLIC_DEFAULTS = {
  'tracking.facebook.pixel_id':        '',
  'tracking.facebook.enabled':         false,
  'tracking.facebook.test_event_code': '',
  'tracking.tiktok.pixel_id':          '',
  'tracking.tiktok.enabled':           false,
  'tracking.consent.required':         true,
}
const SECRET_DEFAULTS = {
  'tracking.facebook.capi_token':  '',
  'tracking.tiktok.access_token':  '',
}

// ─── Config Tab ──────────────────────────────────────────────────────────────
function ConfigTab({ apiFetch }) {
  const [cfg, setCfg]           = useState({ ...PUBLIC_DEFAULTS, ...SECRET_DEFAULTS })
  const [loading, setLoading]   = useState(true)
  const [saving, setSaving]     = useState(null)  // key being saved
  const [testing, setTesting]   = useState(null)  // 'facebook' | 'tiktok'
  const [showSecrets, setShowSecrets] = useState({})

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await apiFetch('/functions/v1/admin-tracking-config?mode=full')
      setCfg(prev => ({ ...prev, ...data }))
    } finally {
      setLoading(false)
    }
  }, [apiFetch])

  useEffect(() => { load() }, [load])

  async function saveField(key, value) {
    setSaving(key)
    try {
      await apiFetch('/functions/v1/admin-tracking-config?mode=save', {
        method: 'POST', body: JSON.stringify({ key, value }),
      })
      toast.success('Salvo')
    } catch {
      toast.error('Erro ao salvar')
    } finally {
      setSaving(null)
    }
  }

  async function testPlatform(platform) {
    setTesting(platform)
    try {
      const data = await apiFetch(`/functions/v1/admin-tracking-config?mode=test_${platform}`, { method: 'POST', body: '{}' })
      if (data?.skipped) {
        toast.info('Pixel não configurado ou desativado')
      } else if (data?.ok) {
        toast.success(`Evento de teste ${platform === 'facebook' ? 'CAPI' : 'Events API'} enviado com sucesso`)
      } else {
        toast.error(`Erro: ${data?.error ?? 'resposta inesperada'}`)
      }
    } catch {
      toast.error('Erro ao testar')
    } finally {
      setTesting(null)
    }
  }

  function update(key, value) {
    setCfg(prev => ({ ...prev, [key]: value }))
  }

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="w-6 h-6 text-violet-400 animate-spin" />
      </div>
    )
  }

  return (
    <div className="grid gap-6">
      {/* Facebook */}
      <PlatformCard
        title="Facebook"
        logo="f"
        logoColor="bg-blue-600"
        fields={[
          { key: 'tracking.facebook.pixel_id',        label: 'Pixel ID',        type: 'text',    hint: '15–17 dígitos, ex: 1234567890123456' },
          { key: 'tracking.facebook.capi_token',      label: 'CAPI Token',      type: 'secret',  hint: 'Conversions API Access Token' },
          { key: 'tracking.facebook.test_event_code', label: 'Test Event Code', type: 'text',    hint: 'Ex: TEST12345 — remover em produção' },
        ]}
        enabledKey="tracking.facebook.enabled"
        cfg={cfg}
        saving={saving}
        testing={testing === 'facebook'}
        showSecrets={showSecrets}
        onUpdate={update}
        onSave={saveField}
        onToggleSecret={k => setShowSecrets(p => ({ ...p, [k]: !p[k] }))}
        onTest={() => testPlatform('facebook')}
      />

      {/* TikTok */}
      <PlatformCard
        title="TikTok"
        logo="T"
        logoColor="bg-black"
        fields={[
          { key: 'tracking.tiktok.pixel_id',      label: 'Pixel ID',     type: 'text',   hint: 'ID do Web Pixel TikTok' },
          { key: 'tracking.tiktok.access_token',   label: 'Access Token', type: 'secret', hint: 'Events API Access Token' },
        ]}
        enabledKey="tracking.tiktok.enabled"
        cfg={cfg}
        saving={saving}
        testing={testing === 'tiktok'}
        showSecrets={showSecrets}
        onUpdate={update}
        onSave={saveField}
        onToggleSecret={k => setShowSecrets(p => ({ ...p, [k]: !p[k] }))}
        onTest={() => testPlatform('tiktok')}
      />

      {/* Privacy */}
      <div className="bg-white border border-gray-200 rounded-2xl p-6">
        <h3 className="font-semibold text-gray-800 mb-4">Privacidade & Consentimento</h3>
        <div className="flex items-center justify-between py-3 border-b border-gray-100">
          <div>
            <p className="text-sm font-medium text-gray-700">Exigir consentimento de cookies</p>
            <p className="text-xs text-gray-400 mt-0.5">Se ativo, o banner de LGPD/GDPR aparece antes de carregar pixels</p>
          </div>
          <Toggle
            checked={!!cfg['tracking.consent.required']}
            onChange={v => { update('tracking.consent.required', v); saveField('tracking.consent.required', v) }}
          />
        </div>
      </div>
    </div>
  )
}

function PlatformCard({ title, logo, logoColor, fields, enabledKey, cfg, saving, testing, showSecrets, onUpdate, onSave, onToggleSecret, onTest }) {
  const isEnabled = !!cfg[enabledKey]
  const hasPixelId = !!cfg[fields[0].key]

  const status = !hasPixelId ? 'unconfigured'
               : !isEnabled  ? 'disabled'
               : 'active'

  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-6">
      <div className="flex items-center gap-3 mb-5">
        <div className={`w-8 h-8 rounded-lg ${logoColor} flex items-center justify-center text-white text-sm font-bold`}>{logo}</div>
        <h3 className="font-semibold text-gray-800 flex-1">{title}</h3>
        <StatusBadge status={status} />
        <Toggle
          checked={isEnabled}
          onChange={v => { onUpdate(enabledKey, v); onSave(enabledKey, v) }}
        />
      </div>

      <div className="space-y-4">
        {fields.map(f => (
          <ConfigField
            key={f.key}
            field={f}
            value={cfg[f.key] ?? ''}
            saving={saving === f.key}
            showSecret={showSecrets[f.key]}
            onUpdate={v => onUpdate(f.key, v)}
            onSave={() => onSave(f.key, cfg[f.key])}
            onToggleSecret={() => onToggleSecret(f.key)}
          />
        ))}
      </div>

      <div className="flex gap-2 mt-5 pt-4 border-t border-gray-100">
        <button
          onClick={onTest}
          disabled={testing || !isEnabled}
          className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-violet-600 border border-violet-200 rounded-lg hover:bg-violet-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          {testing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Activity className="w-3.5 h-3.5" />}
          Testar CAPI/Events API
        </button>
      </div>
    </div>
  )
}

function ConfigField({ field, value, saving, showSecret, onUpdate, onSave, onToggleSecret }) {
  const isSecret = field.type === 'secret'
  const displayValue = isSecret && !showSecret && value && !value.startsWith('*')
    ? value.replace(/./g, '*')
    : value

  return (
    <div>
      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">{field.label}</label>
      <div className="flex gap-2">
        <div className="relative flex-1">
          <input
            type={isSecret && !showSecret ? 'password' : 'text'}
            value={String(displayValue)}
            onChange={e => onUpdate(e.target.value)}
            placeholder={field.hint}
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-300 bg-gray-50 pr-9"
          />
          {isSecret && (
            <button
              type="button"
              onClick={onToggleSecret}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              {showSecret ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            </button>
          )}
        </div>
        <button
          onClick={onSave}
          disabled={saving}
          className="px-3 py-2 text-sm font-medium bg-violet-600 text-white rounded-lg hover:bg-violet-700 disabled:opacity-50 transition-colors flex-shrink-0"
        >
          {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Salvar'}
        </button>
      </div>
      {field.hint && <p className="text-xs text-gray-400 mt-1">{field.hint}</p>}
    </div>
  )
}

// ─── Status Tab ──────────────────────────────────────────────────────────────
function StatusTab({ apiFetch }) {
  const [stats, setStats]     = useState(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await apiFetch('/functions/v1/admin-tracking-config?mode=stats')
      setStats(data)
    } finally {
      setLoading(false)
    }
  }, [apiFetch])

  useEffect(() => { load() }, [load])

  if (loading) {
    return <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 text-violet-400 animate-spin" /></div>
  }

  const summary = stats?.summary ?? {}

  return (
    <div className="space-y-6">
      {/* Deduplication rate */}
      {stats?.totalIds > 0 && (
        <div className="bg-white border border-gray-200 rounded-2xl p-5">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Taxa de Deduplicação (Pixel + CAPI)</p>
          <p className="text-3xl font-extrabold text-gray-900">{stats.matchRate ?? 0}%</p>
          <p className="text-xs text-gray-400 mt-0.5">{stats.deduped} de {stats.totalIds} eventos com event_id em ambos os canais</p>
        </div>
      )}

      {/* Per-platform */}
      {['facebook', 'tiktok'].map(platform => {
        const s = summary[platform]
        if (!s) return (
          <div key={platform} className="bg-white border border-gray-200 rounded-2xl p-5">
            <h3 className="font-semibold text-gray-700 capitalize mb-2">{platform}</h3>
            <p className="text-sm text-gray-400">Nenhum evento nas últimas 24h</p>
          </div>
        )
        const events = s.events as Record<string, { browser: number; server: number }> ?? {}
        return (
          <div key={platform} className="bg-white border border-gray-200 rounded-2xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-800 capitalize">{platform}</h3>
              <div className="flex gap-3 text-xs text-gray-400">
                <span>{s.total} total</span>
                {s.failed > 0 && <span className="text-red-500">{s.failed} erros</span>}
                {s.lastAt && <span>último: {new Date(s.lastAt).toLocaleTimeString()}</span>}
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-gray-400 border-b border-gray-100">
                    <th className="pb-2 font-medium">Evento</th>
                    <th className="pb-2 font-medium text-right">Browser</th>
                    <th className="pb-2 font-medium text-right">Server</th>
                    <th className="pb-2 font-medium text-right">Match</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(events).map(([name, counts]) => (
                    <tr key={name} className="border-b border-gray-50">
                      <td className="py-2 text-gray-700">{name}</td>
                      <td className="py-2 text-right text-gray-500">{counts.browser}</td>
                      <td className="py-2 text-right text-gray-500">{counts.server}</td>
                      <td className="py-2 text-right">
                        {counts.browser > 0 && counts.server > 0
                          ? <span className="text-green-600 font-medium">✓</span>
                          : <span className="text-gray-300">—</span>
                        }
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )
      })}

      <button
        onClick={load}
        className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-violet-600 transition-colors"
      >
        <RefreshCw className="w-3.5 h-3.5" />
        Atualizar
      </button>
    </div>
  )
}

// ─── Attribution Tab ──────────────────────────────────────────────────────────
function AttributionTab({ apiFetch }) {
  const [stats, setStats]     = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    apiFetch('/functions/v1/admin-tracking-config?mode=stats')
      .then(data => setStats(data))
      .finally(() => setLoading(false))
  }, [apiFetch])

  if (loading) {
    return <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 text-violet-400 animate-spin" /></div>
  }

  const utmSources   = stats?.utmSources   ?? {}
  const utmCampaigns = stats?.utmCampaigns ?? {}

  const sortedSources   = Object.entries(utmSources).sort((a, b) => b[1] - a[1])
  const sortedCampaigns = Object.entries(utmCampaigns).sort((a, b) => b[1] - a[1])
  const totalSubs = sortedSources.reduce((acc, [, n]) => acc + n, 0)

  return (
    <div className="grid md:grid-cols-2 gap-6">
      <div className="bg-white border border-gray-200 rounded-2xl p-5">
        <h3 className="font-semibold text-gray-800 mb-4">Top Fontes (utm_source)</h3>
        {sortedSources.length === 0 ? (
          <p className="text-sm text-gray-400">Nenhuma fonte rastreada ainda</p>
        ) : (
          <div className="space-y-2">
            {sortedSources.slice(0, 10).map(([src, count]) => (
              <BarRow key={src} label={src} value={count} total={totalSubs} />
            ))}
          </div>
        )}
      </div>

      <div className="bg-white border border-gray-200 rounded-2xl p-5">
        <h3 className="font-semibold text-gray-800 mb-4">Top Campanhas (utm_campaign)</h3>
        {sortedCampaigns.length === 0 ? (
          <p className="text-sm text-gray-400">Nenhuma campanha rastreada ainda</p>
        ) : (
          <div className="space-y-2">
            {sortedCampaigns.slice(0, 10).map(([cmp, count]) => (
              <BarRow key={cmp} label={cmp} value={count} total={totalSubs} />
            ))}
          </div>
        )}
      </div>

      <div className="md:col-span-2 bg-amber-50 border border-amber-100 rounded-2xl p-4 text-xs text-amber-700">
        Attribution baseada em dados de assinaturas já convertidas. Requer que a usuária tenha chegado via URL com parâmetros UTM antes da compra.
      </div>
    </div>
  )
}

// ─── Shared sub-components ────────────────────────────────────────────────────
function Toggle({ checked, onChange }) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${checked ? 'bg-violet-600' : 'bg-gray-200'}`}
    >
      <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${checked ? 'translate-x-6' : 'translate-x-1'}`} />
    </button>
  )
}

function StatusBadge({ status }) {
  if (status === 'active')        return <span className="text-xs font-medium px-2 py-0.5 bg-green-100 text-green-700 rounded-full">● Ativo</span>
  if (status === 'disabled')      return <span className="text-xs font-medium px-2 py-0.5 bg-yellow-100 text-yellow-700 rounded-full">● Desativado</span>
  return <span className="text-xs font-medium px-2 py-0.5 bg-gray-100 text-gray-500 rounded-full">● Não configurado</span>
}

function BarRow({ label, value, total }) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0
  return (
    <div>
      <div className="flex items-center justify-between text-sm mb-1">
        <span className="text-gray-700 font-medium truncate max-w-[160px]">{label}</span>
        <span className="text-gray-400 ml-2">{value} ({pct}%)</span>
      </div>
      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div className="h-full bg-violet-500 rounded-full" style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function AdminTracking() {
  const [tab, setTab]     = useState('config')
  const { apiFetch }      = useAdminFetch()

  return (
    <div className="flex flex-col gap-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-extrabold text-gray-900">Tracking & Marketing</h1>
          <p className="text-sm text-gray-400 mt-0.5">Facebook Pixel, TikTok Pixel, CAPI e attribution de campanhas</p>
        </div>
      </div>

      <div className="flex bg-white border border-gray-200 rounded-xl p-1 gap-0.5 w-fit">
        {TABS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
              tab === key
                ? 'bg-violet-600 text-white shadow-sm'
                : 'text-gray-500 hover:bg-gray-50 hover:text-gray-700'
            }`}
          >
            <Icon className="w-3.5 h-3.5" />
            {label}
          </button>
        ))}
      </div>

      {tab === 'config'      && <ConfigTab      apiFetch={apiFetch} />}
      {tab === 'status'      && <StatusTab      apiFetch={apiFetch} />}
      {tab === 'attribution' && <AttributionTab apiFetch={apiFetch} />}
    </div>
  )
}
