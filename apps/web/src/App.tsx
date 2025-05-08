import { Route, Routes, Navigate } from 'react-router-dom';
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

// Protected route wrapper
const ProtectedRoute = ({ children, allowedRoles }: { children: JSX.Element, allowedRoles?: string[] }) => {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return <div className="flex h-screen items-center justify-center">
      <div className="h-32 w-32 animate-spin rounded-full border-b-2 border-t-2 border-indigo-600"></div>
    </div>;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};

function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      
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