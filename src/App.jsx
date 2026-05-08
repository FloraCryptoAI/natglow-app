import { useEffect } from 'react'
import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes, Navigate, useLocation } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import { AdminAuthProvider, useAdminAuth } from '@/lib/AdminAuthContext';
import Layout from './components/Layout';
import Quiz from './pages/Quiz';
import Results from './pages/Results';
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
import AdminLogin from './pages/AdminLogin';

import HairDiagnosis from './pages/HairDiagnosis';
import HairDashboard from './pages/HairDashboard';
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

function Spinner() {
  return (
    <div className="fixed inset-0 flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin" />
    </div>
  )
}

// Rota que exige login E assinatura ativa
const ProtectedRoute = ({ children }) => {
  const { user, loading, subscriptionLoading, isSubscribed } = useAuth();

  if (loading || subscriptionLoading) return <Spinner />;
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

      {/* ── Quiz routes — one per pricing plan ── */}
      <Route path="/quiz"         element={<Quiz pricingPlan="monthly" />} />
      <Route path="/quiz-cheap"   element={<Quiz pricingPlan="monthly_cheap" />} />
      <Route path="/quiz-premium" element={<Quiz pricingPlan="monthly_premium" />} />
      <Route path="/quiz-weekly"  element={<Navigate to="/quiz" replace />} />

      {/* ── Results routes — one per pricing plan ── */}
      <Route path="/results"         element={<Results pricingPlan="monthly" />} />
      <Route path="/results-cheap"   element={<Results pricingPlan="monthly_cheap" />} />
      <Route path="/results-premium" element={<Results pricingPlan="monthly_premium" />} />
      <Route path="/results-weekly"  element={<Navigate to="/results" replace />} />

      {/* Legacy redirect — keeps old /Results links working (emails, ads, bookmarks) */}
      <Route path="/Results" element={<Navigate to="/results" replace />} />

      <Route path="/Landing" element={<Navigate to="/quiz" replace />} />
      <Route path="/Login" element={<Login />} />

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
        <Route path="/HairRecipes" element={<HairRecipes />} />
        <Route path="/HairPlan" element={<HairPlan />} />
        <Route path="/HairProgress" element={<HairProgress />} />
        <Route path="/HairSettings" element={<HairSettings />} />
      </Route>

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
        </QueryClientProvider>
      </AdminAuthProvider>
    </AuthProvider>
  )
}

export default App
