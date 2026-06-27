import React, { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import { Download, Share, X, MoreHorizontal } from 'lucide-react'

// 4-step iOS install instructions. Step 1 (tap the ⋯ button) was added
// because modern iOS Safari hides Share behind the More menu in some
// layouts — users couldn't find Share without this hint.
function IOSInstructionSteps({ t }) {
  return (
    <div className="space-y-3 text-sm text-stone-600">
      <div className="flex items-start gap-3">
        <span className="text-brand font-bold text-base">1</span>
        <p>
          {t('installPrompt.ios.step1')}{' '}
          <MoreHorizontal className="w-4 h-4 text-blue-500 inline" />{' '}
          {t('installPrompt.ios.step1b')}
        </p>
      </div>
      <div className="flex items-start gap-3">
        <span className="text-brand font-bold text-base">2</span>
        <p>
          {t('installPrompt.ios.step2')}{' '}
          <Share className="w-4 h-4 text-blue-500 inline" />{' '}
          {t('installPrompt.ios.step2b')}
        </p>
      </div>
      <div className="flex items-start gap-3">
        <span className="text-brand font-bold text-base">3</span>
        <p>
          {t('installPrompt.ios.step3')}{' '}
          <strong className="text-stone-800">{t('installPrompt.ios.step3b')}</strong>
        </p>
      </div>
      <div className="flex items-start gap-3">
        <span className="text-brand font-bold text-base">4</span>
        <p>{t('installPrompt.ios.step4')}</p>
      </div>
    </div>
  )
}

function isIOS() {
  return /iPhone|iPad|iPod/i.test(navigator.userAgent)
}

function isAndroid() {
  return /Android/i.test(navigator.userAgent)
}

function isStandalone() {
  return window.matchMedia('(display-mode: standalone)').matches ||
    window.navigator.standalone === true
}

function shouldShowInstallModal() {
  if (isStandalone()) return false
  const dismissedAt = localStorage.getItem('install_dismissed_at')
  if (dismissedAt && Date.now() - Number(dismissedAt) < 7 * 24 * 60 * 60 * 1000) return false
  return true
}

// Botão compacto para o header — aparece quando não está instalado (Android/iOS apenas)
export function InstallHeaderButton() {
  const { t } = useTranslation()
  const [deferredPrompt, setDeferredPrompt] = useState(null)
  const [visible, setVisible] = useState(false)
  const [iosModalOpen, setIosModalOpen] = useState(false)

  useEffect(() => {
    if (isStandalone() || (!isAndroid() && !isIOS())) return

    if (isAndroid()) {
      if (window.deferredInstallPrompt) {
        setDeferredPrompt(window.deferredInstallPrompt)
        setVisible(true)
        return
      }
      const handler = (e) => {
        e.preventDefault()
        window.deferredInstallPrompt = e
        setDeferredPrompt(e)
        setVisible(true)
      }
      window.addEventListener('beforeinstallprompt', handler)
      return () => window.removeEventListener('beforeinstallprompt', handler)
    }

    if (isIOS()) setVisible(true)
  }, [])

  if (!visible) return null

  const handleClick = async () => {
    if (isIOS()) {
      setIosModalOpen(true)
      return
    }
    if (deferredPrompt) {
      deferredPrompt.prompt()
      await deferredPrompt.userChoice
      setVisible(false)
    }
  }

  return (
    <>
      <button
        onClick={handleClick}
        className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-brand border border-brand/30 rounded-full hover:bg-brand/5 transition-colors"
      >
        <Download className="w-3.5 h-3.5" />
        {t('installPrompt.headerBtn')}
      </button>

      {iosModalOpen && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-sm bg-white rounded-3xl p-6 pb-8 space-y-4">
            <div className="flex items-center justify-between">
              <p className="font-semibold text-stone-800">{t('installPrompt.ios.title')}</p>
              <button onClick={() => setIosModalOpen(false)} className="p-1 text-stone-400 hover:text-stone-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <IOSInstructionSteps t={t} />
            <button
              onClick={() => setIosModalOpen(false)}
              className="w-full py-3 bg-brand text-white font-semibold rounded-xl text-sm"
            >
              {t('common.close')}
            </button>
          </div>
        </div>,
        document.body
      )}
    </>
  )
}

// Seção de instalação para HairSettings — permanente, detecta plataforma
export function InstallSettingsSection() {
  const { t } = useTranslation()
  const [deferredPrompt, setDeferredPrompt] = useState(() => window.deferredInstallPrompt ?? null)
  const [iosModalOpen, setIosModalOpen] = useState(false)
  const [installed, setInstalled] = useState(isStandalone)

  useEffect(() => {
    if (isAndroid() && !window.deferredInstallPrompt) {
      const handler = (e) => {
        e.preventDefault()
        window.deferredInstallPrompt = e
        setDeferredPrompt(e)
      }
      window.addEventListener('beforeinstallprompt', handler)
      return () => window.removeEventListener('beforeinstallprompt', handler)
    }
  }, [])

  if (installed) return null
  if (!isIOS() && !isAndroid()) return null
  if (isAndroid() && !deferredPrompt) return null

  const handleInstall = async () => {
    if (isIOS()) { setIosModalOpen(true); return }
    if (deferredPrompt) {
      deferredPrompt.prompt()
      const { outcome } = await deferredPrompt.userChoice
      window.deferredInstallPrompt = null
      setDeferredPrompt(null)
      if (outcome === 'accepted') setInstalled(true)
    }
  }

  return (
    <>
      <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden shadow-sm">
        <div className="px-5 pt-5 pb-3 border-b border-stone-100 flex items-center gap-2">
          <Download className="w-4 h-4 text-brand" />
          <h2 className="text-sm font-semibold text-stone-800">{t('installPrompt.settingsTitle')}</h2>
        </div>
        <div className="px-5 py-4">
          <p className="text-xs text-stone-400 mb-4 leading-relaxed">
            {isIOS() ? t('installPrompt.settingsDescIos') : t('installPrompt.settingsDescAndroid')}
          </p>
          <button
            onClick={handleInstall}
            className="flex items-center gap-2 px-4 py-2 bg-brand text-white text-sm font-semibold rounded-xl hover:bg-brand-dark transition-colors"
          >
            <Download className="w-4 h-4" />
            {t('installPrompt.installBtn')}
          </button>
        </div>
      </div>

      {iosModalOpen && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-sm bg-white rounded-3xl p-6 pb-8 space-y-4">
            <div className="flex items-center justify-between">
              <p className="font-semibold text-stone-800">{t('installPrompt.ios.title')}</p>
              <button onClick={() => setIosModalOpen(false)} className="p-1 text-stone-400 hover:text-stone-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <IOSInstructionSteps t={t} />
            <button
              onClick={() => setIosModalOpen(false)}
              className="w-full py-3 bg-brand text-white font-semibold rounded-xl text-sm"
            >
              {t('common.close')}
            </button>
          </div>
        </div>,
        document.body
      )}
    </>
  )
}

