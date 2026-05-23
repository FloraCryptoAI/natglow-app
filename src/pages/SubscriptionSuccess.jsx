import React, { useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { CheckCircle, Loader2, Mail, ArrowRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/lib/AuthContext';
import { initTikTokPixel, trackTtEvent } from '@/lib/tracking/tiktok-pixel';

export default function SubscriptionSuccess() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, isSubscribed } = useAuth();

  // Already logged in + subscribed → redirect to app
  useEffect(() => {
    if (user && isSubscribed) {
      const timer = setTimeout(() => navigate('/HairDashboard'), 2000);
      return () => clearTimeout(timer);
    }
  }, [user, isSubscribed, navigate]);

  // TikTok browser-side CompletePayment
  // Uses stored event_id from /results for deduplication; falls back to a fresh ID
  // if the user arrives at /success without going through /results first (e.g. Hotmart redirect)
  useEffect(() => {
    const storedId  = sessionStorage.getItem('tt_complete_payment_id');
    const planKey   = sessionStorage.getItem('tt_complete_plan_key');
    const planValue = parseFloat(sessionStorage.getItem('tt_complete_value') || '0') || undefined;

    // Prevent double-firing on page refresh when no stored ID exists
    if (!storedId && sessionStorage.getItem('tt_complete_fired')) return;

    const eventId = storedId || crypto.randomUUID();

    sessionStorage.setItem('tt_complete_fired', '1');
    sessionStorage.removeItem('tt_complete_payment_id');
    sessionStorage.removeItem('tt_complete_plan_key');
    sessionStorage.removeItem('tt_complete_value');

    initTikTokPixel().then(() => {
      trackTtEvent('CompletePayment', {
        content_id:   planKey || 'natglow_purchase',
        content_type: 'product',
        currency:     'USD',
        value:        planValue,
      }, eventId);
    });
  }, []);

  // Hotmart may pass checkout_email as a query param on the thank-you redirect
  const emailFromUrl = searchParams.get('checkout_email') || searchParams.get('email') || null;

  return (
    <div
      className="min-h-screen bg-stone-50 flex flex-col items-center justify-center px-4"
      style={{ fontFamily: 'system-ui, sans-serif' }}
    >
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

        ) : (
          /* Main state: purchase confirmed, welcome email sent with magic link */
          <div className="bg-white rounded-2xl border border-stone-100 shadow-sm p-8 flex flex-col gap-5">
            <div className="text-center flex flex-col gap-3">
              <CheckCircle className="w-14 h-14 mx-auto" style={{ color: '#FB45A9' }} />
              <h1 className="text-2xl font-extrabold text-stone-900">{t('success.purchaseConfirmedEmoji')}</h1>
              <p className="text-stone-500 text-sm leading-relaxed">{t('success.checkEmail')}</p>
            </div>

            {/* Email pill — only if Hotmart passed the email in the redirect */}
            {emailFromUrl && (
              <div className="bg-pink-50 border border-pink-200 rounded-xl px-4 py-3 flex items-center gap-3">
                <Mail className="w-5 h-5 flex-shrink-0" style={{ color: '#FB45A9' }} />
                <p className="font-semibold text-stone-800 text-sm truncate">{emailFromUrl}</p>
              </div>
            )}

            <p className="text-stone-500 text-sm text-center leading-relaxed">
              {t('success.checkEmailDesc')}
            </p>

            <p className="text-center text-xs text-stone-400">{t('success.spamNote')}</p>

            <Link
              to="/Login"
              className="py-4 text-sm flex items-center justify-center gap-2 font-bold text-white rounded-full"
              style={{ background: 'linear-gradient(135deg,#FB45A9,#E03594)' }}
            >
              {t('success.accessAccount')} <ArrowRight className="w-4 h-4" />
            </Link>

            <Link
              to="/Login"
              className="text-center text-xs text-stone-400 hover:text-stone-600 underline"
            >
              {t('success.loginInstead')}
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
