import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import Layout from './components/Layout';
import Landing from './pages/Landing';
import Results from './pages/Results';
import Login from './pages/Login';
import Upgrade from './pages/Upgrade';
import SubscriptionSuccess from './pages/SubscriptionSuccess';
import Admin from './pages/Admin';

import HairDiagnosis from './pages/HairDiagnosis';
import HairDashboard from './pages/HairDashboard';
import HairRecipes from './pages/HairRecipes';
import HairPlan from './pages/HairPlan';
import HairProgress from './pages/HairProgress';

import Dashboard from './pages/Dashboard';
import Recipes from './pages/Recipes';
import Progress from './pages/Progress';
import Plan30Days from './pages/Plan30Days';
import SkinAge from './pages/SkinAge';

const ADMIN_EMAIL = import.meta.env.VITE_ADMIN_EMAIL

function Spinner() {
  return (
    <div className="fixed inset-0 flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin" />
    </div>
  )
}

// Rota que exige login E assinatura ativa
const ProtectedRoute = ({ children }) => {
  const { user, loading, isSubscribed } = useAuth();

  if (loading) return <Spinner />;
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

// Rota exclusiva para o admin
const AdminRoute = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) return <Spinner />;
  if (!user || user.email !== ADMIN_EMAIL) return <Navigate to="/Login" replace />;

  return children;
};

const AppRoutes = () => {
  const { loading } = useAuth();

  if (loading) return <Spinner />;

  return (
    <Routes>
      <Route path="/" element={<Navigate to="/Login" replace />} />
      <Route path="/Landing" element={<Landing />} />
      <Route path="/Results" element={<Results />} />
      <Route path="/Login" element={<Login />} />

      {/* Página de assinatura — acessível para quem está logado mas não assinou */}
      <Route path="/Upgrade" element={
        <AuthRoute><Upgrade /></AuthRoute>
      } />

      {/* Confirmação pós-pagamento — pública (usuário ainda não está logado) */}
      <Route path="/success" element={<SubscriptionSuccess />} />

      {/* Painel de admin */}
      <Route path="/admin" element={
        <AdminRoute><Admin /></AdminRoute>
      } />

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
      </Route>

      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};

function App() {
  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <AppRoutes />
        </Router>
        <Toaster />
      </QueryClientProvider>
    </AuthProvider>
  )
}

export default App
