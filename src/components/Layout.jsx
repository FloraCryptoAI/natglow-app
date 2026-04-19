import React from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { Home, BookOpen, Calendar, BarChart3, LogOut } from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';

const navItems = [
  { path: '/HairDashboard', label: 'Minha Rotina', icon: Home },
  { path: '/HairRecipes', label: 'Receitas', icon: BookOpen },
  { path: '/HairPlan', label: 'Plano', icon: Calendar },
  { path: '/HairProgress', label: 'Progresso', icon: BarChart3 },
];

export default function Layout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { signOut } = useAuth();

  const handleLogout = async () => {
    await signOut();
    navigate('/Landing');
  };

  return (
    <div className="min-h-screen bg-stone-50">
      <style>{`
        .bg-emerald-700 { background-color: #FB45A9 !important; }
        .bg-emerald-800 { background-color: #E03594 !important; }
        .bg-emerald-600 { background-color: #FFB3DD !important; }
        .hover\\:bg-emerald-700:hover { background-color: #FB45A9 !important; }
        .hover\\:bg-emerald-800:hover { background-color: #E03594 !important; }
        .text-emerald-700 { color: #FB45A9 !important; }
        .text-emerald-600 { color: #FFB3DD !important; }
        .text-emerald-800 { color: #E03594 !important; }
        .border-emerald-600 { border-color: #FFB3DD !important; }
        .border-emerald-300 { border-color: #FFB3DD !important; }
        .ring-emerald-100 { --tw-ring-color: #FFE4F2 !important; }
        .bg-emerald-50 { background-color: #FFF5FA !important; }
        .bg-emerald-100 { background-color: #FFE4F2 !important; }
        .border-emerald-500 { border-color: #FB45A9 !important; }
      `}</style>

      {/* Top header — always visible */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-lg border-b border-stone-200/60">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link to="/HairDashboard" className="flex items-center gap-2">
            <img
              src="/logo.png"
              alt="NatGlow"
              className="w-10 h-10 rounded-2xl"
            />
            <span className="font-semibold text-base tracking-tight text-stone-800">NatGlow</span>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-1">
            {navItems.map(item => (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all ${
                  location.pathname === item.path
                    ? 'bg-emerald-50 text-emerald-700'
                    : 'text-stone-500 hover:text-stone-800 hover:bg-stone-100'
                }`}
              >
                <item.icon className="w-4 h-4" />
                {item.label}
              </Link>
            ))}
          </nav>

          <button
            onClick={handleLogout}
            className="hidden md:flex items-center gap-2 px-3 py-2 text-sm text-stone-400 hover:text-stone-600 transition-colors"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Main content — extra bottom padding on mobile for bottom nav */}
      <main className="max-w-6xl mx-auto px-4 py-6 pb-24 md:pb-6">
        <Outlet />
      </main>

      {/* Bottom navigation — mobile only */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-stone-200 safe-area-bottom">
        <div className="grid grid-cols-4 h-16">
          {navItems.map(item => {
            const active = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`relative flex flex-col items-center justify-center gap-0.5 transition-colors ${
                  active ? 'text-emerald-700' : 'text-stone-400'
                }`}
              >
                <item.icon className={`w-5 h-5 ${active ? 'text-emerald-700' : 'text-stone-400'}`} />
                <span className={`text-xs font-medium leading-tight ${active ? 'text-emerald-700' : 'text-stone-400'}`}>
                  {item.label}
                </span>
                {active && (
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 h-0.5 w-8 bg-emerald-700 rounded-full" />
                )}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}