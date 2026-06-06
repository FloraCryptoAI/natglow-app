import { useEffect } from 'react'
import { Toaster } from "@/components/ui/toaster"
import { Toaster as SonnerToaster } from "@/components/ui/sonner"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes, Navigate, useLocation } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import { AdminAuthProvider, useAdminAuth } from '@/lib/AdminAuthContext';
import Layout from './components/Layout';
import QuizBold from './pages/QuizBold';
import QuizDetox from './pages/QuizDetox';
import Results from './pages/Results';
import ResultsDetox from './pages/ResultsDetox';
import OfferDetox from './pages/OfferDetox';
import Login from './pages/Login';
import Upgrade from './pages/Upgrade';
import SubscriptionSuccess from './pages/SubscriptionSuccess';
import AdminLayout from './pages/admin/AdminLayout';
import AdminOverview from './pages/admin/AdminOverview';
import AdminFunnel from './pages/admin/AdminFunnel';
import AdminUsers from './pages/admin/AdminUsers';
import AdminFinancial from './pages/admin/AdminFinancial';
import AdminRetention from './pages/admin/AdminRetention';
import AdminGeography from './pages/admin/AdminGeography';
import AdminQuizAnswers from './pages/admin/AdminQuizAnswers';
import AdminSettings from './pages/admin/AdminSettings';
import AdminCosts from './pages/admin/AdminCosts';
import AdminNotifications from './pages/admin/AdminNotifications';
import AdminFeed from './pages/admin/AdminFeed';
import AdminTracking from './pages/admin/AdminTracking';
import AdminLogin from './pages/AdminLogin';
import Privacy from './pages/Privacy'
import Terms   from './pages/Terms'
import Refund  from './pages/Refund'
import Contact from './pages/Contact';
import AuthCallback    from './pages/AuthCallback';
import ResetPassword  from './pages/ResetPassword';

import HairDiagnosis from './pages/HairDiagnosis';
import HairDashboard from './pages/HairDashboard';
import HairFeed from './pages/HairFeed';
import HairRecipes from './pages/HairRecipes';
import HairPlan from './pages/HairPlan';
import HairProgress from './pages/HairProgress';
import HairSettings from './pages/HairSettings';

import Dashboard from './pages/Dashboard';
import Recipes from './pages/Recipes';
import Progress from './pages/Progress';
import Plan30Days from './pages/Plan30Days';
import SkinAge from './pages/SkinAge';

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => { window.scrollTo(0, 0); }, [pathname]);
  return null;
}

function LandingRedirect() {
  const { search } = useLocation();
  return <Navigate to={`/quiz-detox${search}`} replace />;
}

function Spinner() {
  return (
    <div className="fixed inset-0 flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin" />
    </div>
  )
}

// Rota que exige login E assinatura ativa
const ProtectedRoute = ({ children }) => {
  const { user, loading, subscriptionLoading, isSubscribed, subscription } = useAuth();

  if (loading) return <Spinner />;
  // Show spinner on subscription load only when we have no cached data yet.
  // On token refreshes, subscription is already populated — skip the spinner
  // to prevent unnecessary unmount/remount of child pages.
  if (subscriptionLoading && subscription === null) return <Spinner />;
  if (!user) return <Navigate to="/Login" replace />;
  if (!isSubscribed) return <Navigate to="/Upgrade" replace />;

  return children;
};

// Rota que exige apenas login (sem checar assinatura)
const AuthRoute = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) return <Spinner />;
  if (!user) return <Navigate to="/Login" replace />;

  return children;
};

// Rota exclusiva para o admin — usa JWT admin (independente do Supabase Auth)
const AdminRoute = ({ children }) => {
  const { isAdmin } = useAdminAuth();
  if (!isAdmin) return <Navigate to="/admin/login" replace />;
  return children;
};

