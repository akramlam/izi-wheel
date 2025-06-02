import { Route, Routes, Navigate, useLocation } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { useAuth } from './hooks/useAuth';
import Dashboard from './pages/Dashboard';
import Login from './pages/Login';
import NotFound from './pages/NotFound';
import Roues from './pages/Roues';
import WheelEdit from './pages/WheelEdit';
import Layout from './components/Layout';
import Entreprises from './pages/Entreprises';
import SousAdministrateurs from './pages/SousAdministrateurs';
// import Statistiques from './pages/Statistiques';
// import Statistics from './pages/Statistics';
import RegisterSuper from './pages/register-super';
import ChangePassword from './components/ChangePassword';
import PlayWheel from './pages/PlayWheel';
import RedeemPrize from './pages/RedeemPrize';
import Profile from './pages/Profile';
import AccountSettings from './pages/AccountSettings';
import Register from './pages/Register';
import Statistiques from './pages/Statistiques';

// Protected route wrapper
const ProtectedRoute = ({ children, allowedRoles }: { children: JSX.Element, allowedRoles?: string[] }) => {
  const { user, isAuthenticated } = useAuth();
  const location = useLocation();
  const [loading, setLoading] = useState(true);
  
  // Debug logger
  const log = (msg: string) => console.log(`[ProtectedRoute ${location.pathname}] ${msg}`);
  
  useEffect(() => {
    log(`Route rendered with auth state: ${isAuthenticated ? 'authenticated' : 'not authenticated'}`);
    
    // Always ensure we don't get stuck in loading
    const timer = setTimeout(() => {
      if (loading) {
        log('Forcing loading state to end');
        setLoading(false);
      }
    }, 2000);
    
    return () => clearTimeout(timer);
  }, [isAuthenticated, loading, location.pathname]);
  
  useEffect(() => {
    // Wait a moment for auth context to initialize
    const timer = setTimeout(() => {
      setLoading(false);
    }, 300);
    
    return () => clearTimeout(timer);
  }, []);

  // If still initializing, show loading
  if (loading) {
    log('Loading state active');
    return <div className="flex h-screen items-center justify-center">
      <div className="h-32 w-32 animate-spin rounded-full border-b-2 border-t-2 border-indigo-600"></div>
    </div>;
  }

  // Not authenticated
  if (!isAuthenticated || !user) {
    log('Not authenticated, redirecting to login');
    return <Navigate to="/login" replace />;
  }

  // Check permissions
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    log(`Role ${user.role} not allowed, redirecting to dashboard`);
    return <Navigate to="/dashboard" replace />;
  }

  log('Rendering protected content');
  return children;
};

function App() {
  return (
    <Routes>
      {/* Public routes */}
      <Route path="/login" element={<Login />} />
      <Route path="/register-super" element={<RegisterSuper />} />
      <Route path="/register" element={<Register />} />
      
      {/* Public wheel routes */}
      <Route path="/play/:companyId/:wheelId" element={<PlayWheel />} />
      {/* Direct wheel access without company ID */}
      <Route path="/play/wheel/:wheelId" element={<PlayWheel />} />
      <Route path="/redeem/:playId" element={<RedeemPrize />} />
      
      <Route path="/change-password" element={
        <ProtectedRoute>
          <ChangePassword />
        </ProtectedRoute>
      } />
      
      {/* Protected routes */}
      <Route path="/" element={
        <ProtectedRoute>
          <Layout />
        </ProtectedRoute>
      }>
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<Dashboard />} />
        
        {/* Wheel routes */}
        <Route path="roues" element={<Roues />} />
        <Route path="roues/create" element={<WheelEdit />} />
        <Route path="roues/edit/:id" element={<WheelEdit />} />
        <Route path="roues/:id" element={<WheelEdit />} />
        
        <Route path="statistiques" element={<Statistiques />} />
        <Route path="profile" element={<Profile />} />
        <Route path="account-settings" element={<AccountSettings />} />
        
        {/* Super admin only routes */}
        <Route path="entreprises" element={
          <ProtectedRoute allowedRoles={['SUPER']}>
            <Entreprises />
          </ProtectedRoute>
        } />
        
        {/* Admin and Super admin routes */}
        <Route path="sous-administrateurs" element={
          <ProtectedRoute allowedRoles={['SUPER', 'ADMIN']}>
            <SousAdministrateurs />
          </ProtectedRoute>
        } />
      </Route>

      {/* Not found route */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

export default App; 