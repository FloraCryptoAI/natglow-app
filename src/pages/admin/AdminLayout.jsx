import React, { useState } from 'react'
import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useAdminAuth } from '@/lib/AdminAuthContext'
import { Menu, X } from 'lucide-react'
import {
  SquaresFour,
  ArrowsLeftRight,
  Users,
  CreditCard,
  Receipt,
  TrendDown,
  Globe,
  ClipboardText,
  Gear,
  Bell,
  SignOut,
  Lightning,
  Newspaper,
} from '@phosphor-icons/react'

const NAV_ITEMS = [
  { to: '/admin/overview',   icon: SquaresFour,      label: 'Visão Geral' },
  { to: '/admin/funnel',     icon: ArrowsLeftRight,  label: 'Funil de Conversão' },
  { to: '/admin/users',      icon: Users,            label: 'Usuárias' },
  { to: '/admin/financial',  icon: CreditCard,       label: 'Financeiro' },
  { to: '/admin/costs',      icon: Receipt,          label: 'Custos & ROI' },
  { to: '/admin/retention',  icon: TrendDown,        label: 'Retenção' },
  { to: '/admin/geography',  icon: Globe,            label: 'Idioma & Geografia' },
  { to: '/admin/quiz',           icon: ClipboardText,    label: 'Respostas do Quiz' },
  { to: '/admin/notifications',  icon: Bell,             label: 'Notificações' },
  { to: '/admin/feed',           icon: Newspaper,        label: 'Feed' },
  { to: '/admin/settings',       icon: Gear,             label: 'Configurações' },
]

function SidebarContent({ onNavClick, onLogout }) {
  return (
    <div className="flex flex-col h-full">
      {/* Nome */}
      <div className="px-5 py-5 border-b border-gray-50">
        <span className="font-medium text-gray-900 text-[15px] tracking-tight">NatGlow</span>
      </div>

      {/* Nav */}
      <div className="pt-5 flex-1 overflow-y-auto">
        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3 px-5">
          Menu Principal
        </p>
        {/*
          Ajustes manuais do menu:
          - Altura dos itens:    py-3.5  (aumente/diminua)
          - Recuo interno:       px-5    (espaço da borda até o ícone)
          - Espaço entre itens:  space-y-0 no <nav> abaixo
          - Largura da sidebar:  w-60 nas tags <aside> (~linha 93 e 107)
        */}
        <nav className="space-y-0">
          {NAV_ITEMS.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              onClick={onNavClick}
              className={({ isActive }) =>
                `flex items-center gap-3 px-5 py-3.5 w-full text-sm font-medium transition-all duration-150 ${
                  isActive
                    ? 'bg-violet-600 text-white'
                    : 'text-gray-500 hover:bg-violet-50 hover:text-violet-700'
                }`
              }
            >
              <Icon size={18} weight="fill" className="flex-shrink-0" />
              {label}
            </NavLink>
          ))}
        </nav>
      </div>

      {/* Promo card + Logout */}
      <div className="px-3 pb-5 pt-4 space-y-2">
        <div className="rounded-2xl p-4 bg-gradient-to-br from-violet-500 via-violet-600 to-purple-700 text-white shadow-lg shadow-violet-200">
          <div className="flex items-center gap-2 mb-2">
            <Lightning size={14} weight="fill" className="text-yellow-300" />
            <p className="text-xs font-bold">Admin Panel</p>
          </div>
          <p className="text-[11px] text-violet-200 leading-relaxed">
            Gestão e análise completa da plataforma NatGlow.
          </p>
        </div>
        <button
          onClick={onLogout}
          className="flex items-center gap-3 px-4 py-2.5 w-full rounded-xl text-sm font-medium text-gray-400 hover:bg-red-50 hover:text-red-500 transition-all"
        >
          <SignOut size={18} weight="fill" className="flex-shrink-0" />
          Sair da conta
        </button>
      </div>
    </div>
  )
}

export default function AdminLayout() {
  const { clearAdminToken } = useAdminAuth()
  const navigate = useNavigate()
  const [mobileOpen, setMobileOpen] = useState(false)

  const logout = () => {
    clearAdminToken()
    navigate('/admin/login', { replace: true })
  }

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex w-60 flex-shrink-0 bg-white border-r border-gray-100 flex-col">
        <SidebarContent onNavClick={() => {}} onLogout={logout} />
      </aside>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-30 md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 w-60 bg-white border-r border-gray-100 z-40 md:hidden flex flex-col transform transition-transform duration-200 ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <button
          onClick={() => setMobileOpen(false)}
          className="absolute top-3 right-3 p-1.5 rounded-lg text-gray-400 hover:bg-gray-100"
        >
          <X className="w-4 h-4" />
        </button>
        <SidebarContent onNavClick={() => setMobileOpen(false)} onLogout={logout} />
      </aside>

      {/* Main area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top header */}
        <header className="bg-white border-b border-gray-100 px-6 h-16 flex items-center gap-4 flex-shrink-0">
          <button
            onClick={() => setMobileOpen(true)}
            className="md:hidden p-2 text-gray-500 hover:text-gray-800 rounded-lg hover:bg-gray-100"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div className="ml-auto flex items-center gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-violet-600 flex items-center justify-center shadow-sm shadow-violet-200">
                <span className="text-xs font-bold text-white">LB</span>
              </div>
              <div className="hidden sm:block">
                <p className="text-xs font-bold text-gray-800 leading-tight">Lucas Benigno</p>
                <p className="text-[10px] text-gray-400 leading-tight">Super Admin</p>
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto overflow-x-hidden p-3 sm:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
