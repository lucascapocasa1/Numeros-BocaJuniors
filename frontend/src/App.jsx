import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import { useAuth } from './context/AuthContext';
import { usePageTracking } from './hooks/usePageTracking';
import Layout from './components/layout/Layout';
import HomePage from './pages/HomePage';
import EconomyPage from './pages/EconomyPage';
import EconomyDetailPage from './pages/EconomyDetailPage';
import ContractsPage from './pages/ContractsPage';
import ContractDetailPage from './pages/ContractDetailPage';
import BalancesPage from './pages/BalancesPage';
import BalanceDetailPage from './pages/BalanceDetailPage';
import LoginPage from './pages/LoginPage';
import AdminDashboard from './pages/AdminDashboard';
import AdminEconomyPage from './pages/AdminEconomyPage';
import AdminEconomyFormPage from './pages/AdminEconomyFormPage';
import AdminContractsPage from './pages/AdminContractsPage';
import AdminContractFormPage from './pages/AdminContractFormPage';
import AdminRightsPage from './pages/AdminRightsPage';
import AdminRightFormPage from './pages/AdminRightFormPage';
import AdminRumorsPage from './pages/AdminRumorsPage';
import AdminRumorFormPage from './pages/AdminRumorFormPage';
import AdminMarketsPage from './pages/AdminMarketsPage';
import AdminBalancesPage from './pages/AdminBalancesPage';
import AdminBalanceFormPage from './pages/AdminBalanceFormPage';
import AdminSettings from './pages/AdminSettings';
import AdminStadiumPage from './pages/AdminStadiumPage';
import AdminElectionsPage from './pages/AdminElectionsPage';
import AdminElectionListFormPage from './pages/AdminElectionListFormPage';
import StadiumPage from './pages/StadiumPage';
import StatsPage from './pages/StatsPage';
import RightsPage from './pages/RightsPage';
import ElectionListPage from './pages/ElectionListPage';
import ElectionsPage from './pages/ElectionsPage';
import ElectionDetailPage from './pages/ElectionDetailPage';
import Loader from './components/common/Loader';

function ScrollToTop() {
  const { pathname, state } = useLocation();
  useEffect(() => {
    // Skip if navigating to home with a scroll target (Navbar handles that scroll)
    if (pathname === '/' && state?.scrollTo) return;
    window.scrollTo(0, 0);
  }, [pathname, state]);
  return null;
}

function ProtectedRoute({ children }) {
  const { isAuthenticated, loading } = useAuth();
  if (loading) return <Loader />;
  if (!isAuthenticated) return <Navigate to="/admin/login" replace />;
  return children;
}

export default function App() {
  usePageTracking();
  return (
    <Layout>
      <ScrollToTop />
      <Routes>
        {/* Public */}
        <Route path="/" element={<HomePage />} />
        <Route path="/economia" element={<EconomyPage />} />
        <Route path="/economia/:id" element={<EconomyDetailPage />} />
        <Route path="/contratos" element={<ContractsPage />} />
        <Route path="/contratos/:id" element={<ContractDetailPage />} />
        <Route path="/balances" element={<BalancesPage />} />
        <Route path="/balances/:id" element={<BalanceDetailPage />} />
        <Route path="/estadisticas" element={<StatsPage />} />
        <Route path="/estadio" element={<StadiumPage />} />
        <Route path="/derechos" element={<RightsPage />} />
        <Route path="/elecciones" element={<ElectionsPage />} />
        <Route path="/elecciones/privado/:token" element={<ElectionListPage />} />
        <Route path="/elecciones/:slug" element={<ElectionDetailPage />} />

        {/* Auth */}
        <Route path="/admin/login" element={<LoginPage />} />

        {/* Admin (protected) */}
        <Route path="/admin" element={<ProtectedRoute><AdminDashboard /></ProtectedRoute>} />
        <Route path="/admin/economia" element={<ProtectedRoute><AdminEconomyPage /></ProtectedRoute>} />
        <Route path="/admin/economia/nuevo" element={<ProtectedRoute><AdminEconomyFormPage /></ProtectedRoute>} />
        <Route path="/admin/economia/:id/editar" element={<ProtectedRoute><AdminEconomyFormPage /></ProtectedRoute>} />
        <Route path="/admin/contratos" element={<ProtectedRoute><AdminContractsPage /></ProtectedRoute>} />
        <Route path="/admin/contratos/nuevo" element={<ProtectedRoute><AdminContractFormPage /></ProtectedRoute>} />
        <Route path="/admin/contratos/:id/editar" element={<ProtectedRoute><AdminContractFormPage /></ProtectedRoute>} />
        <Route path="/admin/derechos" element={<ProtectedRoute><AdminRightsPage /></ProtectedRoute>} />
        <Route path="/admin/derechos/nuevo" element={<ProtectedRoute><AdminRightFormPage /></ProtectedRoute>} />
        <Route path="/admin/derechos/:id/editar" element={<ProtectedRoute><AdminRightFormPage /></ProtectedRoute>} />
        <Route path="/admin/rumores" element={<ProtectedRoute><AdminRumorsPage /></ProtectedRoute>} />
        <Route path="/admin/rumores/nuevo" element={<ProtectedRoute><AdminRumorFormPage /></ProtectedRoute>} />
        <Route path="/admin/rumores/:id/editar" element={<ProtectedRoute><AdminRumorFormPage /></ProtectedRoute>} />
        <Route path="/admin/mercados" element={<ProtectedRoute><AdminMarketsPage /></ProtectedRoute>} />
        <Route path="/admin/balances" element={<ProtectedRoute><AdminBalancesPage /></ProtectedRoute>} />
        <Route path="/admin/balances/nuevo" element={<ProtectedRoute><AdminBalanceFormPage /></ProtectedRoute>} />
        <Route path="/admin/balances/:id/editar" element={<ProtectedRoute><AdminBalanceFormPage /></ProtectedRoute>} />
        <Route path="/admin/configuracion" element={<ProtectedRoute><AdminSettings /></ProtectedRoute>} />
        <Route path="/admin/estadio" element={<ProtectedRoute><AdminStadiumPage /></ProtectedRoute>} />
        <Route path="/admin/elecciones" element={<ProtectedRoute><AdminElectionsPage /></ProtectedRoute>} />
        <Route path="/admin/elecciones/nuevo" element={<ProtectedRoute><AdminElectionListFormPage /></ProtectedRoute>} />
        <Route path="/admin/elecciones/:id/editar" element={<ProtectedRoute><AdminElectionListFormPage /></ProtectedRoute>} />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Layout>
  );
}
