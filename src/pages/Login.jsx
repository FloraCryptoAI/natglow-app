import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowRight, Loader2, Mail } from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';
import { supabase } from '@/api/supabaseClient';

export default function Login() {
  const navigate = useNavigate();
  const { user, isSubscribed, signInWithGoogle } = useAuth();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingGoogle, setLoadingGoogle] = useState(false);
  const [error, setError] = useState(null);

  // Já está logada → redireciona
  useEffect(() => {
    if (user) {
      navigate(isSubscribed ? '/HairDashboard' : '/Upgrade', { replace: true });
    }
  }, [user, isSubscribed, navigate]);

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const { data, error: fnErr } = await supabase.functions.invoke('login-by-email', {
        body: { email: email.trim().toLowerCase() },
      });
      if (fnErr || !data?.url) throw new Error('not_found');
      window.location.href = data.url;
    } catch {
      setError('Email não encontrado. Verifique se usou o mesmo email da compra.');
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    setLoadingGoogle(true);
    setError(null);
    try {
      await signInWithGoogle('/HairDashboard');
    } catch (err) {
      setError('Erro ao conectar com Google. Tente novamente.');
      setLoadingGoogle(false);
    }
  };

  return (
    <div className="min-h-screen bg-stone-50 flex flex-col" style={{ fontFamily: 'system-ui, sans-serif' }}>
      <style>{`
        .btn-primary { background: linear-gradient(135deg,#FB45A9,#E03594); color:#fff; border-radius:9999px; font-weight:700; transition:all .2s; }
        .btn-primary:hover:not(:disabled) { opacity:.9; box-shadow:0 8px 24px rgba(251,69,169,.35); transform:scale(1.02); }
        .btn-primary:disabled { opacity:.7; cursor:not-allowed; }
        .btn-outline { background:#fff; color:#374151; border:2px solid #e7e5e4; border-radius:9999px; font-weight:600; transition:all .2s; }
        .btn-outline:hover:not(:disabled) { border-color:#FB45A9; background:#FFF5FA; }
        .btn-outline:disabled { opacity:.7; cursor:not-allowed; }
      `}</style>

      {/* Header */}
      <header className="bg-white/90 backdrop-blur border-b border-stone-200/60">
        <div className="max-w-lg mx-auto px-4 h-14 flex items-center gap-2">
          <Link to="/Landing" className="flex items-center gap-2">
            <img src="/logo.png" alt="NatGlow" className="w-9 h-9 rounded-xl" />
            <span className="font-bold text-stone-800 text-sm">NatGlow</span>
          </Link>
        </div>
      </header>

      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-sm">

              <div className="bg-white rounded-2xl border border-stone-100 shadow-sm p-8 flex flex-col gap-5">
              <div className="text-center">
                <h1 className="text-2xl font-extrabold text-stone-900 mb-1">Acessar minha conta</h1>
                <p className="text-stone-500 text-sm">Digite o email usado na compra</p>
              </div>

              {error && (
                <p className="text-red-600 text-sm bg-red-50 rounded-xl px-4 py-2 text-center">{error}</p>
              )}

              <form onSubmit={handleLogin} className="flex flex-col gap-3">
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
                  <input
                    type="email"
                    required
                    placeholder="seu@email.com"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    className="w-full border-2 border-stone-200 rounded-2xl pl-10 pr-4 py-3.5 text-stone-800 outline-none focus:border-pink-400 transition-colors text-sm"
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading || !email.trim()}
                  className="btn-primary py-4 text-base flex items-center justify-center gap-2"
                >
                  {loading
                    ? <><Loader2 className="w-4 h-4 animate-spin" /> Entrando...</>
                    : <>Entrar no meu plano <ArrowRight className="w-4 h-4" /></>}
                </button>
              </form>

              {/* Divisor */}
              <div className="flex items-center gap-3">
                <div className="flex-1 h-px bg-stone-200" />
                <span className="text-xs text-stone-400">ou</span>
                <div className="flex-1 h-px bg-stone-200" />
              </div>

              {/* Google */}
              <button
                onClick={handleGoogle}
                disabled={loadingGoogle}
                className="btn-outline py-3.5 text-sm flex items-center justify-center gap-3"
              >
                {loadingGoogle ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <svg className="w-4 h-4" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                )}
                Continuar com Google
              </button>

              <p className="text-center text-xs text-stone-400">
                Ainda não tem plano?{' '}
                <Link to="/Landing" className="underline text-stone-600 hover:text-stone-800">
                  Fazer diagnóstico grátis →
                </Link>
              </p>
            </div>
        </div>
      </div>
    </div>
  );
}
