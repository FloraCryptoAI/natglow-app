import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { CheckCircle, Loader2, Mail, ArrowRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/api/supabaseClient';
import { useAuth } from '@/lib/AuthContext';


export default function SubscriptionSuccess() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, isSubscribed } = useAuth();

  const [email, setEmail] = useState(null);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendDone, setResendDone] = useState(false);
  const [fetchError, setFetchError] = useState(null);
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    if (user && isSubscribed) {
      const timer = setTimeout(() => navigate('/HairDashboard'), 2000);
      return () => clearTimeout(timer);
    }
  }, [user, isSubscribed, navigate]);

  useEffect(() => {
    const sessionId = searchParams.get('session_id');
    if (!sessionId) {
      setFetching(false);
      return;
    }
    supabase.functions
      .invoke('get-checkout-session', { body: { sessionId } })
      .then(({ data, error: fnError }) => {
        if (fnError || !data?.email) {
          setFetchError(t('success.emailError'));
        } else {
          setEmail(data.email);
        }
      })
      .catch(() => setFetchError(t('success.emailError')))
      .finally(() => setFetching(false));
  }, [searchParams, t]);

  const handleResend = async () => {
    if (!email) return;
    setResendLoading(true);
    try {
      await supabase.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: window.location.origin + '/HairDashboard' },
      });
      setResendDone(true);
    } catch {
      setFetchError(t('success.emailError'));
    } finally {
      setResendLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen bg-stone-50 flex flex-col items-center justify-center px-4"
      style={{ fontFamily: 'system-ui, sans-serif' }}
    >
      <style>{`
        .btn-primary { background: linear-gradient(135deg,#FB45A9,#E03594); color:#fff; border-radius:9999px; font-weight:700; transition:all .2s; }
        .btn-primary:hover:not(:disabled) { opacity:.9; box-shadow:0 8px 24px rgba(251,69,169,.35); transform:scale(1.02); }
        .btn-primary:disabled { opacity:.7; cursor:not-allowed; }
      `}</style>

      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-6">
          <Link to="/Landing" className="inline-flex items-center gap-2">
            <img src="/logo.png" alt="NatGlow" className="w-10 h-10 rounded-xl" />
            <span className="font-bold text-stone-800">NatGlow</span>
          </Link>
        </div>

        {/* Already subscribed → redirecting */}
        {user && isSubscribed ? (
          <div className="bg-white rounded-2xl border border-stone-100 shadow-sm p-8 text-center flex flex-col gap-4">
            <CheckCircle className="w-14 h-14 mx-auto" style={{ color: '#FB45A9' }} />
            <h1 className="text-2xl font-extrabold text-stone-900">{t('success.paymentConfirmed')}</h1>
            <p className="text-stone-500 text-sm">{t('success.redirecting')}</p>
            <Loader2 className="w-6 h-6 animate-spin mx-auto text-stone-400" />
          </div>

        ) : fetching ? (
          /* Fetching session */
          <div className="bg-white rounded-2xl border border-stone-100 shadow-sm p-8 text-center flex flex-col gap-4">
            <Loader2 className="w-10 h-10 animate-spin mx-auto" style={{ color: '#FB45A9' }} />
            <p className="text-stone-500 text-sm">{t('success.confirming')}</p>
          </div>

        ) : fetchError ? (
          /* Error fetching email */
          <div className="bg-white rounded-2xl border border-stone-100 shadow-sm p-8 text-center flex flex-col gap-4">
            <CheckCircle className="w-14 h-14 mx-auto" style={{ color: '#FB45A9' }} />
            <h1 className="text-xl font-extrabold text-stone-900">{t('success.purchaseConfirmed')}</h1>
            <p className="text-stone-500 text-sm">{fetchError}</p>
            <Link
              to="/Login"
              className="btn-primary py-4 text-sm flex items-center justify-center gap-2"
            >
              {t('success.accessAccount')} <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

        ) : (
          /* Main state: email found */
          <div className="bg-white rounded-2xl border border-stone-100 shadow-sm p-8 flex flex-col gap-5">
            <div className="text-center flex flex-col gap-3">
              <CheckCircle className="w-14 h-14 mx-auto" style={{ color: '#FB45A9' }} />
              <h1 className="text-2xl font-extrabold text-stone-900">{t('success.purchaseConfirmedEmoji')}</h1>
              <p className="text-stone-500 text-sm">{t('success.emailSentTo')}</p>
            </div>

            {/* Email */}
            <div className="bg-pink-50 border border-pink-200 rounded-xl px-4 py-3 flex items-center gap-3">
              <Mail className="w-5 h-5 flex-shrink-0" style={{ color: '#FB45A9' }} />
              <p className="font-semibold text-stone-800 text-sm truncate">{email}</p>
            </div>

            <p className="text-stone-500 text-sm text-center leading-relaxed">
              {t('success.useEmailToAccess')}
            </p>

            <Link
              to="/Login"
              className="btn-primary py-4 text-sm flex items-center justify-center gap-2"
            >
              {t('success.accessPlan')} <ArrowRight className="w-4 h-4" />
            </Link>

            <p className="text-center text-xs text-stone-400">
              {t('success.clickInstruction')}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
