import { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import {
  LayoutDashboard,
  Target,
  BarChart3,
  Building2,
  Users,
  LogOut,
  Menu,
  X,
  ChevronDown,
} from 'lucide-react';

const Layout = () => {
  const { user, logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const navigate = useNavigate();

  const closeSidebar = () => {
    setSidebarOpen(false);
  };

  // Navigation items with role-based access control
  const navItems = [
    {
      name: 'Dashboard',
      path: '/dashboard',
      icon: <LayoutDashboard className="h-5 w-5" />,
      allowed: ['SUPER', 'ADMIN', 'SUB'],
    },
    {
      name: 'Wheels',
      path: '/wheels',
      icon: <Target className="h-5 w-5" />,
      allowed: ['SUPER', 'ADMIN', 'SUB'],
    },
    {
      name: 'Statistics',
      path: '/statistics',
      icon: <BarChart3 className="h-5 w-5" />,
      allowed: ['SUPER', 'ADMIN', 'SUB'],
    },
    {
      name: 'Companies',
      path: '/companies',
      icon: <Building2 className="h-5 w-5" />,
      allowed: ['SUPER'],
    },
    {
      name: 'Sub-Admins',
      path: '/sub-admins',
      icon: <Users className="h-5 w-5" />,
      allowed: ['SUPER', 'ADMIN'],
    },
  ];

  const filteredNavItems = navItems.filter(item => 
    item.allowed.includes(user?.role || '')
  );

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 z-20 bg-black bg-opacity-50 lg:hidden"
          onClick={closeSidebar}
        />
      )}

      {/* Sidebar */}
      <aside 
        className={`fixed inset-y-0 left-0 z-30 w-64 transform bg-indigo-900 text-white transition-transform duration-300 lg:relative lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Sidebar header */}
        <div className="flex h-16 items-center justify-between px-4">
          <div className="flex items-center">
            <div className="h-8 w-8 rounded-full bg-violet-500 text-center">
              <span className="text-2xl font-bold leading-8">I</span>
            </div>
            <span className="ml-2 text-xl font-bold">IZI Wheel</span>
          </div>
          <button 
            className="p-1 hover:bg-indigo-800 lg:hidden rounded"
            onClick={closeSidebar}
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* User info */}
        <div className="border-b border-indigo-800 pb-4 pt-2">
          <div className="flex items-center px-4">
            <div className="flex-shrink-0">
              <div className="h-10 w-10 rounded-full bg-indigo-600 flex items-center justify-center">
                <span className="text-lg font-medium">
                  {user?.email?.charAt(0).toUpperCase() || 'U'}
                </span>
              </div>
            </div>
            <div className="ml-3 overflow-hidden">
              <p className="text-sm font-medium text-white truncate">
                {user?.email || 'User'}
              </p>
              <p className="text-xs text-indigo-300 truncate">
                {user?.role || 'Role'}
              </p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="mt-5 h-full overflow-y-auto pb-20">
          <ul className="space-y-2 px-2">
            {filteredNavItems.map((item) => (
              <li key={item.path}>
                <NavLink
                  to={item.path}
                  className={({ isActive }) =>
                    `flex items-center rounded-lg px-4 py-3 text-sm font-medium transition-colors ${
                      isActive
                        ? 'bg-indigo-800 text-white'
                        : 'hover:bg-indigo-800/70 text-indigo-100'
                    }`
                  }
                  onClick={closeSidebar}
                >
                  {item.icon}
                  <span className="ml-3">{item.name}</span>
                </NavLink>
              </li>
            ))}
            <li>
              <button
                onClick={logout}
                className="flex w-full items-center rounded-lg px-4 py-3 text-sm font-medium text-indigo-100 hover:bg-indigo-800/70"
              >
                <LogOut className="h-5 w-5" />
                <span className="ml-3">Logout</span>
              </button>
            </li>
          </ul>
        </nav>
      </aside>

      {/* Main content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Header */}
        <header className="bg-white shadow">
          <div className="px-4 py-3 lg:px-6">
            <div className="flex items-center justify-between">
              <button
                className="p-1 rounded-md hover:bg-gray-100 lg:hidden"
                onClick={() => setSidebarOpen(true)}
              >
                <Menu className="h-6 w-6" />
              </button>
              <div className="flex items-center">
                <div className="relative">
                  <button
                    className="flex items-center text-sm px-3 py-2 rounded-full bg-indigo-50 text-indigo-900 hover:bg-indigo-100"
                  >
                    <span className="mr-1">My Company</span>
                    <ChevronDown className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Main content area */}
        <main className="flex-1 overflow-auto bg-gray-50 p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default Layout; 