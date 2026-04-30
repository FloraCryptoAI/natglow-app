import React, { useState } from 'react'
import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useAdminAuth } from '@/lib/AdminAuthContext'
import {
  LayoutDashboard, ArrowLeftRight, Users, CreditCard,
  TrendingDown, Globe, ClipboardList, Settings,
  LogOut, Menu, X,
} from 'lucide-react'

const NAV_ITEMS = [
  { to: '/admin/overview',   icon: LayoutDashboard, label: 'Visão Geral' },
  { to: '/admin/funnel',     icon: ArrowLeftRight,  label: 'Funil de Conversão' },
  { to: '/admin/users',      icon: Users,           label: 'Usuárias' },
  { to: '/admin/financial',  icon: CreditCard,      label: 'Financeiro' },
  { to: '/admin/retention',  icon: TrendingDown,    label: 'Retenção' },
  { to: '/admin/geography',  icon: Globe,           label: 'Idioma & Geografia' },
  { to: '/admin/quiz',       icon: ClipboardList,   label: 'Respostas do Quiz' },
  { to: '/admin/settings',   icon: Settings,        label: 'Configurações' },
]

function SidebarContent({ onNavClick, onLogout }) {
  return (
    <div className="flex flex-col h-full">
      <div className="px-5 py-5 border-b border-stone-100">
        <div className="flex items-center gap-2.5">
          <img src="/logo.png" alt="NatGlow" className="w-8 h-8 rounded-xl" />
          <div>
            <p className="text-sm font-bold text-stone-900">NatGlow</p>
            <p className="text-[11px] text-stone-400 font-semibold tracking-wide uppercase">Admin</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {NAV_ITEMS.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            onClick={onNavClick}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                isActive
                  ? 'bg-brand text-white shadow-sm'
                  : 'text-stone-500 hover:bg-stone-100 hover:text-stone-800'
              }`
            }
          >
            <Icon className="w-4 h-4 flex-shrink-0" />
            {label}
          </NavLink>
        ))}
      </nav>

      <div className="px-3 pb-5 pt-3 border-t border-stone-100">
        <button
          onClick={onLogout}
          className="flex items-center gap-3 px-3 py-2.5 w-full rounded-xl text-sm font-medium text-stone-400 hover:bg-red-50 hover:text-red-500 transition-all"
        >
          <LogOut className="w-4 h-4 flex-shrink-0" />
          Sair
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
    <div className="flex h-screen bg-stone-100 overflow-hidden">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex w-56 flex-shrink-0 bg-white border-r border-stone-200 flex-col">
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
        className={`fixed inset-y-0 left-0 w-56 bg-white border-r border-stone-200 z-40 md:hidden flex flex-col transform transition-transform duration-200 ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <button
          onClick={() => setMobileOpen(false)}
          className="absolute top-3 right-3 p-1.5 rounded-lg text-stone-400 hover:bg-stone-100"
        >
          <X className="w-4 h-4" />
        </button>
        <SidebarContent onNavClick={() => setMobileOpen(false)} onLogout={logout} />
      </aside>

      {/* Main area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Mobile top bar */}
        <header className="md:hidden bg-white border-b border-stone-200 px-4 h-14 flex items-center gap-3 flex-shrink-0">
          <button
            onClick={() => setMobileOpen(true)}
            className="p-2 text-stone-500 hover:text-stone-800"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <img src="/logo.png" alt="NatGlow" className="w-6 h-6 rounded-lg" />
            <span className="text-sm font-bold text-stone-800">Admin</span>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