const AppRoutes = () => {
  const { loading } = useAuth();

  if (loading) return <Spinner />;

  return (
    <Routes>
      <Route path="/" element={<Navigate to="/Login" replace />} />

      {/* ── Quiz routes — only the 2 persuasive funnels are active ── */}
      <Route path="/quiz-bold"    element={<QuizBold pricingPlan="bold" />} />
      <Route path="/quiz-detox"   element={<QuizDetox pricingPlan="detox" />} />

      {/* ── Results routes ── */}
      <Route path="/results-bold"    element={<Results pricingPlan="bold" />} />
      <Route path="/results-detox"   element={<ResultsDetox pricingPlan="detox" />} />
      <Route path="/offer-detox"     element={<OfferDetox pricingPlan="detox" />} />

      {/* Legacy redirects — old standard funnel URLs now point to /quiz-detox (flagship) */}
      <Route path="/quiz"           element={<Navigate to="/quiz-detox" replace />} />
      <Route path="/quiz-cheap"     element={<Navigate to="/quiz-detox" replace />} />
      <Route path="/quiz-premium"   element={<Navigate to="/quiz-detox" replace />} />
      <Route path="/quiz-weekly"    element={<Navigate to="/quiz-detox" replace />} />
      <Route path="/results"        element={<Navigate to="/quiz-detox" replace />} />
      <Route path="/results-cheap"  element={<Navigate to="/quiz-detox" replace />} />
      <Route path="/results-premium" element={<Navigate to="/quiz-detox" replace />} />
      <Route path="/results-weekly" element={<Navigate to="/quiz-detox" replace />} />
      <Route path="/Results"        element={<Navigate to="/quiz-detox" replace />} />

      <Route path="/Landing" element={<LandingRedirect />} />
      <Route path="/Login"          element={<Login />} />
      <Route path="/auth/callback"  element={<AuthCallback />} />
      <Route path="/reset-password" element={<ResetPassword />} />

      {/* Página de assinatura — acessível para quem está logado mas não assinou */}
      <Route path="/Upgrade" element={
        <AuthRoute><Upgrade /></AuthRoute>
      } />

      {/* Confirmação pós-pagamento — pública (usuário ainda não está logado) */}
      <Route path="/success" element={<SubscriptionSuccess />} />

      {/* Login do admin — rota pública, separada do /Login de usuário */}
      <Route path="/admin/login" element={<AdminLogin />} />

      {/* Painel de admin — protegido por JWT admin (MFA) */}
      <Route path="/admin" element={<AdminRoute><AdminLayout /></AdminRoute>}>
        <Route index element={<Navigate to="overview" replace />} />
        <Route path="overview"  element={<AdminOverview />} />
        <Route path="funnel"    element={<AdminFunnel />} />
        <Route path="users"     element={<AdminUsers />} />
        <Route path="financial" element={<AdminFinancial />} />
        <Route path="retention" element={<AdminRetention />} />
        <Route path="geography" element={<AdminGeography />} />
        <Route path="quiz"          element={<AdminQuizAnswers />} />
        <Route path="costs"         element={<AdminCosts />} />
        <Route path="notifications" element={<AdminNotifications />} />
        <Route path="feed"          element={<AdminFeed />} />
        <Route path="tracking"      element={<AdminTracking />} />
        <Route path="settings"      element={<AdminSettings />} />
      </Route>

      {/* Skin care — página standalone */}
      <Route path="/SkinAge" element={
        <ProtectedRoute><SkinAge /></ProtectedRoute>
      } />

      {/* Hair — página standalone */}
      <Route path="/HairDiagnosis" element={
        <ProtectedRoute><HairDiagnosis /></ProtectedRoute>
      } />

      {/* Skin care — páginas com Layout */}
      <Route element={
        <ProtectedRoute><Layout /></ProtectedRoute>
      }>
        <Route path="/Dashboard" element={<Dashboard />} />
        <Route path="/Recipes" element={<Recipes />} />
        <Route path="/Progress" element={<Progress />} />
        <Route path="/Plan30Days" element={<Plan30Days />} />
      </Route>

      {/* Hair — páginas com Layout */}
      <Route element={
        <ProtectedRoute><Layout /></ProtectedRoute>
      }>
        <Route path="/HairDashboard" element={<HairDashboard />} />
        <Route path="/HairFeed" element={<HairFeed />} />
        <Route path="/HairRecipes" element={<HairRecipes />} />
        <Route path="/HairPlan" element={<HairPlan />} />
        <Route path="/HairProgress" element={<HairProgress />} />
        <Route path="/HairSettings" element={<HairSettings />} />
      </Route>

      <Route path="/privacy" element={<Privacy />} />
      <Route path="/terms"   element={<Terms />} />
      <Route path="/refund"  element={<Refund />} />
      <Route path="/contact" element={<Contact />} />
      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};

function App() {
  return (
    <AuthProvider>
      <AdminAuthProvider>
        <QueryClientProvider client={queryClientInstance}>
          <Router>
            <ScrollToTop />
            <AppRoutes />
          </Router>
          <Toaster />
          <SonnerToaster />
        </QueryClientProvider>
      </AdminAuthProvider>
    </AuthProvider>
  )
}

export default App