// Modal automático — aparece no HairDashboard no primeiro acesso
export default function InstallPrompt({ onResolved }) {
  const { t } = useTranslation()
  const [show, setShow] = useState(false)
  const [deferredPrompt, setDeferredPrompt] = useState(null)
  const [platform, setPlatform] = useState(null) // 'android' | 'ios' | null
  const [iosModalOpen, setIosModalOpen] = useState(false)

  useEffect(() => {
    if (!shouldShowInstallModal()) {
      onResolved?.()
      return
    }

    if (isIOS()) {
      setPlatform('ios')
      setShow(true)
      return
    }

    if (isAndroid()) {
      // Usa o evento capturado cedo em index.html (evita race condition)
      if (window.deferredInstallPrompt) {
        setDeferredPrompt(window.deferredInstallPrompt)
        setPlatform('android')
        setShow(true)
        return
      }
      // Fallback: evento ainda não disparou — ouve normalmente
      const handler = (e) => {
        e.preventDefault()
        window.deferredInstallPrompt = e
        setDeferredPrompt(e)
        setPlatform('android')
        setShow(true)
      }
      window.addEventListener('beforeinstallprompt', handler)
      return () => window.removeEventListener('beforeinstallprompt', handler)
    }

    // Desktop: não mostra, resolve imediatamente
    onResolved?.()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const dismiss = () => {
    localStorage.setItem('install_dismissed_at', String(Date.now()))
    setShow(false)
    onResolved?.()
  }

  const handleAndroidInstall = async () => {
    if (!deferredPrompt) return
    deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    setDeferredPrompt(null)
    setShow(false)
    onResolved?.()
    if (outcome !== 'accepted') {
      localStorage.setItem('install_dismissed_at', String(Date.now()))
    }
  }

  const handleIOSInstall = () => {
    setIosModalOpen(true)
  }

  const handleIOSClose = () => {
    setIosModalOpen(false)
    dismiss()
  }

  if (!show) return null

  return (
    <>
      {/* Banner principal */}
      <div className="flex items-start gap-3 bg-white border border-brand/20 rounded-2xl p-4 shadow-sm">
        <div className="w-10 h-10 rounded-xl overflow-hidden flex-shrink-0">
          <img src="/pwa-192x192.png" alt="NatGlow" className="w-full h-full object-cover" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-stone-800">{t('installPrompt.title')}</p>
          <p className="text-xs text-stone-500 mt-0.5 leading-snug">{t('installPrompt.subtitle')}</p>
        </div>
        <button
          onClick={dismiss}
          className="flex-shrink-0 p-1 text-stone-400 hover:text-stone-600 transition-colors"
          aria-label={t('common.close')}
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Botões de ação */}
      <div className="flex gap-2 mt-2">
        {platform === 'android' && (
          <button
            onClick={handleAndroidInstall}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-brand text-white text-sm font-semibold rounded-xl hover:bg-brand-dark transition-colors"
          >
            <Download className="w-4 h-4" />
            {t('installPrompt.installBtn')}
          </button>
        )}
        {platform === 'ios' && (
          <button
            onClick={handleIOSInstall}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-brand text-white text-sm font-semibold rounded-xl hover:bg-brand-dark transition-colors"
          >
            <Share className="w-4 h-4" />
            {t('installPrompt.installBtn')}
          </button>
        )}
        <button
          onClick={dismiss}
          className="px-4 py-2.5 text-sm font-medium text-stone-400 hover:text-stone-600 transition-colors"
        >
          {t('installPrompt.dismiss')}
        </button>
      </div>

      {/* Modal de instruções iOS */}
      {iosModalOpen && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-sm bg-white rounded-3xl p-6 pb-8 space-y-4">
            <div className="flex items-center justify-between">
              <p className="font-semibold text-stone-800">{t('installPrompt.ios.title')}</p>
              <button onClick={handleIOSClose} className="p-1 text-stone-400 hover:text-stone-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <IOSInstructionSteps t={t} />

            <button
              onClick={handleIOSClose}
              className="w-full py-3 bg-brand text-white font-semibold rounded-xl text-sm hover:bg-brand-dark transition-colors"
            >
              {t('common.close')}
            </button>
          </div>
        </div>,
        document.body
      )}
    </>
  )
}
