import React, { useEffect } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { Home, BookOpen, Calendar, BarChart3, LogOut, Settings, Newspaper } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { setLang } from '@/lib/i18n';
import { useAuth } from '@/lib/AuthContext';
import { supabase } from '@/api/supabaseClient';
import NotificationBell from './NotificationBell';
import { InstallHeaderButton } from './InstallPrompt';

export default function Layout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const { t, i18n } = useTranslation();

  // Sincroniza idioma do banco ao abrir o app (resolve localStorage isolado do PWA no iOS)
  useEffect(() => {
    async function syncLang() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from('subscriptions')
        .select('notification_preferences')
        .eq('user_id', user.id)
        .single();
      const savedLang = data?.notification_preferences?.lang;
      if (savedLang) {
        if (savedLang !== i18n.language) setLang(savedLang);
        // Atualiza lang das subscriptions diretamente por user_id — mais confiável no iOS
        // onde pushManager.getSubscription() pode falhar silenciosamente durante a inicialização
        supabase
          .from('notification_subscriptions')
          .update({ lang: savedLang })
          .eq('user_id', user.id)
          .then(() => {})
      }
    }
    syncLang();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const navItems = [
    { path: '/HairDashboard', label: t('layout.myRoutine'), icon: Home },
    { path: '/HairFeed', label: t('layout.feed'), icon: Newspaper },
    { path: '/HairRecipes', label: t('layout.recipes'), icon: BookOpen },
    { path: '/HairPlan', label: t('layout.plan'), icon: Calendar },
    { path: '/HairProgress', label: t('layout.progress'), icon: BarChart3 },
  ];

  const handleLogout = async () => {
    await signOut();
    navigate('/Landing');
  };

  return (
    <div className="min-h-screen bg-stone-50">
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
                    ? 'bg-brand-bg text-brand'
                    : 'text-stone-500 hover:text-stone-800 hover:bg-stone-100'
                }`}
              >
                <item.icon className="w-4 h-4" />
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-1">
            <NotificationBell />
            <InstallHeaderButton />
            <Link
              to="/HairSettings"
              className="p-2 text-stone-400 hover:text-stone-700 transition-colors rounded-full hover:bg-stone-100"
            >
              <Settings className="w-5 h-5" />
            </Link>
            <button
              onClick={handleLogout}
              className="hidden md:flex items-center gap-2 px-3 py-2 text-sm text-stone-400 hover:text-stone-600 transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Main content — extra bottom padding on mobile for bottom nav */}
      <main className="max-w-6xl mx-auto px-4 py-6 pb-24 md:pb-6">
        <Outlet />
      </main>

      {/* Bottom navigation — mobile only */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-stone-200 safe-area-bottom">
        <div className="grid grid-cols-5 h-16">
          {navItems.map(item => {
            const active = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`relative flex flex-col items-center justify-center gap-0.5 transition-colors ${
                  active ? 'text-brand' : 'text-stone-400'
                }`}
              >
                <item.icon className={`w-5 h-5 ${active ? 'text-brand' : 'text-stone-400'}`} />
                <span className={`text-xs font-medium leading-tight ${active ? 'text-brand' : 'text-stone-400'}`}>
                  {item.label}
                </span>
                {active && (
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 h-0.5 w-8 bg-brand rounded-full" />
                )}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
