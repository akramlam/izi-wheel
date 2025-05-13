import { Route, Routes, Navigate, useLocation } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { useAuth } from './hooks/useAuth';
import Dashboard from './pages/Dashboard';
import Login from './pages/Login';
import NotFound from './pages/NotFound';
import WheelManager from './pages/WheelManager';
import WheelEdit from './pages/WheelEdit';
import Layout from './components/Layout';
import SuperAdmin from './pages/SuperAdmin';
import SubAdminManager from './pages/SubAdminManager';
import Statistics from './pages/Statistics';
import RegisterSuper from './pages/register-super';
import ChangePassword from './components/ChangePassword';
import PlayWheel from './pages/PlayWheel';
import RedeemPrize from './pages/RedeemPrize';
import Profile from './pages/Profile';
import AccountSettings from './pages/AccountSettings';

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
      
      {/* Public wheel routes */}
      <Route path="/play/:companyId/:wheelId" element={<PlayWheel />} />
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
        <Route path="wheels" element={<WheelManager />} />
        <Route path="wheels/:wheelId" element={<WheelEdit />} />
        <Route path="statistics" element={<Statistics />} />
        <Route path="profile" element={<Profile />} />
        <Route path="account-settings" element={<AccountSettings />} />
        
        {/* Super admin only routes */}
        <Route path="companies" element={
          <ProtectedRoute allowedRoles={['SUPER']}>
            <SuperAdmin />
          </ProtectedRoute>
        } />
        
        {/* Admin and Super admin routes */}
        <Route path="sub-admins" element={
          <ProtectedRoute allowedRoles={['SUPER', 'ADMIN']}>
            <SubAdminManager />
          </ProtectedRoute>
        } />
      </Route>

      {/* Not found route */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

export default App; 